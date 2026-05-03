from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.rbac import get_current_user, require_role
from app.models import User
from app.models.permohonan import TUK
from app.schemas.permohonan import TUKCreate, TUKOut, TUKUpdate

router = APIRouter()

ADMIN_ROLES = ["admin", "superadmin", "pimpinan"]


@router.get("")
async def list_tuk(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(TUK).where(TUK.lsp_id == current_user.lsp_id).order_by(TUK.nama)
    result = await db.execute(stmt)
    tuks = result.scalars().all()
    return {"success": True, "data": [TUKOut.model_validate(t).model_dump(mode="json") for t in tuks]}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_tuk(
    payload: TUKCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ADMIN_ROLES)),
):
    tuk = TUK(lsp_id=current_user.lsp_id, **payload.model_dump())
    db.add(tuk)
    await db.commit()
    await db.refresh(tuk)
    return {"success": True, "data": TUKOut.model_validate(tuk).model_dump(mode="json")}


@router.patch("/{tuk_id}")
async def update_tuk(
    tuk_id: UUID,
    payload: TUKUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ADMIN_ROLES)),
):
    tuk = await db.get(TUK, tuk_id)
    if not tuk or tuk.lsp_id != current_user.lsp_id:
        raise HTTPException(status_code=404, detail="TUK tidak ditemukan")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(tuk, field, val)
    await db.commit()
    await db.refresh(tuk)
    return {"success": True, "data": TUKOut.model_validate(tuk).model_dump(mode="json")}


@router.delete("/{tuk_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tuk(
    tuk_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(ADMIN_ROLES)),
):
    tuk = await db.get(TUK, tuk_id)
    if not tuk or tuk.lsp_id != current_user.lsp_id:
        raise HTTPException(status_code=404, detail="TUK tidak ditemukan")
    await db.delete(tuk)
    await db.commit()
