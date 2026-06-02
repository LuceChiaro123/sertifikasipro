"""Pengelolaan Uji Kompetensi (event/kelompok) + dokumen dengan alur Input → Validasi.

Registry form per menu menentukan siapa yang Input dan siapa yang Validasi.
Role: admin/superadmin, asesor, pimpinan (ketua).
"""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.rbac import get_current_user, require_role
from app.models import User
from app.models.uji import UjiForm, UjiKompetensi
from app.schemas._types import to_iso_utc

router = APIRouter()

ADMIN = ["admin", "superadmin"]
KETUA = ["pimpinan", "superadmin"]
ASESOR = ["asesor"]
SEMUA = ["admin", "superadmin", "asesor", "pimpinan"]

# Registry form per menu: kode → {label, menu, input (role), validasi (role)}
# menu: "uji" | "pleno" | "sertifikat"
FORM_REGISTRY = {
    # Menu Pengelolaan Uji Kompetensi
    "SPT": {"label": "SPT Uji Kompetensi (Surat Tugas Asesor)", "menu": "uji", "input": "admin", "validasi": "pimpinan"},
    "BERITA_ACARA": {"label": "Berita Acara Asesmen", "menu": "uji", "input": "asesor", "validasi": "pimpinan"},
    "LAPORAN_AK05": {"label": "Laporan Asesmen (FR.AK.05)", "menu": "uji", "input": "asesor", "validasi": "pimpinan"},
    # Menu Pengelolaan Pleno (Fase 2)
    "SPT_PLENO": {"label": "SPT Pleno (Surat Tugas Tim Pleno)", "menu": "pleno", "input": "admin", "validasi": "pimpinan"},
    "NOTULEN": {"label": "Notulen Rapat Pleno", "menu": "pleno", "input": "asesor", "validasi": "pimpinan"},
    "BERITA_ACARA_PLENO": {"label": "Berita Acara Pleno Komite Teknis", "menu": "pleno", "input": "asesor", "validasi": "pimpinan"},
    "SK_SERTIFIKAT": {"label": "SK Penerbitan Sertifikat", "menu": "pleno", "input": "asesor", "validasi": "pimpinan"},
    # Menu Cetak Sertifikat (Fase 3)
    "PERMOHONAN_BLANKO": {"label": "Permohonan Blanko Sertifikat (BNSP)", "menu": "sertifikat", "input": "admin", "validasi": "pimpinan"},
    "SERTIFIKAT": {"label": "Sertifikat Kompetensi", "menu": "sertifikat", "input": "admin", "validasi": "pimpinan"},
}


def _role_match(user_role: str, needed: str) -> bool:
    """superadmin selalu cocok; selain itu cocok jika role sama. 'pimpinan' = ketua."""
    if user_role == "superadmin":
        return True
    return user_role == needed


async def _user_ttd_url(db: AsyncSession, user_id) -> str | None:
    """TTD profil (asesi/asesor) milik user — dipakai sebagai e-sign validator."""
    from app.models.asesi import Asesi
    from app.models.asesor import Asesor
    res = await db.execute(select(Asesor.ttd_url).where(Asesor.user_id == user_id))
    ttd = res.scalar_one_or_none()
    if ttd:
        return ttd
    res = await db.execute(select(Asesi.ttd_url).where(Asesi.user_id == user_id))
    return res.scalar_one_or_none()


async def _load_uji(db: AsyncSession, uji_id: UUID) -> UjiKompetensi:
    res = await db.execute(
        select(UjiKompetensi)
        .where(UjiKompetensi.id == uji_id)
        .options(selectinload(UjiKompetensi.skema), selectinload(UjiKompetensi.tuk))
    )
    u = res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Uji kompetensi tidak ditemukan")
    return u


