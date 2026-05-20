"""Seed akun dan data demo lengkap untuk presentasi.

Akun yang dibuat:
  asesi@demo.id    / demo123  (role: asesi)
  asesor@demo.id   / demo123  (role: asesor)
  pimpinan@demo.id / demo123  (role: pimpinan)

Data demo yang dibuat:
  - 1 permohonan selesai + sertifikat aktif (untuk demo sertifikat)
  - 1 permohonan menunggu keputusan pimpinan
  - 1 permohonan dijadwalkan (untuk demo asesor)
  - 1 permohonan submitted (untuk demo admin validasi)

Usage:
    python -m scripts.seed_demo
"""
import asyncio
import random
import string
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import LSP, User
from app.models.asesi import Asesi
from app.models.asesor import Asesor
from app.models.asesmen import FormAPL01, FormAPL02
from app.models.permohonan import JenisPermohonan, Permohonan, PermohonanStatus
from app.models.rekaman import RekamanAsesmen
from app.models.sertifikat import HasilKeputusan, KeputusanSertifikasi, Sertifikat
from app.routers.auth import get_password_hash

from app.models import Skema  # noqa


def _rand_cert():
    chars = string.ascii_uppercase + string.digits
    return "LSP-" + "".join(random.choices(chars, k=4)) + "-" + "".join(random.choices(string.digits, k=6))


