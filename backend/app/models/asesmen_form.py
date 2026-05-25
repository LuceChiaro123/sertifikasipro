"""Generic JSON form store untuk form-form proses asesmen (BNSP).

Satu baris per (permohonan, kode_form). Tiap form (FR.AK.01, FR.AK.02, dst)
disimpan sebagai JSON di `data_json`. Pendekatan generik ini menghindari
pembuatan tabel terpisah untuk tiap form.
"""
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models._types import GUID, JSONType


class AsesmenForm(Base):
    __tablename__ = "asesmen_forms"
    __table_args__ = (
        UniqueConstraint("permohonan_id", "kode_form", name="uq_permohonan_kode_form"),
    )

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    permohonan_id = Column(GUID(), ForeignKey("permohonans.id"), nullable=False, index=True)
    kode_form = Column(String(32), nullable=False, index=True)   # mis. "FR.AK.01"
    data_json = Column(JSONType, nullable=False)
    diisi_oleh = Column(String(64), nullable=True)               # role/email pengisi
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    permohonan = relationship("Permohonan")