def _uji_dict(u: UjiKompetensi) -> dict:
    return {
        "id": str(u.id),
        "judul": u.judul,
        "skema_id": str(u.skema_id) if u.skema_id else None,
        "skema_nama": u.skema.nama if u.skema else None,
        "skema_kode": u.skema.kode if u.skema else None,
        "tuk_id": str(u.tuk_id) if u.tuk_id else None,
        "tuk_nama": u.tuk.nama if u.tuk else None,
        "tanggal": to_iso_utc(u.tanggal),
        "ruang": u.ruang,
        "waktu": u.waktu,
        "nomor_spt": u.nomor_spt,
        "asesor_ids": u.asesor_ids or [],
        "peserta": u.peserta or [],
        "status": u.status,
        "created_at": to_iso_utc(u.created_at),
    }


# ── Payloads ──────────────────────────────────────────────────────────
class UjiCreate(BaseModel):
    judul: str
    skema_id: UUID | None = None
    tuk_id: UUID | None = None
    tanggal: datetime | None = None
    ruang: str | None = None
    waktu: str | None = None
    nomor_spt: str | None = None
    asesor_ids: list[dict] = []   # [{id, nama, no_reg}]
    peserta: list[dict] = []


class UjiUpdate(BaseModel):
    judul: str | None = None
    skema_id: UUID | None = None
    tuk_id: UUID | None = None
    tanggal: datetime | None = None
    ruang: str | None = None
    waktu: str | None = None
    nomor_spt: str | None = None
    asesor_ids: list[dict] | None = None   # [{id, nama, no_reg}]
    peserta: list[dict] | None = None
    status: str | None = None


class UjiFormPayload(BaseModel):
    data_json: dict


# ── CRUD event ────────────────────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED)
async def create_uji(
    payload: UjiCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ADMIN + KETUA)),
):
    u = UjiKompetensi(
        lsp_id=current_user.lsp_id,
        judul=payload.judul,
        skema_id=payload.skema_id,
        tuk_id=payload.tuk_id,
        tanggal=payload.tanggal,
        ruang=payload.ruang,
        waktu=payload.waktu,
        nomor_spt=payload.nomor_spt,
        asesor_ids=payload.asesor_ids,
        peserta=payload.peserta,
        created_by=current_user.id,
    )
    db.add(u)
    await db.commit()
    u = await _load_uji(db, u.id)
    return {"success": True, "data": _uji_dict(u)}


@router.get("")
async def list_uji(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(SEMUA)),
):
    stmt = (
        select(UjiKompetensi)
        .where(UjiKompetensi.lsp_id == current_user.lsp_id)
        .options(selectinload(UjiKompetensi.skema), selectinload(UjiKompetensi.tuk))
        .order_by(UjiKompetensi.created_at.desc())
    )
    res = await db.execute(stmt)
    items = res.scalars().all()
    return {"success": True, "data": [_uji_dict(u) for u in items]}


@router.get("/{uji_id}")
async def get_uji(
    uji_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(SEMUA)),
):
    u = await _load_uji(db, uji_id)
    return {"success": True, "data": _uji_dict(u)}


@router.patch("/{uji_id}")
async def update_uji(
    uji_id: UUID,
    payload: UjiUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ADMIN + KETUA)),
):
    u = await _load_uji(db, uji_id)
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(u, k, v)
    await db.commit()
    u = await _load_uji(db, uji_id)
    return {"success": True, "data": _uji_dict(u)}


@router.delete("/{uji_id}")
async def delete_uji(
    uji_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ADMIN + KETUA)),
):
    u = await _load_uji(db, uji_id)
    await db.delete(u)
    await db.commit()
    return {"success": True, "data": {"deleted": str(uji_id)}}


# ── Forms ─────────────────────────────────────────────────────────────
@router.get("/{uji_id}/forms")
async def list_uji_forms(
    uji_id: UUID,
    menu: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(SEMUA)),
):
    res = await db.execute(select(UjiForm).where(UjiForm.uji_id == uji_id))
    existing = {f.kode_form: f for f in res.scalars().all()}
    data = []
    for kode, meta in FORM_REGISTRY.items():
        if menu and meta["menu"] != menu:
            continue
        f = existing.get(kode)
        data.append({
            "kode_form": kode,
            "label": meta["label"],
            "menu": meta["menu"],
            "input": meta["input"],
            "validasi": meta["validasi"],
            "terisi": f is not None,
            "status": f.status if f else None,
            "divalidasi_oleh": f.divalidasi_oleh if f else None,
            "divalidasi_at": to_iso_utc(f.divalidasi_at) if f else None,
            "divalidasi_ttd_url": f.divalidasi_ttd_url if f else None,
            "updated_at": to_iso_utc(f.updated_at) if f else None,
        })
    return {"success": True, "data": data}


