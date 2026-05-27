"""Pengelolaan Uji Kompetensi — event/kelompok asesmen (banyak peserta).

UjiKompetensi = satu event uji (skema, TUK, tanggal, daftar asesor, daftar peserta).
UjiForm       = generic store dokumen event (SPT, Berita Acara, Laporan, Notulen,
                Berita Acara Pleno, SK, Permohonan Blanko, Sertifikat) dengan
                alur Input → Validasi.
"""
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models._types import GUID, JSONType


class UjiKompetensi(Base):
    __tablename__ = "uji_kompetensis"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    lsp_id = Column(GUID(), ForeignKey("lsps.id"), nullable=False, index=True)
    judul = Column(String(255), nullable=False)
    skema_id = Column(GUID(), ForeignKey("skemas.id"), nullable=True)
    tuk_id = Column(GUID(), ForeignKey("tuks.id"), nullable=True)
    tanggal = Column(DateTime(timezone=True), nullable=True)
    ruang = Column(String(128), nullable=True)
    waktu = Column(String(64), nullable=True)
    nomor_spt = Column(String(128), nullable=True)
    asesor_ids = Column(JSONType, nullable=False, default=list)   # [asesor_id, ...]
    peserta = Column(JSONType, nullable=False, default=list)      # [{asesi_id, nama, perusahaan, asesor_id}]
    status = Column(String(32), nullable=False, default="DRAF")
    created_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    skema = relationship("Skema")
    tuk = relationship("TUK")
    forms = relationship("UjiForm", back_populates="uji", cascade="all, delete-orphan")


class UjiForm(Base):
    __tablename__ = "uji_forms"
    __table_args__ = (
        UniqueConstraint("uji_id", "kode_form", name="uq_uji_kode_form"),
    )

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    uji_id = Column(GUID(), ForeignKey("uji_kompetensis.id"), nullable=False, index=True)
    kode_form = Column(String(32), nullable=False, index=True)
    data_json = Column(JSONType, nullable=False)
    diisi_oleh = Column(String(64), nullable=True)
    divalidasi_oleh = Column(String(64), nullable=True)
    divalidasi_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(16), nullable=False, default="DRAFT")   # DRAFT | DIVALIDASI
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    uji = relationship("UjiKompetensi", back_populates="forms")
