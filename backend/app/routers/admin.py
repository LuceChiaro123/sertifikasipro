"""Admin-only endpoints: stats, asesi list, asesor CRUD, user management."""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.rbac import require_role
from app.models import Skema, Sertifikat, User
from app.models.asesi import Asesi
from app.models.asesor import Asesor
from app.models.permohonan import Permohonan, PermohonanStatus

router = APIRouter()
ADMIN_ROLES = ["admin", "superadmin", "pimpinan"]
SUPERADMIN_ROLES = ["admin", "superadmin"]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─────────────────────────────────────────────────────────────────────
# STATS
# ─────────────────────────────────────────────────────────────────────
@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ADMIN_ROLES)),
):
    lsp_id = current_user.lsp_id
    status_rows = await db.execute(
        select(Permohonan.status, func.count(Permohonan.id))
        .join(Asesi, Permohonan.asesi_id == Asesi.id)
        .join(User, Asesi.user_id == User.id)
        .where(User.lsp_id == lsp_id)
        .group_by(Permohonan.status)
    )
    by_status = {row[0]: row[1] for row in status_rows}

    asesi_count = await db.scalar(
        select(func.count(Asesi.id))
        .join(User, Asesi.user_id == User.id)
        .where(User.lsp_id == lsp_id)
    )
    sertifikat_count = await db.scalar(
        select(func.count(Sertifikat.id))
        .join(Asesi, Sertifikat.asesi_id == Asesi.id)
        .join(User, Asesi.user_id == User.id)
        .where(User.lsp_id == lsp_id, Sertifikat.is_active.is_(True))
    )
    skema_count = await db.scalar(
        select(func.count(Skema.id)).where(Skema.lsp_id == lsp_id)
    )

    total = sum(by_status.values()) or 0
    selesai = (
        by_status.get(PermohonanStatus.SELESAI, 0)
        + by_status.get(PermohonanStatus.SERTIFIKAT_DITERBITKAN, 0)
    )

    return {
        "success": True,
        "data": {
            "total_permohonan": total,
            "permohonan_by_status": {k: v for k, v in by_status.items()},
            "total_asesi": asesi_count or 0,
            "total_sertifikat_aktif": sertifikat_count or 0,
            "total_skema": skema_count or 0,
            "tingkat_kelulusan": round(selesai / total * 100, 1) if total else 0,
        },
    }


# ─────────────────────────────────────────────────────────────────────
# ASESI LIST
# ─────────────────────────────────────────────────────────────────────
@router.get("/asesi")
async def list_asesi(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ADMIN_ROLES)),
):
    lsp_id = current_user.lsp_id
    stmt = (
        select(Asesi, User)
        .join(User, Asesi.user_id == User.id)
        .where(User.lsp_id == lsp_id)
        .order_by(Asesi.nama_lengkap)
    )
    rows = await db.execute(stmt)
    data = []
    for asesi, user in rows:
        count = await db.scalar(
            select(func.count(Permohonan.id)).where(Permohonan.asesi_id == asesi.id)
        )
        data.append({
            "id": str(asesi.id),
            "nama_lengkap": asesi.nama_lengkap,
            "nik": asesi.nik,
            "email": user.email,
            "telepon": asesi.telepon,
            "pendidikan": asesi.pendidikan,
            "pekerjaan": asesi.pekerjaan,
            "foto_url": asesi.foto_url,
            "ktp_url": asesi.ktp_url,
            "ijazah_url": asesi.ijazah_url,
            "total_permohonan": count or 0,
            "created_at": asesi.created_at.isoformat() if asesi.created_at else None,
        })
    return {"success": True, "data": data}