async def seed_demo() -> None:
    async with AsyncSessionLocal() as db:
        # Ambil LSP yang sudah ada
        result = await db.execute(select(LSP).limit(1))
        lsp = result.scalar_one_or_none()
        if not lsp:
            print("ERROR: Jalankan 'python -m scripts.seed' terlebih dahulu.")
            return

        # Ambil skema pertama
        skema_result = await db.execute(select(Skema).where(Skema.lsp_id == lsp.id).limit(1))
        skema = skema_result.scalar_one_or_none()
        if not skema:
            print("ERROR: Tidak ada skema ditemukan. Jalankan seed terlebih dahulu.")
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
            await db.flush()
            print("  + asesi@demo.id (Budi Santoso) created")
        else:
            print("  = asesi@demo.id exists")

        # Ambil profile asesi
        asesi_profile_result = await db.execute(
            select(Asesi).join(User).where(User.email == "asesi@demo.id")
        )
        asesi_profile = asesi_profile_result.scalar_one_or_none()

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
            await db.flush()
            print("  + asesor@demo.id (Dr. Sari Dewi) created")
        else:
            print("  = asesor@demo.id exists")

        # Ambil profile asesor
        asesor_profile_result = await db.execute(
            select(Asesor).join(User).where(User.email == "asesor@demo.id")
        )
        asesor_profile = asesor_profile_result.scalar_one_or_none()

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
            await db.flush()
            print("  + pimpinan@demo.id created")
        else:
            print("  = pimpinan@demo.id exists")

        await db.flush()

        # ── Data Demo Permohonan ──────────────────────────────────────
        if asesi_profile is None:
            print("ERROR: Profil asesi tidak ditemukan, skip demo permohonan")
            await db.commit()
            return

        # Cek permohonan yang sudah ada
        existing_perms = await db.execute(
            select(Permohonan).where(Permohonan.asesi_id == asesi_profile.id)
        )
        existing_count = len(existing_perms.scalars().all())
        print(f"  Permohonan demo yang sudah ada: {existing_count}")

        if existing_count < 3:
            print("  Membuat data demo permohonan...")

            # [1] Permohonan SELESAI dengan Sertifikat ──────────────────
            perm1 = Permohonan(
                asesi_id=asesi_profile.id,
                skema_id=skema.id,
                asesor_id=asesor_profile.id if asesor_profile else None,
                jenis=JenisPermohonan.UJI_SERTIFIKASI,
                status=PermohonanStatus.SERTIFIKAT_DITERBITKAN,
                tanggal_submit=datetime.now(timezone.utc) - timedelta(days=30),
                tanggal_asesmen=datetime.now(timezone.utc) - timedelta(days=10),
                link_video_conference="https://zoom.us/j/demo123",
            )
            db.add(perm1)
            await db.flush()

            # APL01 for perm1
            apl01_1 = FormAPL01(
                permohonan_id=perm1.id,
                data_json={
                    "nama_lengkap": "Budi Santoso",
                    "nik": "3201234567890001",
                    "tempat_lahir": "Jakarta",
                    "tanggal_lahir": "1995-03-15",
                    "jenis_kelamin": "L",
                    "pendidikan": "SMK Jurusan TKJ",
                    "pekerjaan": "Network Technician",
                    "telepon": "081234567890",
                    "email": "asesi@demo.id",
                    "alamat": "Jl. Sudirman No. 10, Jakarta",
                    "tujuan_sertifikasi": "sertifikasi_baru",
                },
            )
            db.add(apl01_1)

            # APL02 for perm1 (verified)
            apl02_1 = FormAPL02(
                permohonan_id=perm1.id,
                hasil_mandiri_json={
                    "units": [
                        {"kode": "J.611000.001.01", "nama": "Merancang Pengalamatan Jaringan", "hasil": "K", "bukti": "Sertifikat pelatihan CCNA"},
                        {"kode": "J.611000.002.02", "nama": "Memasang Jaringan Nirkabel", "hasil": "K", "bukti": "Portofolio instalasi jaringan"},
                    ]
                },
                catatan_asesor="Asesi telah menunjukkan kompetensi yang memadai",
                verified_by_asesor_id=asesor_profile.id if asesor_profile else None,
                verified_at=datetime.now(timezone.utc) - timedelta(days=11),
            )
            db.add(apl02_1)

            # Rekaman Asesmen (recommendation)
            if asesor_profile:
                rekaman1 = RekamanAsesmen(
                    permohonan_id=perm1.id,
                    asesor_id=asesor_profile.id,
                    rekomendasi="K",
                    catatan_akhir="Asesi menguasai semua unit kompetensi dengan baik. Direkomendasikan Kompeten.",
                )
                db.add(rekaman1)

            # Keputusan + Sertifikat
            keputusan1 = KeputusanSertifikasi(
                permohonan_id=perm1.id,
                hasil=HasilKeputusan.K,
                catatan="Rapat pleno menetapkan asesi KOMPETEN pada semua unit.",
                diputuskan_oleh=pimpinan_user.id,
            )
            db.add(keputusan1)
            await db.flush()

            nomor = _rand_cert()
            sert1 = Sertifikat(
                asesi_id=asesi_profile.id,
                skema_id=skema.id,
                permohonan_id=perm1.id,
                nomor_sertifikat=nomor,
                tanggal_terbit=date.today() - timedelta(days=5),
                tanggal_berakhir=date.today() + timedelta(days=3 * 365),
                file_url="",
                is_active=True,
            )
            db.add(sert1)
            print(f"  + Permohonan SERTIFIKAT_DITERBITKAN (nomor: {nomor})")

            # [2] Permohonan KEPUTUSAN_DIBUAT — menunggu Pimpinan ──────
            perm2 = Permohonan(
                asesi_id=asesi_profile.id,
                skema_id=skema.id,
                asesor_id=asesor_profile.id if asesor_profile else None,
                jenis=JenisPermohonan.UJI_SERTIFIKASI,
                status=PermohonanStatus.KEPUTUSAN_DIBUAT,
                tanggal_submit=datetime.now(timezone.utc) - timedelta(days=15),
                tanggal_asesmen=datetime.now(timezone.utc) - timedelta(days=3),
                link_video_conference="https://zoom.us/j/demo456",
            )
            db.add(perm2)
            await db.flush()

            apl01_2 = FormAPL01(
                permohonan_id=perm2.id,
                data_json={
                    "nama_lengkap": "Budi Santoso",
                    "nik": "3201234567890001",
                    "tempat_lahir": "Jakarta",
                    "tanggal_lahir": "1995-03-15",
                    "jenis_kelamin": "L",
                    "pendidikan": "SMK Jurusan TKJ",
                    "pekerjaan": "Network Technician",
                    "telepon": "081234567890",
                    "email": "asesi@demo.id",
                    "alamat": "Jl. Sudirman No. 10, Jakarta",
                    "tujuan_sertifikasi": "sertifikasi_ulang",
                },
            )
            db.add(apl01_2)

            apl02_2 = FormAPL02(
                permohonan_id=perm2.id,
                hasil_mandiri_json={
                    "units": [
                        {"kode": "J.611000.001.01", "nama": "Merancang Pengalamatan Jaringan", "hasil": "K", "bukti": "Portofolio desain jaringan"},
                        {"kode": "J.611000.002.02", "nama": "Memasang Jaringan Nirkabel", "hasil": "BK", "bukti": "Perlu peningkatan"},
                    ]
                },
                verified_by_asesor_id=asesor_profile.id if asesor_profile else None,
                verified_at=datetime.now(timezone.utc) - timedelta(days=4),
            )
            db.add(apl02_2)

            if asesor_profile:
                rekaman2 = RekamanAsesmen(
                    permohonan_id=perm2.id,
                    asesor_id=asesor_profile.id,
                    rekomendasi="BK",
                    catatan_akhir="Masih terdapat unit kompetensi yang belum memenuhi standar. Direkomendasikan Belum Kompeten.",
                )
                db.add(rekaman2)
            print("  + Permohonan KEPUTUSAN_DIBUAT (menunggu pimpinan)")

            # [3] Permohonan DIJADWALKAN — menunggu asesmen ─────────────
            perm3 = Permohonan(
                asesi_id=asesi_profile.id,
                skema_id=skema.id,
                asesor_id=asesor_profile.id if asesor_profile else None,
                jenis=JenisPermohonan.UJI_SERTIFIKASI,
                status=PermohonanStatus.DIJADWALKAN,
                tanggal_submit=datetime.now(timezone.utc) - timedelta(days=5),
                tanggal_asesmen=datetime.now(timezone.utc) + timedelta(days=2),
                link_video_conference="https://zoom.us/j/demo789",
            )
            db.add(perm3)
            await db.flush()

            apl01_3 = FormAPL01(
                permohonan_id=perm3.id,
                data_json={
                    "nama_lengkap": "Budi Santoso",
                    "nik": "3201234567890001",
                    "tempat_lahir": "Jakarta",
                    "tanggal_lahir": "1995-03-15",
                    "jenis_kelamin": "L",
                    "pendidikan": "SMK Jurusan TKJ",
                    "pekerjaan": "Network Technician",
                    "telepon": "081234567890",
                    "email": "asesi@demo.id",
                    "alamat": "Jl. Sudirman No. 10, Jakarta",
                    "tujuan_sertifikasi": "sertifikasi_baru",
                },
            )
            db.add(apl01_3)

            apl02_3 = FormAPL02(
                permohonan_id=perm3.id,
                hasil_mandiri_json={
                    "units": [
                        {"kode": "J.611000.001.01", "nama": "Merancang Pengalamatan Jaringan", "hasil": "K", "bukti": "Pengalaman kerja 2 tahun"},
                    ]
                },
            )
            db.add(apl02_3)
            print("  + Permohonan DIJADWALKAN (asesmen 2 hari lagi)")

        else:
            print("  Data demo permohonan sudah cukup, skip")

        await db.commit()
        print("\n" + "=" * 50)
        print("Demo siap! Akun:")
        print("  asesi@demo.id    / demo123  (asesi)")
        print("  asesor@demo.id   / demo123  (asesor)")
        print("  pimpinan@demo.id / demo123  (pimpinan)")
        print("  admin@sertifikasipro.id / admin123  (superadmin)")
        print("=" * 50)


if __name__ == "__main__":
    asyncio.run(seed_demo())
