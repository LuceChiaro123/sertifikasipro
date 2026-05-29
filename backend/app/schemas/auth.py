from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[UUID] = None
    role: Optional[str] = None
    lsp_id: Optional[UUID] = None

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: str = "calon_asesi"
    lsp_id: Optional[UUID] = None
    # Data pribadi — dipakai membuat profil Asesi otomatis saat mendaftar
    full_name: Optional[str] = None
    nik: Optional[str] = None
    alamat: Optional[str] = None
    telepon: Optional[str] = None
    pendidikan: Optional[str] = None
    pekerjaan: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str