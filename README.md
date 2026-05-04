# SertifikasiPro

Sistem Informasi Sertifikasi Kompetensi Jarak Jauh untuk LSP berbasis web, sesuai regulasi BNSP SE.007/BNSP/V/2023.

---

## Fitur

- **Portal Publik** — daftar skema sertifikasi, detail skema, verifikasi sertifikat
- **Manajemen Permohonan** — asesi mengajukan permohonan, mengisi FR-APL-01 dan FR-APL-02
- **Penjadwalan Asesmen** — admin menugaskan asesor, memilih TUK, menetapkan tanggal dan link video conference
- **Verifikasi Asesor** — asesor meninjau data asesi dan memverifikasi asesmen mandiri (APL-02)
- **Manajemen TUK** — admin mengelola data Tempat Uji Kompetensi
- **RBAC** — hak akses berbasis peran: `calon_asesi`, `asesi`, `asesor`, `admin`, `pimpinan`, `superadmin`
- **Autentikasi JWT** — login, refresh token, logout

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy (async), Alembic, SQLite |
| Frontend | React 19, Vite, Tailwind CSS v4, React Query, Zustand |
| Auth | JWT (PyJWT), bcrypt, RBAC middleware |

---

## Cara Menjalankan

### Backend

```bash
cd sertifikasipro/backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload
```

Backend berjalan di: http://localhost:8000  
API Docs: http://localhost:8000/docs

### Frontend

```bash
cd sertifikasipro/frontend
npm install
npm run dev
```

Frontend berjalan di: http://localhost:5173

---

## Akun Default (Seed)

| Email | Password | Role |
|-------|----------|------|
| `admin@sertifikasipro.id` | `admin123` | `superadmin` |

---

## Alur Proses

```
Asesi daftar → Ajukan permohonan → Isi APL-01 & APL-02
     ↓
Admin kaji dokumen → Tugaskan asesor + TUK + jadwal
     ↓
Asesor verifikasi APL-02 → Lakukan asesmen
     ↓
Admin buat keputusan → Terbitkan sertifikat
```

---

## Struktur Proyek

```
sertifikasipro/
├── backend/
│   ├── app/
│   │   ├── models/        # SQLAlchemy models
│   │   ├── routers/       # FastAPI route handlers
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── middleware/    # RBAC, auth
│   │   └── main.py
│   ├── alembic/           # Database migrations
│   └── scripts/           # Seed data
└── frontend/
    └── src/
        ├── pages/         # Admin, Asesi, Asesor, Portal, Pimpinan
        ├── components/    # Shared UI components
        └── services/      # API service layer
```
