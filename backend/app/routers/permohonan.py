import random
import string
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.rbac import get_current_user, require_role
from app.models import Sertifikat, User
from app.models.asesmen import FormAPL01, FormAPL02
from app.models.asesi import Asesi
from app.models.asesor import Asesor
from app.models.permohonan import Permohonan, PermohonanStatus
from app.models.sertifikat import HasilKeputusan, KeputusanSertifikasi
from app.schemas.permohonan import (
    APL01Out,
    APL01Submit,
    APL02Out,
    APL02Submit,
    APL02Verify,
    PermohonanAssign,
    PermohonanCreate,
    PermohonanOut,
    PermohonanStatusUpdate,
)


class KeputusanCreate(BaseModel):
    hasil: str  # "K" atau "BK"
    catatan: str | None = None

router = APIRouter()

ADMIN_ROLES = ["admin", "superadmin", "pimpinan"]
PIMPINAN_ROLES = ["pimpinan", "superadmin"]   # hanya pimpinan yang bisa buat keputusan
ASESOR_ROLES = ["asesor"]
ASESI_ROLES = ["asesi", "calon_asesi"]


def _enrich(p: Permohonan) -> dict:
    d = PermohonanOut.model_validate(p).model_dump(mode="json")
    d["asesi_nama"] = p.asesi.nama_lengkap if p.asesi else None
    d["asesi_nik"] = p.asesi.nik if p.asesi else None
    d["skema_nama"] = p.skema.nama if p.skema else None
    d["skema_kode"] = p.skema.kode if p.skema else None
    d["asesor_nama"] = p.asesor.nama_lengkap if p.asesor else None
    d["tuk_nama"] = p.tuk.nama if p.tuk else None
    return d


async def _load_permohonan(db: AsyncSession, permohonan_id: UUID) -> Permohonan:
    stmt = (
        select(Permohonan)
        .where(Permohonan.id == permohonan_id)
        .options(
            selectinload(Permohonan.asesi),
            selectinload(Permohonan.skema),
            selectinload(Permohonan.asesor),
            selectinload(Permohonan.tuk),
        )
    )
    result = await db.execute(stmt)
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Permohonan tidak ditemukan")
    return p


# ── ASESI: submit permohonan ──────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_permohonan(
    payload: PermohonanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ASESI_ROLES + ADMIN_ROLES)),
):
    # resolve asesi profile
    asesi_result = await db.execute(select(Asesi).where(Asesi.user_id == current_user.id))
    asesi = asesi_result.scalar_one_or_none()
    if not asesi:
        raise HTTPException(status_code=400, detail="Profil asesi belum dibuat. Lengkapi profil terlebih dahulu.")

    p = Permohonan(
        asesi_id=asesi.id,
        skema_id=payload.skema_id,
        jenis=payload.jenis,
        status=PermohonanStatus.SUBMITTED,
        tanggal_submit=datetime.now(timezone.utc),
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    p = await _load_permohonan(db, p.id)
    return {"success": True, "data": _enrich(p)}


# ── LIST permohonan ───────────────────────────────────────────────────
@router.get("")
async def list_permohonan(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Permohonan).options(
        selectinload(Permohonan.asesi),
        selectinload(Permohonan.skema),
        selectinload(Permohonan.asesor),
        selectinload(Permohonan.tuk),
    )

    if current_user.role in ASESI_ROLES:
        # asesi sees only their own
        asesi_result = await db.execute(select(Asesi).where(Asesi.user_id == current_user.id))
        asesi = asesi_result.scalar_one_or_none()
        if not asesi:
            return {"success": True, "data": []}
        stmt = stmt.where(Permohonan.asesi_id == asesi.id)
    elif current_user.role in ASESOR_ROLES:
        # asesor sees only assigned to them
        asesor_result = await db.execute(select(Asesor).where(Asesor.user_id == current_user.id))
        asesor = asesor_result.scalar_one_or_none()
        if not asesor:
            return {"success": True, "data": []}
        stmt = stmt.where(Permohonan.asesor_id == asesor.id)
    # admin / pimpinan / superadmin sees all

    stmt = stmt.order_by(Permohonan.created_at.desc())
    result = await db.execute(stmt)
    items = result.scalars().all()
    return {"success": True, "data": [_enrich(p) for p in items]}


# ── GET single ───────────────────────────────────────────────────────
@router.get("/{permohonan_id}")
async def get_permohonan(
    permohonan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = await _load_permohonan(db, permohonan_id)
    return {"success": True, "data": _enrich(p)}


# ── ADMIN: update status ──────────────────────────────────────────────
@router.patch("/{permohonan_id}/status")
async def update_status(
    permohonan_id: UUID,
    payload: PermohonanStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ADMIN_ROLES)),
):
    p = await _load_permohonan(db, permohonan_id)
    try:
        p.status = PermohonanStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Status tidak valid: {payload.status}")
    if payload.catatan_admin is not None:
        p.catatan_admin = payload.catatan_admin
    await db.commit()
    await db.refresh(p)
    p = await _load_permohonan(db, p.id)
    return {"success": True, "data": _enrich(p)}


