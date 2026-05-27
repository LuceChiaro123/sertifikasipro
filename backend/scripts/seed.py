"""Seed initial LSP, admin user, sample skema.

Usage:
    python -m scripts.seed
"""
import asyncio
from decimal import Decimal

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import LSP, Skema, User
from app.routers.auth import get_password_hash


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(LSP).where(LSP.nomor_lisensi == "BNSP-LSP-TDI-001"))
        lsp = result.scalar_one_or_none()
        if lsp is None:
            lsp = LSP(
                nama="LSP Telekomunikasi Digital Indonesia",
                nomor_lisensi="BNSP-LSP-TDI-001",
                ruang_lingkup="Telekomunikasi Digital",
                alamat="Jakarta, Indonesia",
                is_active=True,
            )
            db.add(lsp)
            await db.flush()
            print(f"  + LSP created: {lsp.nama}")
        else:
            print(f"  = LSP exists: {lsp.nama}")

        result = await db.execute(select(User).where(User.email == "admin@sertifikasipro.id"))
        admin = result.scalar_one_or_none()
        if admin is None:
            admin = User(
                email="admin@sertifikasipro.id",
                password_hash=get_password_hash("admin123"),
                role="superadmin",
                lsp_id=lsp.id,
                is_active=True,
            )
            db.add(admin)
            print("  + admin@sertifikasipro.id created (password: admin123)")
        else:
            print("  = admin user exists")

        result = await db.execute(select(Skema).where(Skema.kode == "SKM/TIK/001"))
        if result.scalar_one_or_none() is None:
            db.add(
                Skema(
                    lsp_id=lsp.id,
                    kode="SKM/TIK/001",
                    nama="Junior Network Administrator",
                    biaya=Decimal("1500000.00"),
                    unit_kompetensi=[
                        {
                            "kode": "J.611000.001.01",
                            "nama": "Merancang Pengalamatan Jaringan",
                            "elemen": [
                                {"nama": "Menentukan kebutuhan pengalamatan jaringan",
                                 "kuk": ["Kebutuhan IP address diidentifikasi sesuai topologi",
                                         "Jumlah host per segmen ditentukan",
                                         "Kebutuhan subnet dianalisis sesuai rancangan"]},
                                {"nama": "Membuat rancangan pengalamatan",
                                 "kuk": ["Subnet dirancang sesuai kebutuhan jaringan",
                                         "Alokasi IP address didokumentasikan"]},
                            ],
                        },
                        {
                            "kode": "J.611000.002.02",
                            "nama": "Memasang Jaringan Nirkabel",
                            "elemen": [
                                {"nama": "Menyiapkan perangkat jaringan nirkabel",
                                 "kuk": ["Perangkat access point disiapkan sesuai spesifikasi",
                                         "Konfigurasi dasar perangkat ditentukan"]},
                                {"nama": "Mengonfigurasi jaringan nirkabel",
                                 "kuk": ["SSID dan parameter keamanan dikonfigurasi",
                                         "Koneksi jaringan nirkabel diuji"]},
                            ],
                        },
                    ],
                    persyaratan=[
                        "Pendidikan minimal SMK Jurusan TKJ atau setara",
                        "Pengalaman kerja minimal 1 tahun di bidang jaringan",
                        "Sertifikat pelatihan terkait (jika ada)",
                    ],
                    is_ajj_approved=True,
                )
            )
            print("  + Skema 'Junior Network Administrator' created")

        await db.commit()
        print("\nDone.")


if __name__ == "__main__":
    asyncio.run(seed())
