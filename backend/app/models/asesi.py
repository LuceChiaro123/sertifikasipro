import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models._types import GUID


class Asesi(Base):
    __tablename__ = "asesis"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), unique=True, nullable=False)
    nik = Column(String(32), unique=True, nullable=False, index=True)
    nama_lengkap = Column(String(255), nullable=False)
    foto_url = Column(String(512), nullable=True)
    pendidikan = Column(String(64), nullable=True)
    pekerjaan = Column(String(128), nullable=True)
    alamat = Column(Text, nullable=True)
    telepon = Column(String(32), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="asesi")
    permohonans = relationship("Permohonan", back_populates="asesi")
    sertifikats = relationship("Sertifikat", back_populates="asesi")
