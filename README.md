# SertifikasiPro

Sistem Informasi Sertifikasi Kompetensi Jarak Jauh untuk LSP — Capstone Project STSI4440.

## Status pembangunan

**Fase 1 (Fondasi)** — selesai:

- Struktur proyek + Docker Compose
- Model database lengkap (User, LSP, Skema, Asesi, Asesor, TUK, Permohonan, Dokumen, formulir BNSP, Rekaman, Keputusan, Sertifikat, Banding, AuditLog)
- Alembic migrations
- Auth: register, login, refresh, logout, `/me` (JWT + bcrypt)
- Middleware RBAC (`require_role`)
- Portal publik: list LSP, list/detail skema, verifikasi sertifikat

Fase 2 (Permohonan + form APL/MAPA), Fase 3 (asesmen + sertifikat),
Fase 4 (dashboard) belum diimplementasikan.

## Quick start (Docker)

```bash
cd sertifikasipro
docker-compose up -d db
docker-compose up backend
```

Lalu di shell terpisah:

```bash
docker-compose exec backend alembic revision --autogenerate -m "init"
docker-compose exec backend alembic upgrade head
docker-compose exec backend python -m scripts.seed
```

## Quick start (lokal tanpa Docker)

```bash
cd sertifikasipro/backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env          # edit DATABASE_URL kalau perlu
alembic revision --autogenerate -m "init"
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

## Akun seed

- Email: `admin@sertifikasipro.id`
- Password: `admin123`
- Role: `superadmin`

## Struktur

Lihat `CLAUDE.md` untuk arsitektur lengkap, alur proses BNSP, dan
daftar formulir resmi yang harus diimplementasikan.
