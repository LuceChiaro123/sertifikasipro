from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.rbac import get_current_user, require_role
from app.models import User
from app.models.asesor import Asesor
from app.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    Token,
)

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def _encode(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    expires = expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    return _encode({**data, "type": "access"}, expires)


def create_refresh_token(data: dict) -> str:
    return _encode(
        {**data, "type": "refresh"},
        timedelta(days=settings.refresh_token_expire_days),
    )


def _build_token_pair(user: User) -> Token:
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "lsp_id": str(user.lsp_id) if user.lsp_id else None,
    }
    return Token(
        access_token=create_access_token(payload),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
        token_type="bearer",
    )


@router.post("/register")
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        lsp_id=payload.lsp_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {
        "success": True,
        "message": "User registered successfully",
        "data": {"user_id": str(user.id), "email": user.email, "role": user.role},
    }


@router.post("/login", response_model=Token)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    return _build_token_pair(user)


@router.post("/refresh", response_model=Token)
async def refresh_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        decoded = jwt.decode(
            payload.refresh_token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is not a refresh token",
        )

    user_id = decoded.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return _build_token_pair(user)


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    return {"success": True, "message": "Logged out successfully"}


@router.get("/asesor-list")
async def asesor_list(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "superadmin", "pimpinan"])),
):
    """List all asesors in the same LSP — used by admin for scheduling."""
    result = await db.execute(
        select(Asesor).join(User, Asesor.user_id == User.id).where(User.lsp_id == current_user.lsp_id)
    )
    asesors = result.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "id": str(a.id),
                "nama_lengkap": a.nama_lengkap,
                "nomor_reg_asesor": a.nomor_reg_asesor,
                "bidang_kompetensi": a.bidang_kompetensi,
            }
            for a in asesors
        ],
    }


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "success": True,
        "data": {
            "id": str(current_user.id),
            "email": current_user.email,
            "role": current_user.role,
            "lsp_id": str(current_user.lsp_id) if current_user.lsp_id else None,
            "is_active": current_user.is_active,
        },
    }