# ── ADMIN: validasi dokumen syarat ───────────────────────────────────
class ValidasiDokumenPayload(BaseModel):
    disetujui: bool
    catatan: str | None = None


@router.post("/{permohonan_id}/validasi-dokumen")
async def validasi_dokumen(
    permohonan_id: UUID,
    payload: ValidasiDokumenPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "superadmin"])),
):
    p = await _load_permohonan(db, permohonan_id)
    if payload.disetujui:
        p.status = PermohonanStatus.DOKUMEN_DIKAJI
    else:
        p.status = PermohonanStatus.DITOLAK
    if payload.catatan is not None:
        p.catatan_admin = payload.catatan
    await db.commit()
    p = await _load_permohonan(db, permohonan_id)
    return {"success": True, "data": _enrich(p)}


# ── ADMIN: assign asesor / TUK / jadwal ──────────────────────────────
@router.patch("/{permohonan_id}/assign")
async def assign_permohonan(
    permohonan_id: UUID,
    payload: PermohonanAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ADMIN_ROLES)),
):
    p = await _load_permohonan(db, permohonan_id)
    if payload.asesor_id is not None:
        p.asesor_id = payload.asesor_id
    if payload.tuk_id is not None:
        p.tuk_id = payload.tuk_id
    if payload.tanggal_asesmen is not None:
        p.tanggal_asesmen = payload.tanggal_asesmen
    if payload.link_video_conference is not None:
        p.link_video_conference = payload.link_video_conference
    # auto advance status to DIJADWALKAN if all assigned
    if p.asesor_id and p.tuk_id and p.tanggal_asesmen and p.status == PermohonanStatus.DOKUMEN_DIKAJI:
        p.status = PermohonanStatus.DIJADWALKAN
    await db.commit()
    p = await _load_permohonan(db, p.id)
    return {"success": True, "data": _enrich(p)}


