import enum
import uuid

from sqlalchemy import Column, DateTime, Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models._types import GUID


class PermohonanStatus(str, enum.Enum):
    DRAF = "DRAF"
    SUBMITTED = "SUBMITTED"
    DOKUMEN_DIKAJI = "DOKUMEN_DIKAJI"
    DIJADWALKAN = "DIJADWALKAN"
    ASESMEN_BERLANGSUNG = "ASESMEN_BERLANGSUNG"
    KEPUTUSAN_DIBUAT = "KEPUTUSAN_DIBUAT"
    SERTIFIKAT_DITERBITKAN = "SERTIFIKAT_DITERBITKAN"
    SELESAI = "SELESAI"
    DITOLAK = "DITOLAK"
    BANDING = "BANDING"


class JenisPermohonan(str, enum.Enum):
    UJI_SERTIFIKASI = "uji_sertifikasi"
    SERTIFIKASI_ULANG = "sertifikasi_ulang"


class Permohonan(Base):
    __tablename__ = "permohonans"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    asesi_id = Column(GUID(), ForeignKey("asesis.id"), nullable=False, index=True)
    skema_id = Column(GUID(), ForeignKey("skemas.id"), nullable=False, index=True)
    asesor_id = Column(GUID(), ForeignKey("asesors.id"), nullable=True)
    tuk_id = Column(GUID(), ForeignKey("tuks.id"), nullable=True)
    jenis = Column(
        SAEnum(JenisPermohonan, name="jenis_permohonan"),
        nullable=False,
        default=JenisPermohonan.UJI_SERTIFIKASI,
    )
    status = Column(
        SAEnum(PermohonanStatus, name="permohonan_status"),
        nullable=False,
        default=PermohonanStatus.DRAF,
        index=True,
    )
    tanggal_submit = Column(DateTime(timezone=True), nullable=True)
    tanggal_asesmen = Column(DateTime(timezone=True), nullable=True)
    link_video_conference = Column(String(512), nullable=True)
    bukti_bayar_url = Column(String(512), nullable=True)
    catatan_admin = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    asesi = relationship("Asesi", back_populates="permohonans")
    skema = relationship("Skema", back_populates="permohonans")
    asesor = relationship("Asesor", back_populates="permohonans")
    tuk = relationship("TUK", back_populates="permohonans")

    dokumens = relationship("Dokumen", back_populates="permohonan", cascade="all, delete-orphan")
    form_apl01 = relationship("FormAPL01", back_populates="permohonan", uselist=False, cascade="all, delete-orphan")
    form_apl02 = relationship("FormAPL02", back_populates="permohonan", uselist=False, cascade="all, delete-orphan")
    rencana_asesmen = relationship("RencanaAsesmen", back_populates="permohonan", uselist=False, cascade="all, delete-orphan")
    instrumen_asesmens = relationship("InstrumenAsesmen", back_populates="permohonan", cascade="all, delete-orphan")
    rekaman_asesmen = relationship("RekamanAsesmen", back_populates="permohonan", uselist=False, cascade="all, delete-orphan")
    keputusan_sertifikasi = relationship("KeputusanSertifikasi", back_populates="permohonan", uselist=False)
    banding = relationship("Banding", back_populates="permohonan", uselist=False)


class Dokumen(Base):
    __tablename__ = "dokumens"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    permohonan_id = Column(GUID(), ForeignKey("permohonans.id"), nullable=False, index=True)
    jenis = Column(String(64), nullable=False)
    nama_file = Column(String(255), nullable=False)
    url = Column(String(512), nullable=False)
    mime_type = Column(String(128), nullable=True)
    size_bytes = Column(String(32), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    permohonan = relationship("Permohonan", back_populates="dokumens")


class TUK(Base):
    __tablename__ = "tuks"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    lsp_id = Column(GUID(), ForeignKey("lsps.id"), nullable=False)
    nama = Column(String(255), nullable=False)
    jenis = Column(String(32), nullable=False, default="sewaktu")
    alamat = Column(Text, nullable=True)
    kepala_tuk = Column(String(255), nullable=True)
    is_active = Column(String(8), nullable=False, default="aktif")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    permohonans = relationship("Permohonan", back_populates="tuk")
