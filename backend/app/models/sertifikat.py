import enum
import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models._types import GUID


class HasilKeputusan(str, enum.Enum):
    K = "K"
    BK = "BK"


class BandingStatus(str, enum.Enum):
    PENDING = "PENDING"
    DITERIMA = "DITERIMA"
    DITOLAK = "DITOLAK"


class Sertifikat(Base):
    __tablename__ = "sertifikats"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    asesi_id = Column(GUID(), ForeignKey("asesis.id"), nullable=False, index=True)
    skema_id = Column(GUID(), ForeignKey("skemas.id"), nullable=False, index=True)
    permohonan_id = Column(GUID(), ForeignKey("permohonans.id"), nullable=True)
    nomor_sertifikat = Column(String(64), unique=True, nullable=False, index=True)
    tanggal_terbit = Column(Date, nullable=False)
    tanggal_berakhir = Column(Date, nullable=False)
    file_url = Column(String(512), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    asesi = relationship("Asesi", back_populates="sertifikats")
    skema = relationship("Skema", back_populates="sertifikats")


class KeputusanSertifikasi(Base):
    __tablename__ = "keputusan_sertifikasis"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    permohonan_id = Column(GUID(), ForeignKey("permohonans.id"), unique=True, nullable=False)
    hasil = Column(SAEnum(HasilKeputusan, name="hasil_keputusan"), nullable=False)
    sk_komite_url = Column(String(512), nullable=True)
    berita_acara_url = Column(String(512), nullable=True)
    catatan = Column(Text, nullable=True)
    diputuskan_oleh = Column(GUID(), ForeignKey("users.id"), nullable=False)
    diputuskan_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    permohonan = relationship("Permohonan", back_populates="keputusan_sertifikasi")
    diputuskan_oleh_user = relationship("User")


class Banding(Base):
    __tablename__ = "bandings"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    permohonan_id = Column(GUID(), ForeignKey("permohonans.id"), nullable=False, index=True)
    alasan = Column(Text, nullable=False)
    bukti_url = Column(String(512), nullable=True)
    status = Column(SAEnum(BandingStatus, name="banding_status"), nullable=False, default=BandingStatus.PENDING)
    keputusan_banding = Column(Text, nullable=True)
    diputuskan_oleh = Column(GUID(), ForeignKey("users.id"), nullable=True)
    diajukan_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    diselesaikan_at = Column(DateTime(timezone=True), nullable=True)

    permohonan = relationship("Permohonan", back_populates="banding")
