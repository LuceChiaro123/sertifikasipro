import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models._types import GUID, JSONType


class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="calon_asesi")
    is_active = Column(Boolean, nullable=False, default=True)
    lsp_id = Column(GUID(), ForeignKey("lsps.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    lsp = relationship("LSP", back_populates="users")
    asesi = relationship("Asesi", back_populates="user", uselist=False)
    asesor = relationship("Asesor", back_populates="user", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="user")


class LSP(Base):
    __tablename__ = "lsps"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    nama = Column(String(255), nullable=False)
    nomor_lisensi = Column(String(64), unique=True, nullable=False)
    ruang_lingkup = Column(Text, nullable=True)
    alamat = Column(Text, nullable=True)
    logo_url = Column(String(512), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    users = relationship("User", back_populates="lsp")
    skemas = relationship("Skema", back_populates="lsp")


class Skema(Base):
    __tablename__ = "skemas"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    lsp_id = Column(GUID(), ForeignKey("lsps.id"), nullable=False)
    kode = Column(String(64), nullable=False, index=True)
    nama = Column(String(255), nullable=False)
    unit_kompetensi = Column(JSONType, nullable=False, default=list)
    biaya = Column(Numeric(12, 2), nullable=False, default=0)
    persyaratan = Column(JSONType, nullable=False, default=list)
    is_ajj_approved = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    lsp = relationship("LSP", back_populates="skemas")
    permohonans = relationship("Permohonan", back_populates="skema")
    sertifikats = relationship("Sertifikat", back_populates="skema")
