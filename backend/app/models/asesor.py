import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models._types import GUID, JSONType


class Asesor(Base):
    __tablename__ = "asesors"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), unique=True, nullable=False)
    nama_lengkap = Column(String(255), nullable=False)
    nik = Column(String(32), unique=True, nullable=True, index=True)
    tempat_lahir = Column(String(128), nullable=True)
    tanggal_lahir = Column(Date, nullable=True)
    jenis_kelamin = Column(String(16), nullable=True)  # L / P
    pendidikan = Column(String(64), nullable=True)
    pekerjaan = Column(String(128), nullable=True)
    telepon = Column(String(32), nullable=True)
    # Sertifikat asesor
    nomor_reg_asesor = Column(String(64), unique=True, nullable=False, index=True)
    masa_berlaku = Column(Date, nullable=True)
    sertifikat_asesor_url = Column(String(512), nullable=True)
    # Kompetensi teknis
    bidang_kompetensi = Column(JSONType, nullable=False, default=list)  # list of skema_id / nama
    sertifikat_kompetensi_url = Column(String(512), nullable=True)
    ttd_url = Column(String(512), nullable=True)   # tanda tangan digital, dipakai semua form
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="asesor")
    permohonans = relationship("Permohonan", back_populates="asesor")
