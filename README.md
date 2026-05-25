# SertifikasiPro

Sistem Informasi Sertifikasi Kompetensi Jarak Jauh untuk LSP berbasis web, sesuai regulasi BNSP SE.007/BNSP/V/2023.

---

## Fitur

| Modul | Deskripsi |
|-------|-----------|
| Portal Publik | Daftar skema sertifikasi, detail skema, verifikasi sertifikat |
| Manajemen Permohonan | Asesi mengajukan permohonan, mengisi FR-APL-01 dan FR-APL-02, upload KTP/foto/ijazah |
| Validasi Dokumen | Admin memvalidasi kelengkapan dokumen (setuju / kembalikan) |
| Penjadwalan Asesmen | Admin menugaskan asesor, memilih TUK, menetapkan jadwal dan link video conference |
| Verifikasi Asesor | Asesor meninjau data asesi, verifikasi APL-02, tandai asesmen berlangsung |
| Form Proses Asesmen (BNSP) | Form buku kerja BNSP yang diisi saat asesmen: FR.AK.01/02/03/05/07, FR.IA.04A/04B/06 (sebagian kolaboratif asesi+asesor) |
| Rekaman Asesmen | Asesor mengisi FR.AK — rekaman asesmen dan rekomendasi K/BK |
| Keputusan Pleno | Pimpinan LSP menetapkan hasil K/BK, upload SK Komite & Berita Acara |
| E-Sertifikat | Sertifikat digital diterbitkan otomatis jika Kompeten, tampil di portal asesi |
| Modul Banding | Asesi BK dapat mengajukan banding; Pimpinan memproses keputusan banding |
| Manajemen Skema | Admin mengelola skema sertifikasi LSP |
| Manajemen TUK | Admin mengelola data Tempat Uji Kompetensi |
| Manajemen Asesor | Admin mengelola data asesor beserta dokumen sertifikat kompetensi |
| Manajemen User | Admin membuat akun user dan mengelola status aktif |
| Dashboard Pimpinan | Statistik total permohonan, sertifikat aktif, tingkat kelulusan |
| RBAC | Hak akses berbasis peran: `calon_asesi`, `asesi`, `asesor`, `admin`, `pimpinan`, `superadmin` |
| Autentikasi JWT | Login, refresh token, logout |

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Backend | Python 3.10, FastAPI, SQLAlchemy (async), Alembic, SQLite |
| Frontend | React 19, Vite, Tailwind CSS v4, React Query, Zustand, React Router v7 |
| Auth | JWT (PyJWT), bcrypt, RBAC middleware |

---

## Cara Menjalankan

### Prasyarat

| Kebutuhan | Versi | Download |
|-----------|-------|----------|
| Python | 3.9+ | https://www.python.org/downloads/ |
| Node.js | 18+ | https://nodejs.org/ |

> **Tips:** Saat install Python di Windows, centang **"Add Python to PATH"**.

### Cepat (Windows) — Direkomendasikan

Double-click **`start.bat`** di root project. Script ini otomatis:
1. Mendeteksi Python & Node.js di sistem
2. Membuat file `.env` (konfigurasi database SQLite)
3. Menginstall dependencies backend & frontend jika belum ada
4. Menginisialisasi database jika baru pertama kali
5. Menjalankan kedua server dan membuka browser

### Manual

**Backend**
```bash
cd backend
pip install -r requirements.txt

# Buat file konfigurasi
echo DATABASE_URL=sqlite+aiosqlite:///./dev.db > .env
echo SECRET_KEY=sertifikasipro-dev-secret-key-min-32-chars-long >> .env
echo CORS_ORIGINS=http://localhost:5173 >> .env
echo APP_ENV=development >> .env

# Inisialisasi database & seed
python -m scripts.init_db
python -m scripts.seed

# Jalankan server
python -m uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

| Server | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

---

## Akun

### Akun Default

| Email | Password | Role |
|-------|----------|------|
| `admin@sertifikasipro.id` | `admin123` | `superadmin` |

### Akun Demo

Jalankan script berikut untuk membuat akun demo siap pakai **beserta data lengkap**:

```bash
cd backend
"C:\Program Files\Python310\python.exe" -m scripts.seed_demo
```

| Email | Password | Role |
|-------|----------|------|
| `asesi@demo.id` | `demo123` | `asesi` |
| `asesor@demo.id` | `demo123` | `asesor` |
| `pimpinan@demo.id` | `demo123` | `pimpinan` |

Script ini juga membuat data demo permohonan dengan berbagai status:
- **SERTIFIKAT_DITERBITKAN** — demo E-Sertifikat di dashboard asesi
- **KEPUTUSAN_DIBUAT** — demo alur Pimpinan tetapkan keputusan
- **DIJADWALKAN** — demo alur asesor mulai asesmen

---

## Alur Proses

```
[Asesi]     Ajukan permohonan → Isi FR-APL-01 → Isi FR-APL-02 → Upload dokumen (KTP, Foto, Ijazah)
                                                                           ↓
[Admin]     Validasi dokumen → Assign asesor + TUK + jadwal + link Zoom
                                                                           ↓
[Asesor]    Tandai asesmen berlangsung → Verifikasi APL-02 → Isi FR.AK (rekaman + rekomendasi K/BK)
                                                                           ↓
[Pimpinan]  Lihat rekomendasi asesor → Tetapkan keputusan pleno (K / BK) → Upload SK + Berita Acara
                                                                           ↓
[Sistem]    Jika Kompeten → Sertifikat digital diterbitkan otomatis
            Jika Belum Kompeten → Asesi dapat mengajukan banding
                                                                           ↓
[Asesi]     Lihat E-Sertifikat di dashboard | Ajukan banding jika BK
                                                                           ↓
[Publik]    Verifikasi sertifikat via nomor sertifikat di portal
```

---

## Struktur Proyek

```
sertifikasipro/
├── start.bat              # Jalankan backend + frontend sekaligus (Windows)
├── backend/
│   ├── app/
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── routers/       # FastAPI route handlers
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── middleware/    # RBAC, JWT auth
│   │   └── main.py        # App entry point, CORS, router registration
│   ├── alembic/           # Database migrations
│   └── scripts/           # Seed scripts
└── frontend/
    └── src/
        ├── pages/         # Admin, Asesi, Asesor, Pimpinan, Portal, Auth
        ├── components/    # Shared UI components (Logo, Sidebar, Navbar, ...)
        ├── services/      # Axios API service layer
        └── store/         # Zustand auth store
```
