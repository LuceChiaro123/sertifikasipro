# SertifikasiPro

Sistem Informasi Sertifikasi Kompetensi Jarak Jauh untuk LSP berbasis web, sesuai regulasi BNSP SE.007/BNSP/V/2023.

---

## Fitur

| Modul | Deskripsi |
|-------|-----------|
| Portal Publik | Daftar skema sertifikasi, detail skema, verifikasi sertifikat |
| Manajemen Permohonan | Asesi mengajukan permohonan, mengisi FR-APL-01 dan FR-APL-02 |
| Penjadwalan Asesmen | Admin menugaskan asesor, memilih TUK, menetapkan jadwal dan link video conference |
| Verifikasi Asesor | Asesor meninjau data asesi dan memverifikasi asesmen mandiri (APL-02) |
| Keputusan & Sertifikat | Admin membuat keputusan K/BK, sertifikat diterbitkan otomatis jika Kompeten |
| Manajemen Skema | Admin mengelola skema sertifikasi LSP |
| Manajemen TUK | Admin mengelola data Tempat Uji Kompetensi |
| Dashboard Pimpinan | Statistik total permohonan, sertifikat aktif, tingkat kelulusan |
| RBAC | Hak akses berbasis peran: `calon_asesi`, `asesi`, `asesor`, `admin`, `pimpinan`, `superadmin` |
| Autentikasi JWT | Login, refresh token, logout |

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Backend | Python 3.10+, FastAPI, SQLAlchemy (async), Alembic, SQLite |
| Frontend | React 19, Vite, Tailwind CSS v4, React Query, Zustand, React Router v7 |
| Auth | JWT (PyJWT), bcrypt, RBAC middleware |

---

## Cara Menjalankan

### Backend

```bash
cd sertifikasipro/backend
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
python -m scripts.seed
python -m uvicorn app.main:app --reload --port 8000
```

Backend: http://localhost:8000  
API Docs: http://localhost:8000/docs

### Frontend

```bash
cd sertifikasipro/frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

---

## Akun

### Akun Default

| Email | Password | Role |
|-------|----------|------|
| `admin@sertifikasipro.id` | `admin123` | `superadmin` |

### Akun Demo

Jalankan script berikut untuk membuat akun demo siap pakai:

```bash
python -m scripts.seed_demo
```

| Email | Password | Role |
|-------|----------|------|
| `asesi@demo.id` | `demo123` | `asesi` |
| `asesor@demo.id` | `demo123` | `asesor` |
| `pimpinan@demo.id` | `demo123` | `pimpinan` |

---

## Alur Proses

```
[Asesi]    Ajukan permohonan → Isi FR-APL-01 → Isi FR-APL-02
                                                      ↓
[Admin]    Kaji dokumen → Assign asesor + TUK + jadwal asesmen
                                                      ↓
[Asesor]   Verifikasi FR-APL-02
                                                      ↓
[Admin]    Buat keputusan (K / BK) → Sertifikat diterbitkan otomatis
                                                      ↓
[Publik]   Verifikasi sertifikat via nomor sertifikat
```

---

## Struktur Proyek

```
sertifikasipro/
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
        ├── components/    # Shared UI components
        ├── services/      # Axios API service layer
        └── store/         # Zustand auth store
```
