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
from app.models.asesmen_form import AsesmenForm
from app.models.rekaman import RekamanAsesmen
from app.models.sertifikat import Banding, BandingStatus, HasilKeputusan, KeputusanSertifikasi
from app.schemas._types import to_iso_utc
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
    hasil: str              # "K" atau "BK"
    catatan: str | None = None
    sk_komite_url: str | None = None
    berita_acara_url: str | None = None

router = APIRouter()

ADMIN_ROLES = ["admin", "superadmin", "pimpinan"]
PIMPINAN_ROLES = ["pimpinan", "superadmin"]   # hanya pimpinan yang bisa buat keputusan
ASESOR_ROLES = ["asesor"]
ASESI_ROLES = ["asesi", "calon_asesi"]


def _enrich(p: Permohonan) -> dict:
    d = PermohonanOut.model_validate(p).model_dump(mode="json")
    # Nama/NIK: prefer dari FormAPL-01 (lebih akurat per-permohonan), fallback ke profile asesi
    apl01_data = p.form_apl01.data_json if p.form_apl01 else None
    apl01_nama = apl01_data.get("nama_lengkap") if isinstance(apl01_data, dict) else None
    apl01_nik = apl01_data.get("nik") if isinstance(apl01_data, dict) else None

    d["asesi_nama"] = apl01_nama or (p.asesi.nama_lengkap if p.asesi else None)
    d["asesi_nik"] = apl01_nik or (p.asesi.nik if p.asesi else None)
    # Dokumen yang diupload asesi (KTP, foto, ijazah) — agar asesor/admin bisa lihat
    d["asesi_foto_url"] = p.asesi.foto_url if p.asesi else None
    d["asesi_ktp_url"] = p.asesi.ktp_url if p.asesi else None
    d["asesi_ijazah_url"] = p.asesi.ijazah_url if p.asesi else None
    d["skema_nama"] = p.skema.nama if p.skema else None
    d["skema_kode"] = p.skema.kode if p.skema else None
    d["asesor_nama"] = p.asesor.nama_lengkap if p.asesor else None
    d["tuk_nama"] = p.tuk.nama if p.tuk else None
    # Tanda tangan digital (e-sign) untuk ditampilkan di blok TTD form
    d["asesi_ttd_url"] = p.asesi.ttd_url if p.asesi else None
    d["asesor_ttd_url"] = p.asesor.ttd_url if p.asesor else None
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
            selectinload(Permohonan.form_apl01),
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
        selectinload(Permohonan.form_apl01),
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
    # Auto-advance ke DIJADWALKAN jika asesor + jadwal sudah diset.
    # TUK opsional untuk asesmen daring/virtual (sesuai SE.007 BNSP 2023).
    if p.asesor_id and p.tanggal_asesmen and p.status == PermohonanStatus.DOKUMEN_DIKAJI:
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

    # Sync identitas APL-01 ke profile Asesi (agar konsisten lintas modul).
    # APL-01 = formulir resmi permohonan sertifikasi → sumber kebenaran identitas.
    data = payload.data_json or {}
    if p.asesi and isinstance(data, dict):
        for field_apl, field_profile in [
            ("nama_lengkap", "nama_lengkap"),
            ("nik", "nik"),
            ("alamat", "alamat"),
            ("telepon", "telepon"),
            ("pendidikan", "pendidikan"),
            ("pekerjaan", "pekerjaan"),
        ]:
            val = data.get(field_apl)
            if val:
                setattr(p.asesi, field_profile, val)

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
    out = APL01Out.model_validate(form).model_dump(mode="json")

    # Overlay identitas dari profil "Data Diri" (sumber kebenaran) — agar APL-01
    # selalu mencerminkan data terbaru, walau disimpan sebelum Data Diri lengkap.
    perm_res = await db.execute(
        select(Permohonan).where(Permohonan.id == permohonan_id).options(selectinload(Permohonan.asesi))
    )
    perm = perm_res.scalar_one_or_none()
    asesi = perm.asesi if perm else None
    if asesi:
        prof = dict(asesi.profil_json or {})
        for k in ("nama_lengkap", "nik", "alamat", "telepon", "pendidikan", "pekerjaan"):
            val = getattr(asesi, k, None)
            if val:
                prof[k] = val
        if asesi.ijazah_url:
            prof["ijazah_url"] = asesi.ijazah_url
        if asesi.sertifikat_pelatihan_url:
            prof["sertifikat_pelatihan_url"] = asesi.sertifikat_pelatihan_url
        u_res = await db.execute(select(User).where(User.id == asesi.user_id))
        u = u_res.scalar_one_or_none()
        if u:
            prof["email"] = u.email
        dj = dict(out.get("data_json") or {})
        for k, v in prof.items():
            if v not in (None, ""):
                dj[k] = v
        out["data_json"] = dj
    return {"success": True, "data": out}


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
        sk_komite_url=payload.sk_komite_url,
        berita_acara_url=payload.berita_acara_url,
        diputuskan_oleh=current_user.id,
    )
    db.add(keputusan)

    # Hasil K → KEPUTUSAN_DIBUAT (lolos, MENUNGGU penerbitan sertifikat manual).
    # Sertifikat baru dibuat lewat endpoint /terbitkan-sertifikat oleh Pimpinan.
    p.status = PermohonanStatus.KEPUTUSAN_DIBUAT

    await db.commit()
    p = await _load_permohonan(db, permohonan_id)
    return {
        "success": True,
        "data": {
            "permohonan": _enrich(p),
            "hasil": hasil.value,
            "sertifikat": None,
        },
    }