# ── APL01 ─────────────────────────────────────────────────────────────
@router.post("/{permohonan_id}/apl01")
async def submit_apl01(
    permohonan_id: UUID,
    payload: APL01Submit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = await _load_permohonan(db, permohonan_id)

    existing = await db.execute(
        select(FormAPL01).where(FormAPL01.permohonan_id == permohonan_id)
    )
    form = existing.scalar_one_or_none()
    if form:
        form.data_json = payload.data_json
    else:
        form = FormAPL01(permohonan_id=permohonan_id, data_json=payload.data_json)
        db.add(form)

    await db.commit()
    await db.refresh(form)
    return {"success": True, "data": APL01Out.model_validate(form).model_dump(mode="json")}


@router.get("/{permohonan_id}/apl01")
async def get_apl01(
    permohonan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(FormAPL01).where(FormAPL01.permohonan_id == permohonan_id)
    )
    form = result.scalar_one_or_none()
    if not form:
        raise HTTPException(status_code=404, detail="APL01 belum diisi")
    return {"success": True, "data": APL01Out.model_validate(form).model_dump(mode="json")}


# ── APL02 ─────────────────────────────────────────────────────────────
@router.post("/{permohonan_id}/apl02")
async def submit_apl02(
    permohonan_id: UUID,
    payload: APL02Submit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(
        select(FormAPL02).where(FormAPL02.permohonan_id == permohonan_id)
    )
    form = existing.scalar_one_or_none()
    if form:
        form.hasil_mandiri_json = payload.hasil_mandiri_json
        if payload.unit_kompetensi_json:
            form.unit_kompetensi_json = payload.unit_kompetensi_json
    else:
        form = FormAPL02(
            permohonan_id=permohonan_id,
            hasil_mandiri_json=payload.hasil_mandiri_json,
            unit_kompetensi_json=payload.unit_kompetensi_json,
        )
        db.add(form)
    await db.commit()
    await db.refresh(form)
    return {"success": True, "data": APL02Out.model_validate(form).model_dump(mode="json")}


@router.get("/{permohonan_id}/apl02")
async def get_apl02(
    permohonan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(FormAPL02).where(FormAPL02.permohonan_id == permohonan_id)
    )
    form = result.scalar_one_or_none()
    if not form:
        raise HTTPException(status_code=404, detail="APL02 belum diisi")
    return {"success": True, "data": APL02Out.model_validate(form).model_dump(mode="json")}


# ── ADMIN: keputusan sertifikasi ─────────────────────────────────────
@router.post("/{permohonan_id}/keputusan")
async def buat_keputusan(
    permohonan_id: UUID,
    payload: KeputusanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(PIMPINAN_ROLES)),
):
    p = await _load_permohonan(db, permohonan_id)

    # cek apakah sudah ada keputusan
    existing = await db.execute(
        select(KeputusanSertifikasi).where(KeputusanSertifikasi.permohonan_id == permohonan_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Keputusan sudah dibuat sebelumnya")

    try:
        hasil = HasilKeputusan(payload.hasil)
    except ValueError:
        raise HTTPException(status_code=400, detail="Hasil harus 'K' atau 'BK'")

    keputusan = KeputusanSertifikasi(
        permohonan_id=permohonan_id,
        hasil=hasil,
        catatan=payload.catatan,
        diputuskan_oleh=current_user.id,
    )
    db.add(keputusan)

    p.status = PermohonanStatus.KEPUTUSAN_DIBUAT

    # Jika Kompeten → buat sertifikat otomatis
    sertifikat_data = None
    if hasil == HasilKeputusan.K:
        nomor = "CERT-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=10))
        hari_ini = date.today()
        sertifikat = Sertifikat(
            asesi_id=p.asesi_id,
            skema_id=p.skema_id,
            permohonan_id=p.id,
            nomor_sertifikat=nomor,
            tanggal_terbit=hari_ini,
            tanggal_berakhir=hari_ini + timedelta(days=3 * 365),
            file_url="",
            is_active=True,
        )
        db.add(sertifikat)
        p.status = PermohonanStatus.SERTIFIKAT_DITERBITKAN
        sertifikat_data = {"nomor_sertifikat": nomor}

    await db.commit()
    p = await _load_permohonan(db, permohonan_id)
    return {
        "success": True,
        "data": {
            "permohonan": _enrich(p),
            "hasil": hasil.value,
            "sertifikat": sertifikat_data,
        },
    }


@router.get("/{permohonan_id}/keputusan")
async def get_keputusan(
    permohonan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KeputusanSertifikasi).where(KeputusanSertifikasi.permohonan_id == permohonan_id)
    )
    k = result.scalar_one_or_none()
    if not k:
        raise HTTPException(status_code=404, detail="Keputusan belum dibuat")

    # cari sertifikat terkait
    sert_result = await db.execute(
        select(Sertifikat).where(Sertifikat.permohonan_id == permohonan_id)
    )
    sert = sert_result.scalar_one_or_none()

    return {
        "success": True,
        "data": {
            "hasil": k.hasil.value,
            "catatan": k.catatan,
            "diputuskan_at": k.diputuskan_at.isoformat() if k.diputuskan_at else None,
            "sertifikat": {
                "nomor_sertifikat": sert.nomor_sertifikat,
                "tanggal_terbit": sert.tanggal_terbit.isoformat(),
                "tanggal_berakhir": sert.tanggal_berakhir.isoformat(),
                "is_active": sert.is_active,
            } if sert else None,
        },
    }


@router.patch("/{permohonan_id}/apl02/verifikasi")
async def verify_apl02(
    permohonan_id: UUID,
    payload: APL02Verify,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ASESOR_ROLES + ADMIN_ROLES)),
):
    result = await db.execute(
        select(FormAPL02).where(FormAPL02.permohonan_id == permohonan_id)
    )
    form = result.scalar_one_or_none()
    if not form:
        raise HTTPException(status_code=404, detail="APL02 belum diisi oleh asesi")

    asesor_result = await db.execute(select(Asesor).where(Asesor.user_id == current_user.id))
    asesor = asesor_result.scalar_one_or_none()
    if asesor:
        form.verified_by_asesor_id = asesor.id
    form.verified_at = datetime.now(timezone.utc)
    if payload.catatan_asesor is not None:
        form.catatan_asesor = payload.catatan_asesor
    await db.commit()
    await db.refresh(form)
    return {"success": True, "data": APL02Out.model_validate(form).model_dump(mode="json")}