@router.get("/{uji_id}/form/{kode_form}")
async def get_uji_form(
    uji_id: UUID,
    kode_form: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(SEMUA)),
):
    if kode_form not in FORM_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Form {kode_form} tidak dikenal")
    res = await db.execute(
        select(UjiForm).where(UjiForm.uji_id == uji_id, UjiForm.kode_form == kode_form)
    )
    f = res.scalar_one_or_none()
    meta = FORM_REGISTRY[kode_form]
    return {
        "success": True,
        "data": {
            "kode_form": kode_form,
            "label": meta["label"],
            "input": meta["input"],
            "validasi": meta["validasi"],
            "data_json": f.data_json if f else None,
            "status": f.status if f else None,
            "divalidasi_oleh": f.divalidasi_oleh if f else None,
            "divalidasi_at": to_iso_utc(f.divalidasi_at) if f else None,
            "divalidasi_ttd_url": f.divalidasi_ttd_url if f else None,
            "updated_at": to_iso_utc(f.updated_at) if f else None,
        },
    }


@router.post("/{uji_id}/form/{kode_form}")
async def upsert_uji_form(
    uji_id: UUID,
    kode_form: str,
    payload: UjiFormPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(SEMUA)),
):
    if kode_form not in FORM_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Form {kode_form} tidak dikenal")
    meta = FORM_REGISTRY[kode_form]
    # hanya role 'input' (atau superadmin) yang boleh mengisi
    if not _role_match(current_user.role, meta["input"]):
        raise HTTPException(status_code=403, detail=f"Hanya {meta['input']} yang dapat mengisi form ini")

    await _load_uji(db, uji_id)
    res = await db.execute(
        select(UjiForm).where(UjiForm.uji_id == uji_id, UjiForm.kode_form == kode_form)
    )
    f = res.scalar_one_or_none()
    if f:
        f.data_json = payload.data_json
        f.diisi_oleh = current_user.role
        f.status = "DRAFT"           # diubah → perlu validasi ulang
        f.divalidasi_oleh = None
        f.divalidasi_at = None
        f.updated_at = datetime.now(timezone.utc)
    else:
        f = UjiForm(
            uji_id=uji_id, kode_form=kode_form, data_json=payload.data_json,
            diisi_oleh=current_user.role, status="DRAFT",
        )
        db.add(f)
    await db.commit()
    await db.refresh(f)
    return {"success": True, "data": {"kode_form": kode_form, "status": f.status, "data_json": f.data_json}}


@router.post("/{uji_id}/form/{kode_form}/validasi")
async def validasi_uji_form(
    uji_id: UUID,
    kode_form: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(SEMUA)),
):
    if kode_form not in FORM_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Form {kode_form} tidak dikenal")
    meta = FORM_REGISTRY[kode_form]
    if not _role_match(current_user.role, meta["validasi"]):
        raise HTTPException(status_code=403, detail=f"Hanya {meta['validasi']} yang dapat memvalidasi")

    res = await db.execute(
        select(UjiForm).where(UjiForm.uji_id == uji_id, UjiForm.kode_form == kode_form)
    )
    f = res.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=400, detail="Form belum diisi")
    f.status = "DIVALIDASI"
    f.divalidasi_oleh = current_user.role
    f.divalidasi_at = datetime.now(timezone.utc)
    # Snapshot TTD validator (e-sign) dari profil — agar tampil & persist di dokumen
    f.divalidasi_ttd_url = await _user_ttd_url(db, current_user.id)
    await db.commit()
    return {"success": True, "data": {"kode_form": kode_form, "status": f.status, "divalidasi_at": to_iso_utc(f.divalidasi_at), "divalidasi_ttd_url": f.divalidasi_ttd_url}}
