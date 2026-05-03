import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models._types import GUID, JSONType


class Asesor(Base):
    __tablename__ = "asesors"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), unique=True, nullable=False)
    nomor_reg_asesor = Column(String(64), unique=True, nullable=False, index=True)
    nama_lengkap = Column(String(255), nullable=False)
    bidang_kompetensi = Column(JSONType, nullable=False, default=list)
    sertifikat_asesor_url = Column(String(512), nullable=True)
    masa_berlaku = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="asesor")
    permohonans = relationship("Permohonan", back_populates="asesor")