# ── PIMPINAN: terbitkan e-Sertifikat (PDF) setelah lolos KOMPETEN ─────
@router.post("/{permohonan_id}/terbitkan-sertifikat")
async def terbitkan_sertifikat(
    permohonan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(PIMPINAN_ROLES)),
):
    from app.services.sertifikat_pdf import assemble_sertifikat_data, build_sertifikat_pdf, MEDIA_DIR

    p = await _load_permohonan(db, permohonan_id)

    # Harus sudah ada keputusan KOMPETEN
    res = await db.execute(
        select(KeputusanSertifikasi).where(KeputusanSertifikasi.permohonan_id == permohonan_id)
    )
    keputusan = res.scalar_one_or_none()
    if not keputusan or keputusan.hasil != HasilKeputusan.K:
        raise HTTPException(status_code=400, detail="Sertifikat hanya bisa diterbitkan untuk hasil KOMPETEN")

    # Idempoten — kembalikan yang sudah ada
    res = await db.execute(select(Sertifikat).where(Sertifikat.permohonan_id == permohonan_id))
    sert = res.scalar_one_or_none()
    if sert and sert.file_url:
        return {"success": True, "data": {"nomor_sertifikat": sert.nomor_sertifikat, "file_url": sert.file_url, "sudah_ada": True}}

    if not sert:
        nomor = "CERT-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=10))
        hari_ini = date.today()
        sert = Sertifikat(
            asesi_id=p.asesi_id,
            skema_id=p.skema_id,
            permohonan_id=p.id,
            nomor_sertifikat=nomor,
            tanggal_terbit=hari_ini,
            tanggal_berakhir=hari_ini + timedelta(days=3 * 365),
            file_url="",
            is_active=True,
        )
        db.add(sert)

    # Bangun PDF & simpan ke media
    data = await assemble_sertifikat_data(db, p, sert)
    pdf_bytes = build_sertifikat_pdf(data)
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    fname = f"sertifikat-{sert.nomor_sertifikat}.pdf"
    (MEDIA_DIR / fname).write_bytes(pdf_bytes)
    sert.file_url = f"/media/{fname}"

    p.status = PermohonanStatus.SERTIFIKAT_DITERBITKAN
    await db.commit()
    await db.refresh(sert)
    return {"success": True, "data": {"nomor_sertifikat": sert.nomor_sertifikat, "file_url": sert.file_url, "sudah_ada": False}}


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
            "diputuskan_at": to_iso_utc(k.diputuskan_at),
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


