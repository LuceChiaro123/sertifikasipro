from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel

from app.schemas._types import UTCDateTime


# ── TUK ──────────────────────────────────────────────────────────────
class TUKCreate(BaseModel):
    nama: str
    jenis: str = "sewaktu"
    alamat: Optional[str] = None
    kepala_tuk: Optional[str] = None


class TUKUpdate(BaseModel):
    nama: Optional[str] = None
    jenis: Optional[str] = None
    alamat: Optional[str] = None
    kepala_tuk: Optional[str] = None
    is_active: Optional[str] = None


class TUKOut(BaseModel):
    id: UUID
    lsp_id: UUID
    nama: str
    jenis: str
    alamat: Optional[str]
    kepala_tuk: Optional[str]
    is_active: str
    created_at: UTCDateTime

    model_config = {"from_attributes": True}


# ── Permohonan ────────────────────────────────────────────────────────
class PermohonanCreate(BaseModel):
    skema_id: UUID
    jenis: str = "uji_sertifikasi"


class PermohonanStatusUpdate(BaseModel):
    status: str
    catatan_admin: Optional[str] = None


class PermohonanAssign(BaseModel):
    asesor_id: Optional[UUID] = None
    tuk_id: Optional[UUID] = None
    tanggal_asesmen: Optional[datetime] = None
    link_video_conference: Optional[str] = None


class PermohonanOut(BaseModel):
    id: UUID
    asesi_id: UUID
    skema_id: UUID
    asesor_id: Optional[UUID]
    tuk_id: Optional[UUID]
    jenis: str
    status: str
    tanggal_submit: Optional[UTCDateTime]
    tanggal_asesmen: Optional[UTCDateTime]
    link_video_conference: Optional[str]
    catatan_admin: Optional[str]
    created_at: UTCDateTime
    # joined fields
    asesi_nama: Optional[str] = None
    asesi_nik: Optional[str] = None
    asesi_foto_url: Optional[str] = None
    asesi_ktp_url: Optional[str] = None
    asesi_ijazah_url: Optional[str] = None
    skema_nama: Optional[str] = None
    skema_kode: Optional[str] = None
    asesor_nama: Optional[str] = None
    tuk_nama: Optional[str] = None

    model_config = {"from_attributes": True}


# ── APL01 ─────────────────────────────────────────────────────────────
class APL01Submit(BaseModel):
    data_json: dict[str, Any]


class APL01Out(BaseModel):
    id: UUID
    permohonan_id: UUID
    data_json: dict[str, Any]
    tanda_tangan_url: Optional[str]
    submitted_at: UTCDateTime

    model_config = {"from_attributes": True}


# ── APL02 ─────────────────────────────────────────────────────────────
class APL02Submit(BaseModel):
    hasil_mandiri_json: dict[str, Any]
    unit_kompetensi_json: Optional[dict[str, Any]] = None


class APL02Verify(BaseModel):
    catatan_asesor: Optional[str] = None


class APL02Out(BaseModel):
    id: UUID
    permohonan_id: UUID
    unit_kompetensi_json: Optional[dict[str, Any]]
    hasil_mandiri_json: dict[str, Any]
    tanda_tangan_url: Optional[str]
    verified_by_asesor_id: Optional[UUID]
    verified_at: Optional[UTCDateTime]
    catatan_asesor: Optional[str]
    submitted_at: UTCDateTime

    model_config = {"from_attributes": True}
