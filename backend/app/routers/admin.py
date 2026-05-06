"""Admin-only endpoints: stats, asesi list."""
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends

from app.database import get_db
from app.middleware.rbac import require_role
from app.models import User, Skema, Sertifikat
from app.models.asesi import Asesi
from app.models.permohonan import Permohonan, PermohonanStatus

router = APIRouter()
ADMIN_ROLES = ["admin", "superadmin", "pimpinan"]


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ADMIN_ROLES)),
):
    lsp_id = current_user.lsp_id

    # total permohonan per status
    status_rows = await db.execute(
        select(Permohonan.status, func.count(Permohonan.id))
        .join(Asesi, Permohonan.asesi_id == Asesi.id)
        .join(User, Asesi.user_id == User.id)
        .where(User.lsp_id == lsp_id)
        .group_by(Permohonan.status)
    )
    by_status = {row[0]: row[1] for row in status_rows}

    # total asesi
    asesi_count = await db.scalar(
        select(func.count(Asesi.id))
        .join(User, Asesi.user_id == User.id)
        .where(User.lsp_id == lsp_id)
    )

    # total sertifikat aktif
    sertifikat_count = await db.scalar(
        select(func.count(Sertifikat.id))
        .join(Asesi, Sertifikat.asesi_id == Asesi.id)
        .join(User, Asesi.user_id == User.id)
        .where(User.lsp_id == lsp_id, Sertifikat.is_active.is_(True))
    )

    # total skema
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
        # count permohonan
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
            "total_permohonan": count or 0,
            "created_at": asesi.created_at.isoformat() if asesi.created_at else None,
        })

    return {"success": True, "data": data}
