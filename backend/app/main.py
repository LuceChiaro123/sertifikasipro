from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.routers import admin, auth, permohonan, portal, skema, tuk, upload, uji


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="SertifikasiPro API",
    description="Sistem Informasi Sertifikasi Kompetensi Jarak Jauh untuk LSP",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.detail, "data": None},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Bersihkan error agar selalu JSON-serializable (ctx bisa berisi objek Exception)
    errors = [
        {
            "loc": list(e.get("loc", [])),
            "msg": str(e.get("msg", "")).replace("Value error, ", ""),
            "type": e.get("type", ""),
        }
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": errors[0]["msg"] if errors else "Validation error",
            "data": {"errors": errors},
        },
    )


@app.get("/")
async def root():
    return {
        "success": True,
        "message": "SertifikasiPro API",
        "data": {"version": "0.1.0", "env": settings.app_env},
    }


@app.get("/health")
async def health():
    return {"success": True, "message": "ok", "data": {"status": "healthy"}}


API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=f"{API_PREFIX}/auth", tags=["auth"])
app.include_router(portal.router, prefix=f"{API_PREFIX}/portal", tags=["portal"])
app.include_router(tuk.router, prefix=f"{API_PREFIX}/tuk", tags=["tuk"])
app.include_router(skema.router, prefix=f"{API_PREFIX}/skema", tags=["skema"])
app.include_router(permohonan.router, prefix=f"{API_PREFIX}/permohonan", tags=["permohonan"])
app.include_router(admin.router, prefix=f"{API_PREFIX}/admin", tags=["admin"])
app.include_router(upload.router, prefix=f"{API_PREFIX}/upload", tags=["upload"])
app.include_router(uji.router, prefix=f"{API_PREFIX}/uji", tags=["uji"])

# Serve uploaded files as static
MEDIA_DIR = Path(__file__).resolve().parent.parent / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")