# ── ASESOR: mulai asesmen (ubah status → ASESMEN_BERLANGSUNG) ─────────
@router.post("/{permohonan_id}/mulai-asesmen")
async def mulai_asesmen(
    permohonan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ASESOR_ROLES + ADMIN_ROLES)),
):
    p = await _load_permohonan(db, permohonan_id)
    if p.status not in (PermohonanStatus.DIJADWALKAN, PermohonanStatus.ASESMEN_BERLANGSUNG):
        raise HTTPException(status_code=400, detail="Permohonan belum dijadwalkan")
    p.status = PermohonanStatus.ASESMEN_BERLANGSUNG
    await db.commit()
    p = await _load_permohonan(db, permohonan_id)
    return {"success": True, "data": _enrich(p)}


# ── ASESOR: rekaman asesmen (rekomendasi K/BK) ─────────────────────────
class RekamanCreate(BaseModel):
    rekomendasi: str            # "K" atau "BK"
    catatan_akhir: str | None = None
    fr_ak02_json: dict | None = None   # Ceklis observasi/wawancara
    fr_ak05_json: dict | None = None   # Ceklis portofolio


@router.post("/{permohonan_id}/rekaman")
async def submit_rekaman(
    permohonan_id: UUID,
    payload: RekamanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ASESOR_ROLES + ADMIN_ROLES)),
):
    if payload.rekomendasi not in ("K", "BK"):
        raise HTTPException(status_code=400, detail="Rekomendasi harus 'K' atau 'BK'")

    asesor_result = await db.execute(select(Asesor).where(Asesor.user_id == current_user.id))
    asesor = asesor_result.scalar_one_or_none()
    if not asesor and current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Profil asesor tidak ditemukan")

    existing = await db.execute(
        select(RekamanAsesmen).where(RekamanAsesmen.permohonan_id == permohonan_id)
    )
    rekaman = existing.scalar_one_or_none()

    if rekaman:
        rekaman.rekomendasi = payload.rekomendasi
        rekaman.catatan_akhir = payload.catatan_akhir
        if payload.fr_ak02_json:
            rekaman.fr_ak02_json = payload.fr_ak02_json
        if payload.fr_ak05_json:
            rekaman.fr_ak05_json = payload.fr_ak05_json
        rekaman.updated_at = datetime.now(timezone.utc)
    else:
        rekaman = RekamanAsesmen(
            permohonan_id=permohonan_id,
            asesor_id=asesor.id if asesor else None,
            rekomendasi=payload.rekomendasi,
            catatan_akhir=payload.catatan_akhir,
            fr_ak02_json=payload.fr_ak02_json,
            fr_ak05_json=payload.fr_ak05_json,
        )
        db.add(rekaman)

    # Auto-advance status ke KEPUTUSAN_DIBUAT jika belum
    p = await _load_permohonan(db, permohonan_id)
    if p.status == PermohonanStatus.ASESMEN_BERLANGSUNG:
        p.status = PermohonanStatus.KEPUTUSAN_DIBUAT

    await db.commit()
    await db.refresh(rekaman)
    return {
        "success": True,
        "data": {
            "id": str(rekaman.id),
            "permohonan_id": str(rekaman.permohonan_id),
            "rekomendasi": rekaman.rekomendasi,
            "catatan_akhir": rekaman.catatan_akhir,
            "submitted_at": to_iso_utc(rekaman.submitted_at),
        },
    }


@router.get("/{permohonan_id}/rekaman")
async def get_rekaman(
    permohonan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RekamanAsesmen).where(RekamanAsesmen.permohonan_id == permohonan_id)
    )
    rekaman = result.scalar_one_or_none()
    if not rekaman:
        raise HTTPException(status_code=404, detail="Rekaman asesmen belum diisi")
    return {
        "success": True,
        "data": {
            "id": str(rekaman.id),
            "permohonan_id": str(rekaman.permohonan_id),
            "rekomendasi": rekaman.rekomendasi,
            "catatan_akhir": rekaman.catatan_akhir,
            "fr_ak02_json": rekaman.fr_ak02_json,
            "fr_ak05_json": rekaman.fr_ak05_json,
            "submitted_at": to_iso_utc(rekaman.submitted_at),
            "updated_at": to_iso_utc(rekaman.updated_at),
        },
    }


