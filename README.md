# SertifikasiPro

Sistem Informasi Sertifikasi Kompetensi Jarak Jauh untuk LSP berbasis web, sesuai regulasi BNSP SE.007/BNSP/V/2023.

---

## Fitur

| Modul | Deskripsi |
|-------|-----------|
| Portal Publik | Daftar skema sertifikasi, detail skema, verifikasi sertifikat |
| Manajemen Permohonan | Asesi mengajukan permohonan, mengisi FR-APL-01 dan FR-APL-02 |
| Validasi Dokumen | Admin memvalidasi kelengkapan dokumen (setuju / kembalikan) |
| Penjadwalan Asesmen | Admin menugaskan asesor, memilih TUK, menetapkan jadwal dan link video conference |
| Verifikasi Asesor | Asesor meninjau data asesi dan memverifikasi asesmen mandiri (APL-02) |
| Keputusan Sertifikasi | Pimpinan LSP menetapkan hasil K/BK; sertifikat diterbitkan otomatis jika Kompeten |
| Manajemen Skema | Admin mengelola skema sertifikasi LSP |
| Manajemen TUK | Admin mengelola data Tempat Uji Kompetensi |
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

### Cepat (Windows)

Double-click file **`start.bat`** di root project — backend dan frontend akan berjalan otomatis, browser terbuka ke http://localhost:5173.

### Manual

**Backend**

```bash
cd backend
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
python -m scripts.seed
"C:\Program Files\Python310\python.exe" -m uvicorn app.main:app --reload --port 8000
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

Jalankan script berikut untuk membuat akun demo siap pakai:

```bash
cd backend
"C:\Program Files\Python310\python.exe" -m scripts.seed_demo
```

| Email | Password | Role |
|-------|----------|------|
| `asesi@demo.id` | `demo123` | `asesi` |
| `asesor@demo.id` | `demo123` | `asesor` |
| `pimpinan@demo.id` | `demo123` | `pimpinan` |

---

## Alur Proses

```
[Asesi]     Ajukan permohonan → Isi FR-APL-01 → Isi FR-APL-02
                                                       ↓
[Admin]     Validasi dokumen → Assign asesor + TUK + jadwal asesmen
                                                       ↓
[Asesor]    Verifikasi FR-APL-02 saat asesmen berlangsung
                                                       ↓
[Pimpinan]  Tetapkan keputusan (Kompeten / Belum Kompeten)
                                                       ↓
[Sistem]    Sertifikat diterbitkan otomatis jika Kompeten
                                                       ↓
[Publik]    Verifikasi sertifikat via nomor sertifikat
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
