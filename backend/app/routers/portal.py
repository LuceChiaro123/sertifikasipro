from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import LSP, Asesi, Sertifikat, Skema
from app.schemas.portal import LSPPublic, SertifikatPublic, SkemaPublic

router = APIRouter()


@router.get("/lsp")
async def list_lsp(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LSP).where(LSP.is_active.is_(True)))
    lsps = result.scalars().all()
    return {
        "success": True,
        "data": [LSPPublic.model_validate(l).model_dump(mode="json") for l in lsps],
    }


@router.get("/lsp/{lsp_id}")
async def get_lsp(lsp_id: UUID, db: AsyncSession = Depends(get_db)):
    lsp = await db.get(LSP, lsp_id)
    if not lsp or not lsp.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="LSP not found")
    return {"success": True, "data": LSPPublic.model_validate(lsp).model_dump(mode="json")}


@router.get("/skema")
async def list_skema(
    lsp_id: Optional[UUID] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Skema).where(Skema.is_ajj_approved.is_(True))
    if lsp_id:
        stmt = stmt.where(Skema.lsp_id == lsp_id)
    result = await db.execute(stmt)
    skemas = result.scalars().all()
    return {
        "success": True,
        "data": [SkemaPublic.model_validate(s).model_dump(mode="json") for s in skemas],
    }


@router.get("/skema/{skema_id}")
async def get_skema(skema_id: UUID, db: AsyncSession = Depends(get_db)):
    skema = await db.get(Skema, skema_id)
    if not skema:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skema not found")
    return {
        "success": True,
        "data": SkemaPublic.model_validate(skema).model_dump(mode="json"),
    }


@router.get("/verifikasi-sertifikat")
async def verifikasi_sertifikat(
    nomor: str = Query(..., min_length=3),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Sertifikat)
        .where(Sertifikat.nomor_sertifikat == nomor)
        .options(selectinload(Sertifikat.asesi), selectinload(Sertifikat.skema))
    )
    result = await db.execute(stmt)
    sertifikat = result.scalar_one_or_none()

    if not sertifikat:
        return {
            "success": False,
            "message": "Sertifikat tidak ditemukan",
            "data": None,
        }

    payload = SertifikatPublic(
        nomor_sertifikat=sertifikat.nomor_sertifikat,
        nama_pemegang=sertifikat.asesi.nama_lengkap,
        skema_nama=sertifikat.skema.nama,
        tanggal_terbit=sertifikat.tanggal_terbit,
        tanggal_berakhir=sertifikat.tanggal_berakhir,
        is_active=sertifikat.is_active,
    )
    data = payload.model_dump(mode="json")
    data["file_url"] = sertifikat.file_url or None
    return {"success": True, "data": data}
