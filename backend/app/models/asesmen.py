import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models._types import GUID, JSONType


class FormAPL01(Base):
    __tablename__ = "form_apl01s"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    permohonan_id = Column(GUID(), ForeignKey("permohonans.id"), unique=True, nullable=False)
    data_json = Column(JSONType, nullable=False)
    tanda_tangan_url = Column(String(512), nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    permohonan = relationship("Permohonan", back_populates="form_apl01")


class FormAPL02(Base):
    __tablename__ = "form_apl02s"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    permohonan_id = Column(GUID(), ForeignKey("permohonans.id"), unique=True, nullable=False)
    unit_kompetensi_json = Column(JSONType, nullable=True)
    hasil_mandiri_json = Column(JSONType, nullable=False)
    tanda_tangan_url = Column(String(512), nullable=True)
    verified_by_asesor_id = Column(GUID(), ForeignKey("asesors.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    catatan_asesor = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    permohonan = relationship("Permohonan", back_populates="form_apl02")
    verified_by_asesor = relationship("Asesor")


class RencanaAsesmen(Base):
    __tablename__ = "rencana_asesmens"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    permohonan_id = Column(GUID(), ForeignKey("permohonans.id"), unique=True, nullable=False)
    fr_mapa01_json = Column(JSONType, nullable=False)
    fr_mapa02_json = Column(JSONType, nullable=False)
    ttd_asesor_url = Column(String(512), nullable=True)
    ttd_kabag_url = Column(String(512), nullable=True)
    ttd_kepala_tuk_url = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    permohonan = relationship("Permohonan", back_populates="rencana_asesmen")
    instrumen_asesmens = relationship("InstrumenAsesmen", back_populates="rencana_asesmen")


class InstrumenAsesmen(Base):
    __tablename__ = "instrumen_asesmens"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    permohonan_id = Column(GUID(), ForeignKey("permohonans.id"), nullable=False, index=True)
    rencana_id = Column(GUID(), ForeignKey("rencana_asesmens.id"), nullable=True)
    kode_fr = Column(String(16), nullable=False, index=True)
    konten_json = Column(JSONType, nullable=False)
    jawaban_asesi_json = Column(JSONType, nullable=True)
    verifikasi_asesor_id = Column(GUID(), ForeignKey("asesors.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    catatan = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    permohonan = relationship("Permohonan", back_populates="instrumen_asesmens")
    rencana_asesmen = relationship("RencanaAsesmen", back_populates="instrumen_asesmens")
    verifikasi_asesor = relationship("Asesor")
