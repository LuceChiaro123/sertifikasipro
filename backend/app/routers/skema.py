from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.rbac import get_current_user, require_role
from app.models import Skema, User

router = APIRouter()
ADMIN_ROLES = ["admin", "superadmin"]


def _out(s: Skema) -> dict:
    return {
        "id": str(s.id),
        "lsp_id": str(s.lsp_id),
        "kode": s.kode,
        "nama": s.nama,
        "biaya": float(s.biaya or 0),
        "unit_kompetensi": s.unit_kompetensi or [],
        "persyaratan": s.persyaratan or [],
        "is_ajj_approved": s.is_ajj_approved,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


class SkemaCreate(BaseModel):
    kode: str
    nama: str
    biaya: Optional[Decimal] = Decimal("0")
    unit_kompetensi: Optional[list] = []
    persyaratan: Optional[list] = []


class SkemaUpdate(BaseModel):
    kode: Optional[str] = None
    nama: Optional[str] = None
    biaya: Optional[Decimal] = None
    unit_kompetensi: Optional[list] = None
    persyaratan: Optional[list] = None
    is_ajj_approved: Optional[bool] = None


@router.get("")
async def list_skema(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Skema).where(Skema.lsp_id == current_user.lsp_id).order_by(Skema.nama)
    result = await db.execute(stmt)
    return {"success": True, "data": [_out(s) for s in result.scalars().all()]}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_skema(
    payload: SkemaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ADMIN_ROLES)),
):
    s = Skema(
        lsp_id=current_user.lsp_id,
        kode=payload.kode,
        nama=payload.nama,
        biaya=payload.biaya or 0,
        unit_kompetensi=payload.unit_kompetensi or [],
        persyaratan=payload.persyaratan or [],
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return {"success": True, "data": _out(s)}


@router.patch("/{skema_id}")
async def update_skema(
    skema_id: UUID,
    payload: SkemaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ADMIN_ROLES)),
):
    s = await db.get(Skema, skema_id)
    if not s:
        raise HTTPException(status_code=404, detail="Skema tidak ditemukan")
    if payload.kode is not None:
        s.kode = payload.kode
    if payload.nama is not None:
        s.nama = payload.nama
    if payload.biaya is not None:
        s.biaya = payload.biaya
    if payload.unit_kompetensi is not None:
        s.unit_kompetensi = payload.unit_kompetensi
    if payload.persyaratan is not None:
        s.persyaratan = payload.persyaratan
    if payload.is_ajj_approved is not None:
        s.is_ajj_approved = payload.is_ajj_approved
    await db.commit()
    await db.refresh(s)
    return {"success": True, "data": _out(s)}


@router.delete("/{skema_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skema(
    skema_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ADMIN_ROLES)),
):
    s = await db.get(Skema, skema_id)
    if not s:
        raise HTTPException(status_code=404, detail="Skema tidak ditemukan")
    await db.delete(s)
    await db.commit()