# ── ASESI: banding (FR.AK.04) ─────────────────────────────────────────
class BandingCreate(BaseModel):
    alasan: str
    bukti_url: str | None = None
    kuesioner: dict | None = None   # {q1,q2,q3, nama_asesor, tanggal_asesmen}


@router.post("/{permohonan_id}/banding")
async def submit_banding(
    permohonan_id: UUID,
    payload: BandingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ASESI_ROLES + ADMIN_ROLES)),
):
    p = await _load_permohonan(db, permohonan_id)

    # hanya bisa banding jika hasil BK (KEPUTUSAN_DIBUAT dan sertifikat tidak ada)
    if p.status not in (PermohonanStatus.KEPUTUSAN_DIBUAT, PermohonanStatus.BANDING):
        raise HTTPException(status_code=400, detail="Banding hanya bisa diajukan setelah keputusan BK")

    # cek apakah sudah ada banding
    existing = await db.execute(select(Banding).where(Banding.permohonan_id == permohonan_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Banding sudah diajukan sebelumnya")

    banding = Banding(
        permohonan_id=permohonan_id,
        alasan=payload.alasan,
        bukti_url=payload.bukti_url,
        kuesioner_json=payload.kuesioner,
        status=BandingStatus.PENDING,
    )
    db.add(banding)
    p.status = PermohonanStatus.BANDING
    await db.commit()
    await db.refresh(banding)
    return {
        "success": True,
        "data": {
            "id": str(banding.id),
            "alasan": banding.alasan,
            "status": banding.status.value,
            "diajukan_at": to_iso_utc(banding.diajukan_at),
        },
    }


@router.get("/{permohonan_id}/banding")
async def get_banding(
    permohonan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Banding).where(Banding.permohonan_id == permohonan_id))
    banding = result.scalar_one_or_none()
    if not banding:
        raise HTTPException(status_code=404, detail="Belum ada banding")
    return {
        "success": True,
        "data": {
            "id": str(banding.id),
            "alasan": banding.alasan,
            "bukti_url": banding.bukti_url,
            "kuesioner": banding.kuesioner_json,
            "status": banding.status.value,
            "keputusan_banding": banding.keputusan_banding,
            "diajukan_at": to_iso_utc(banding.diajukan_at),
            "diselesaikan_at": to_iso_utc(banding.diselesaikan_at),
        },
    }


# ── PIMPINAN: proses banding ──────────────────────────────────────────
class BandingKeputusan(BaseModel):
    diterima: bool
    keputusan_banding: str


@router.patch("/{permohonan_id}/banding/keputusan")
async def putus_banding(
    permohonan_id: UUID,
    payload: BandingKeputusan,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(PIMPINAN_ROLES)),
):
    result = await db.execute(select(Banding).where(Banding.permohonan_id == permohonan_id))
    banding = result.scalar_one_or_none()
    if not banding:
        raise HTTPException(status_code=404, detail="Belum ada banding")
    banding.status = BandingStatus.DITERIMA if payload.diterima else BandingStatus.DITOLAK
    banding.keputusan_banding = payload.keputusan_banding
    banding.diputuskan_oleh = current_user.id
    banding.diselesaikan_at = datetime.now(timezone.utc)

    p = await _load_permohonan(db, permohonan_id)
    if payload.diterima:
        # Banding diterima → perlu asesmen ulang
        p.status = PermohonanStatus.DIJADWALKAN
    else:
        p.status = PermohonanStatus.SELESAI

    await db.commit()
    p = await _load_permohonan(db, permohonan_id)
    return {"success": True, "data": {"banding_status": banding.status.value, "permohonan_status": p.status.value}}


