import re

from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from uuid import UUID


def validate_nik(v: Optional[str]) -> Optional[str]:
    """NIK wajib 16 digit angka (standar KTP Indonesia)."""
    if v in (None, ""):
        return v
    v = v.strip()
    if not re.fullmatch(r"\d{16}", v):
        raise ValueError("NIK harus tepat 16 digit angka")
    return v


def validate_password_strength(v: str) -> str:
    """Password minimal 8 karakter, mengandung huruf dan angka."""
    if v is None or len(v) < 8:
        raise ValueError("Password minimal 8 karakter")
    if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
        raise ValueError("Password harus mengandung huruf dan angka")
    return v


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

    @field_validator("password")
    @classmethod
    def _check_password(cls, v):
        return validate_password_strength(v)

    @field_validator("nik")
    @classmethod
    def _check_nik(cls, v):
        return validate_nik(v)

class RefreshTokenRequest(BaseModel):
    refresh_token: str