# ─────────────────────────────────────────────────────────────────────
# USER MANAGEMENT
# ─────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: str
    password: str
    role: str
    lsp_id: Optional[str] = None


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(SUPERADMIN_ROLES)),
):
    lsp_id = current_user.lsp_id
    stmt = select(User).where(User.lsp_id == lsp_id).order_by(User.created_at.desc())
    result = await db.execute(stmt)
    users = result.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "id": str(u.id),
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
    }


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(SUPERADMIN_ROLES)),
):
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")

    import uuid as _uuid
    lsp_id = payload.lsp_id or str(current_user.lsp_id)
    user = User(
        email=payload.email,
        password_hash=pwd_context.hash(payload.password),
        role=payload.role,
        lsp_id=lsp_id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {
        "success": True,
        "message": "User berhasil dibuat",
        "data": {"id": str(user.id), "email": user.email, "role": user.role},
    }


@router.patch("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(SUPERADMIN_ROLES)),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    user.is_active = not user.is_active
    await db.commit()
    return {"success": True, "data": {"id": str(user.id), "is_active": user.is_active}}


# ─────────────────────────────────────────────────────────────────────
# ASESOR MANAGEMENT
# ─────────────────────────────────────────────────────────────────────
class AsesorCreate(BaseModel):
    # User account
    email: str
    password: str
    # Profile
    nama_lengkap: str
    nik: Optional[str] = None
    tempat_lahir: Optional[str] = None
    tanggal_lahir: Optional[str] = None   # "YYYY-MM-DD"
    jenis_kelamin: Optional[str] = None   # "L" / "P"
    pendidikan: Optional[str] = None
    pekerjaan: Optional[str] = None
    telepon: Optional[str] = None
    nomor_reg_asesor: str
    masa_berlaku: Optional[str] = None    # "YYYY-MM-DD"
    sertifikat_asesor_url: Optional[str] = None
    bidang_kompetensi: list = []
    sertifikat_kompetensi_url: Optional[str] = None


class AsesorUpdate(BaseModel):
    nama_lengkap: Optional[str] = None
    nik: Optional[str] = None
    tempat_lahir: Optional[str] = None
    tanggal_lahir: Optional[str] = None
    jenis_kelamin: Optional[str] = None
    pendidikan: Optional[str] = None
    pekerjaan: Optional[str] = None
    telepon: Optional[str] = None
    nomor_reg_asesor: Optional[str] = None
    masa_berlaku: Optional[str] = None
    sertifikat_asesor_url: Optional[str] = None
    bidang_kompetensi: Optional[list] = None
    sertifikat_kompetensi_url: Optional[str] = None


def _asesor_to_dict(a: Asesor, user: User) -> dict:
    return {
        "id": str(a.id),
        "user_id": str(a.user_id),
        "email": user.email if user else None,
        "nama_lengkap": a.nama_lengkap,
        "nik": a.nik,
        "tempat_lahir": a.tempat_lahir,
        "tanggal_lahir": a.tanggal_lahir.isoformat() if a.tanggal_lahir else None,
        "jenis_kelamin": a.jenis_kelamin,
        "pendidikan": a.pendidikan,
        "pekerjaan": a.pekerjaan,
        "telepon": a.telepon,
        "nomor_reg_asesor": a.nomor_reg_asesor,
        "masa_berlaku": a.masa_berlaku.isoformat() if a.masa_berlaku else None,
        "sertifikat_asesor_url": a.sertifikat_asesor_url,
        "bidang_kompetensi": a.bidang_kompetensi or [],
        "sertifikat_kompetensi_url": a.sertifikat_kompetensi_url,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


@router.get("/asesor")
async def list_asesor(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ADMIN_ROLES)),
):
    stmt = (
        select(Asesor, User)
        .join(User, Asesor.user_id == User.id)
        .where(User.lsp_id == current_user.lsp_id)
        .order_by(Asesor.nama_lengkap)
    )
    rows = await db.execute(stmt)
    return {"success": True, "data": [_asesor_to_dict(a, u) for a, u in rows]}


@router.post("/asesor", status_code=status.HTTP_201_CREATED)
async def create_asesor(
    payload: AsesorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(SUPERADMIN_ROLES)),
):
    # Cek email tidak duplikat
    existing_user = await db.scalar(select(User).where(User.email == payload.email))
    if existing_user:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")

    # Cek nomor reg tidak duplikat
    existing_reg = await db.scalar(
        select(Asesor).where(Asesor.nomor_reg_asesor == payload.nomor_reg_asesor)
    )
    if existing_reg:
        raise HTTPException(status_code=400, detail="Nomor registrasi asesor sudah terdaftar")

    # Buat User
    user = User(
        email=payload.email,
        password_hash=pwd_context.hash(payload.password),
        role="asesor",
        lsp_id=current_user.lsp_id,
        is_active=True,
    )
    db.add(user)
    await db.flush()  # get user.id

    # Buat Asesor profile
    asesor = Asesor(
        user_id=user.id,
        nama_lengkap=payload.nama_lengkap,
        nik=payload.nik,
        tempat_lahir=payload.tempat_lahir,
        tanggal_lahir=date.fromisoformat(payload.tanggal_lahir) if payload.tanggal_lahir else None,
        jenis_kelamin=payload.jenis_kelamin,
        pendidikan=payload.pendidikan,
        pekerjaan=payload.pekerjaan,
        telepon=payload.telepon,
        nomor_reg_asesor=payload.nomor_reg_asesor,
        masa_berlaku=date.fromisoformat(payload.masa_berlaku) if payload.masa_berlaku else None,
        sertifikat_asesor_url=payload.sertifikat_asesor_url,
        bidang_kompetensi=payload.bidang_kompetensi,
        sertifikat_kompetensi_url=payload.sertifikat_kompetensi_url,
    )
    db.add(asesor)
    await db.commit()
    await db.refresh(asesor)
    await db.refresh(user)

    return {"success": True, "message": "Asesor berhasil ditambahkan", "data": _asesor_to_dict(asesor, user)}


