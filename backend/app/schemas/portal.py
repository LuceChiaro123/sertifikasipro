from datetime import date
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LSPPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    nama: str
    nomor_lisensi: str
    ruang_lingkup: Optional[str] = None
    alamat: Optional[str] = None
    logo_url: Optional[str] = None


class SkemaPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lsp_id: UUID
    kode: str
    nama: str
    biaya: float
    unit_kompetensi: List[dict] = []
    persyaratan: List[str] = []
    is_ajj_approved: bool


class SertifikatPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    nomor_sertifikat: str
    nama_pemegang: str
    skema_nama: str
    tanggal_terbit: date
    tanggal_berakhir: date
    is_active: bool
