import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models._types import GUID, JSONType


class FormAK01(Base):
    __tablename__ = "form_ak01s"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    permohonan_id = Column(GUID(), ForeignKey("permohonans.id"), unique=True, nullable=False)
    persetujuan_json = Column(JSONType, nullable=False)
    tanda_tangan_url = Column(String(512), nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class RekamanAsesmen(Base):
    __tablename__ = "rekaman_asesmens"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    permohonan_id = Column(GUID(), ForeignKey("permohonans.id"), unique=True, nullable=False)
    fr_ak02_json = Column(JSONType, nullable=True)
    fr_ak03_json = Column(JSONType, nullable=True)
    fr_ak05_json = Column(JSONType, nullable=True)
    fr_ak06_json = Column(JSONType, nullable=True)
    asesor_id = Column(GUID(), ForeignKey("asesors.id"), nullable=False)
    rekomendasi = Column(String(8), nullable=True)   # "K" atau "BK"
    catatan_akhir = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    permohonan = relationship("Permohonan", back_populates="rekaman_asesmen")
    asesor = relationship("Asesor")
