from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    role: str
    lsp_id: Optional[UUID] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    lsp_id: Optional[UUID] = None

class User(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# LSP schemas
class LSPBase(BaseModel):
    nama: str
    nomor_lisensi: str
    ruang_lingkup: Optional[str] = None
    alamat: Optional[str] = None
    logo_url: Optional[str] = None

class LSPCreate(LSPBase):
    pass

class LSPUpdate(BaseModel):
    nama: Optional[str] = None
    nomor_lisensi: Optional[str] = None
    ruang_lingkup: Optional[str] = None
    alamat: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: Optional[bool] = None

class LSP(LSPBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Skema schemas
class SkemaBase(BaseModel):
    kode: str
    nama: str
    unit_kompetensi: list
    biaya: float
    persyaratan: list
    is_ajj_approved: bool = True

class SkemaCreate(SkemaBase):
    lsp_id: UUID

class SkemaUpdate(BaseModel):
    kode: Optional[str] = None
    nama: Optional[str] = None
    unit_kompetensi: Optional[list] = None
    biaya: Optional[float] = None
    persyaratan: Optional[list] = None
    is_ajj_approved: Optional[bool] = None

class Skema(SkemaBase):
    id: UUID
    lsp_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True