# ── GET sertifikat untuk permohonan ──────────────────────────────────
@router.get("/{permohonan_id}/sertifikat")
async def get_sertifikat_permohonan(
    permohonan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Sertifikat).where(Sertifikat.permohonan_id == permohonan_id)
    )
    sert = result.scalar_one_or_none()
    if not sert:
        raise HTTPException(status_code=404, detail="Sertifikat belum diterbitkan")
    # Load skema dan asesi
    p_result = await db.execute(
        select(Permohonan)
        .where(Permohonan.id == permohonan_id)
        .options(selectinload(Permohonan.asesi), selectinload(Permohonan.skema))
    )
    p = p_result.scalar_one_or_none()
    return {
        "success": True,
        "data": {
            "id": str(sert.id),
            "nomor_sertifikat": sert.nomor_sertifikat,
            "tanggal_terbit": sert.tanggal_terbit.isoformat(),
            "tanggal_berakhir": sert.tanggal_berakhir.isoformat(),
            "is_active": sert.is_active,
            "file_url": sert.file_url or None,
            "nama_asesi": p.asesi.nama_lengkap if p and p.asesi else None,
            "nama_skema": p.skema.nama if p and p.skema else None,
            "kode_skema": p.skema.kode if p and p.skema else None,
        },
    }


# ── PIMPINAN: upload dokumen keputusan (SK Komite, Berita Acara) ──────
class KeputusanDokumenUpdate(BaseModel):
    sk_komite_url: str | None = None
    berita_acara_url: str | None = None


@router.patch("/{permohonan_id}/keputusan/dokumen")
async def update_keputusan_dokumen(
    permohonan_id: UUID,
    payload: KeputusanDokumenUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(PIMPINAN_ROLES)),
):
    result = await db.execute(
        select(KeputusanSertifikasi).where(KeputusanSertifikasi.permohonan_id == permohonan_id)
    )
    k = result.scalar_one_or_none()
    if not k:
        raise HTTPException(status_code=404, detail="Keputusan belum dibuat")
    if payload.sk_komite_url is not None:
        k.sk_komite_url = payload.sk_komite_url
    if payload.berita_acara_url is not None:
        k.berita_acara_url = payload.berita_acara_url
    await db.commit()
    return {"success": True, "data": {"sk_komite_url": k.sk_komite_url, "berita_acara_url": k.berita_acara_url}}


# ══════════════════════════════════════════════════════════════════════
# FORM PROSES ASESMEN (Generic JSON Store)
# Semua form BNSP tahap asesmen (FR.AK.xx, FR.IA.xx) disimpan di sini.
# ══════════════════════════════════════════════════════════════════════

# Registry form: kode → {label, diisi_oleh}. Urutan = urutan proses asesmen
# (mulai dari APL-02). Dict Python menjaga urutan insertion.
# diisi_oleh: "asesor" | "asesi". Asesi hanya melihat form miliknya (asesor-only disembunyikan).
FORM_REGISTRY = {
    "FR.MAPA.01": {"label": "Merencanakan Aktivitas & Proses Asesmen", "diisi_oleh": "asesor", "fase": 1},
    "FR.MAPA.02": {"label": "Peta Instrumen Asesmen", "diisi_oleh": "asesor", "fase": 1},
    # Persetujuan asesmen (FR.AK.01) didahulukan sebelum form uji tulis (feedback Meeting 4)
    "FR.AK.01": {"label": "Persetujuan Asesmen & Kerahasiaan", "diisi_oleh": "asesor", "fase": 1},
    "FR.AK.07": {"label": "Ceklis Penyesuaian yang Wajar & Beralasan", "diisi_oleh": "asesor", "fase": 1},
    "FR.IA.04A": {"label": "DIT — Penjelasan Singkat Proyek", "diisi_oleh": "asesor", "fase": 1},
    "FR.IA.04B": {"label": "Penilaian Proyek Singkat", "diisi_oleh": "asesor", "fase": 1},
    "FR.IA.06": {"label": "Pertanyaan Tertulis (Essay/Pilihan Ganda)", "diisi_oleh": "asesor", "fase": 1},
    "FR.AK.02": {"label": "Rekaman Asesmen Kompetensi", "diisi_oleh": "asesor", "fase": 1},
    # Form Banding di antara Rekaman & Umpan Balik (feedback Meeting 4)
    "FR.BANDING": {"label": "Banding Asesmen", "diisi_oleh": "asesi", "fase": 1},
    "FR.AK.03": {"label": "Umpan Balik & Catatan Asesmen", "diisi_oleh": "asesi", "fase": 1},
    "FR.AK.05": {"label": "Laporan Asesmen", "diisi_oleh": "asesor", "fase": 1},
    "FR.AK.06": {"label": "Meninjau Proses Asesmen", "diisi_oleh": "asesor", "fase": 1},
    "FR.VA": {"label": "Kontribusi dalam Validasi Asesmen", "diisi_oleh": "asesor", "fase": 1},
}


