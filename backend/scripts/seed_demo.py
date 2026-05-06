"""Seed demo accounts for presentation.

Accounts created:
  asesi@demo.id   / demo123  (role: asesi)
  asesor@demo.id  / demo123  (role: asesor)
  pimpinan@demo.id / demo123 (role: pimpinan)

Usage:
    python -m scripts.seed_demo
"""
import asyncio

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import LSP, User
from app.models.asesi import Asesi
from app.models.asesor import Asesor
from app.routers.auth import get_password_hash


async def seed_demo() -> None:
    async with AsyncSessionLocal() as db:
        # Ambil LSP yang sudah ada
        result = await db.execute(select(LSP).limit(1))
        lsp = result.scalar_one_or_none()
        if not lsp:
            print("ERROR: Jalankan 'python -m scripts.seed' terlebih dahulu.")
            return

        # ── Asesi ─────────────────────────────────────────────────────
        result = await db.execute(select(User).where(User.email == "asesi@demo.id"))
        asesi_user = result.scalar_one_or_none()
        if asesi_user is None:
            asesi_user = User(
                email="asesi@demo.id",
                password_hash=get_password_hash("demo123"),
                role="asesi",
                lsp_id=lsp.id,
                is_active=True,
            )
            db.add(asesi_user)
            await db.flush()

            asesi_profile = Asesi(
                user_id=asesi_user.id,
                nik="3201234567890001",
                nama_lengkap="Budi Santoso",
                pendidikan="SMK Jurusan Teknik Komputer Jaringan",
                pekerjaan="Network Technician",
                telepon="081234567890",
                alamat="Jl. Sudirman No. 10, Jakarta Pusat",
            )
            db.add(asesi_profile)
            print("  + asesi@demo.id (Budi Santoso) created")
        else:
            print("  = asesi@demo.id exists")

        # ── Asesor ────────────────────────────────────────────────────
        result = await db.execute(select(User).where(User.email == "asesor@demo.id"))
        asesor_user = result.scalar_one_or_none()
        if asesor_user is None:
            asesor_user = User(
                email="asesor@demo.id",
                password_hash=get_password_hash("demo123"),
                role="asesor",
                lsp_id=lsp.id,
                is_active=True,
            )
            db.add(asesor_user)
            await db.flush()

            asesor_profile = Asesor(
                user_id=asesor_user.id,
                nomor_reg_asesor="MET.000.001234 2023",
                nama_lengkap="Dr. Sari Dewi, M.T.",
                bidang_kompetensi=["Telekomunikasi", "Jaringan Komputer"],
            )
            db.add(asesor_profile)
            print("  + asesor@demo.id (Dr. Sari Dewi) created")
        else:
            print("  = asesor@demo.id exists")

        # ── Pimpinan ──────────────────────────────────────────────────
        result = await db.execute(select(User).where(User.email == "pimpinan@demo.id"))
        pimpinan_user = result.scalar_one_or_none()
        if pimpinan_user is None:
            pimpinan_user = User(
                email="pimpinan@demo.id",
                password_hash=get_password_hash("demo123"),
                role="pimpinan",
                lsp_id=lsp.id,
                is_active=True,
            )
            db.add(pimpinan_user)
            print("  + pimpinan@demo.id created")
        else:
            print("  = pimpinan@demo.id exists")

        await db.commit()
        print("\nDemo accounts ready:")
        print("  asesi@demo.id    / demo123")
        print("  asesor@demo.id   / demo123")
        print("  pimpinan@demo.id / demo123")
        print("  admin@sertifikasipro.id / admin123")


if __name__ == "__main__":
    asyncio.run(seed_demo())