@router.patch("/asesor/{asesor_id}")
async def update_asesor(
    asesor_id: str,
    payload: AsesorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(SUPERADMIN_ROLES)),
):
    asesor = await db.get(Asesor, asesor_id)
    if not asesor:
        raise HTTPException(status_code=404, detail="Asesor tidak ditemukan")

    if payload.nama_lengkap is not None:
        asesor.nama_lengkap = payload.nama_lengkap
    if payload.nik is not None:
        asesor.nik = payload.nik
    if payload.tempat_lahir is not None:
        asesor.tempat_lahir = payload.tempat_lahir
    if payload.tanggal_lahir is not None:
        asesor.tanggal_lahir = date.fromisoformat(payload.tanggal_lahir)
    if payload.jenis_kelamin is not None:
        asesor.jenis_kelamin = payload.jenis_kelamin
    if payload.pendidikan is not None:
        asesor.pendidikan = payload.pendidikan
    if payload.pekerjaan is not None:
        asesor.pekerjaan = payload.pekerjaan
    if payload.telepon is not None:
        asesor.telepon = payload.telepon
    if payload.nomor_reg_asesor is not None:
        asesor.nomor_reg_asesor = payload.nomor_reg_asesor
    if payload.masa_berlaku is not None:
        asesor.masa_berlaku = date.fromisoformat(payload.masa_berlaku)
    if payload.sertifikat_asesor_url is not None:
        asesor.sertifikat_asesor_url = payload.sertifikat_asesor_url
    if payload.bidang_kompetensi is not None:
        asesor.bidang_kompetensi = payload.bidang_kompetensi
    if payload.sertifikat_kompetensi_url is not None:
        asesor.sertifikat_kompetensi_url = payload.sertifikat_kompetensi_url

    await db.commit()
    await db.refresh(asesor)
    user = await db.get(User, asesor.user_id)
    return {"success": True, "data": _asesor_to_dict(asesor, user)}


@router.delete("/asesor/{asesor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asesor(
    asesor_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(SUPERADMIN_ROLES)),
):
    asesor = await db.get(Asesor, asesor_id)
    if not asesor:
        raise HTTPException(status_code=404, detail="Asesor tidak ditemukan")
    user = await db.get(User, asesor.user_id)
    await db.delete(asesor)
    if user:
        user.is_active = False
    await db.commit()