class AsesmenFormPayload(BaseModel):
    data_json: dict


@router.get("/{permohonan_id}/forms")
async def list_asesmen_forms(
    permohonan_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Daftar semua form proses asesmen beserta status terisi/belum."""
    result = await db.execute(
        select(AsesmenForm).where(AsesmenForm.permohonan_id == permohonan_id)
    )
    existing = {f.kode_form: f for f in result.scalars().all()}
    data = []
    for kode, meta in FORM_REGISTRY.items():
        f = existing.get(kode)
        data.append({
            "kode_form": kode,
            "label": meta["label"],
            "diisi_oleh": meta["diisi_oleh"],
            "fase": meta["fase"],
            "terisi": f is not None,
            "updated_at": to_iso_utc(f.updated_at) if f else None,
        })
    return {"success": True, "data": data}


@router.get("/{permohonan_id}/form/{kode_form}")
async def get_asesmen_form(
    permohonan_id: UUID,
    kode_form: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ambil data 1 form. Kembalikan data_json kosong jika belum diisi."""
    if kode_form not in FORM_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Form {kode_form} tidak dikenal")
    result = await db.execute(
        select(AsesmenForm).where(
            AsesmenForm.permohonan_id == permohonan_id,
            AsesmenForm.kode_form == kode_form,
        )
    )
    f = result.scalar_one_or_none()
    return {
        "success": True,
        "data": {
            "kode_form": kode_form,
            "label": FORM_REGISTRY[kode_form]["label"],
            "diisi_oleh": FORM_REGISTRY[kode_form]["diisi_oleh"],
            "data_json": f.data_json if f else None,
            "submitted_at": to_iso_utc(f.submitted_at) if f else None,
            "updated_at": to_iso_utc(f.updated_at) if f else None,
        },
    }


@router.post("/{permohonan_id}/form/{kode_form}")
async def upsert_asesmen_form(
    permohonan_id: UUID,
    kode_form: str,
    payload: AsesmenFormPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Simpan/update data form (upsert per permohonan+kode_form)."""
    if kode_form not in FORM_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Form {kode_form} tidak dikenal")

    # Pastikan permohonan ada
    await _load_permohonan(db, permohonan_id)

    result = await db.execute(
        select(AsesmenForm).where(
            AsesmenForm.permohonan_id == permohonan_id,
            AsesmenForm.kode_form == kode_form,
        )
    )
    f = result.scalar_one_or_none()
    if f:
        # Shallow-merge agar form kolaboratif (asesi + asesor isi field berbeda)
        # tidak saling menimpa: field yang dikirim menimpa, field lain dipertahankan.
        existing = f.data_json if isinstance(f.data_json, dict) else {}
        incoming = payload.data_json if isinstance(payload.data_json, dict) else {}
        f.data_json = {**existing, **incoming}
        # Pertahankan pengisi pertama (owner kanonik); jangan overwrite tiap simpan.
        if not f.diisi_oleh:
            f.diisi_oleh = current_user.role
        f.updated_at = datetime.now(timezone.utc)
    else:
        f = AsesmenForm(
            permohonan_id=permohonan_id,
            kode_form=kode_form,
            data_json=payload.data_json,
            diisi_oleh=current_user.role,
        )
        db.add(f)
    await db.commit()
    await db.refresh(f)
    return {
        "success": True,
        "data": {
            "kode_form": kode_form,
            "data_json": f.data_json,
            "updated_at": to_iso_utc(f.updated_at),
        },
    }
