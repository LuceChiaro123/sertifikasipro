"""Pembuatan e-Sertifikat Kompetensi (PDF) — mereplikasi format resmi BNSP.

2 halaman, bilingual (Indonesia / English):
  Hal 1: sampul (kop BNSP, judul, nomor, nama pemegang, bidang/kualifikasi,
         masa berlaku, nama LSP, TTD Ketua).
  Hal 2: Daftar Unit Kompetensi (tabel) + foto 3x4 + TTD pemilik & Manajer.

Data diambil dari DB (asesi, skema, lsp). Field yang tak tersedia di DB
(Ketua/Manajer/No.Reg/kota) memakai default yang mudah diganti.
"""
from __future__ import annotations

import io
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle

PAGE_W, PAGE_H = A4  # 595 x 842 pt
MEDIA_DIR = Path(__file__).resolve().parent.parent.parent / "media"

NAVY = colors.HexColor("#1e3a8a")
GRAY = colors.HexColor("#475569")
LIGHT = colors.HexColor("#94a3b8")

BULAN_ID = [
    "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]


def _fmt_tanggal(d: date | None) -> str:
    if not d:
        return "-"
    return f"{d.day} {BULAN_ID[d.month]} {d.year}"


def _media_path(url: str | None) -> str | None:
    """Resolusi URL '/media/xxx' → file lokal di MEDIA_DIR (None jika tak ada)."""
    if not url:
        return None
    name = str(url).replace("\\", "/").split("/")[-1]
    p = MEDIA_DIR / name
    return str(p) if p.exists() else None


def _terbilang_tahun(n: int) -> str:
    kata = {1: "satu", 2: "dua", 3: "tiga", 4: "empat", 5: "lima"}.get(n, str(n))
    return f"{n} ({kata}) tahun"


# ── helper gambar teks ──────────────────────────────────────────────────
def _center_para(c, text, y, *, size=11, leading=None, bold=False, italic=False,
                 color=colors.black, width=PAGE_W - 80):
    font = "Helvetica"
    if bold and italic:
        font = "Helvetica-BoldOblique"
    elif bold:
        font = "Helvetica-Bold"
    elif italic:
        font = "Helvetica-Oblique"
    if leading is None:
        leading = size * 1.25
    style = ParagraphStyle("c", fontName=font, fontSize=size, leading=leading,
                           alignment=1, textColor=color)
    p = Paragraph(text, style)
    w, h = p.wrap(width, 1000)
    p.drawOn(c, (PAGE_W - width) / 2, y - h)
    return y - h


# ════════════════════════════════════════════════════════════════════════
# Halaman 1 — Sampul
# ════════════════════════════════════════════════════════════════════════
def _page1(c, d: dict):
    # bingkai dekoratif
    c.setStrokeColor(NAVY)
    c.setLineWidth(2)
    c.rect(22, 22, PAGE_W - 44, PAGE_H - 44)
    c.setLineWidth(0.5)
    c.rect(28, 28, PAGE_W - 56, PAGE_H - 56)

    y = PAGE_H - 70
    # Kop BNSP
    y = _center_para(c, "BADAN NASIONAL SERTIFIKASI PROFESI", y, size=13, bold=True, color=NAVY)
    y = _center_para(c, "<i>Indonesian Professional Certification Authority</i>", y - 2, size=9, color=GRAY)

    # Judul
    y -= 24
    y = _center_para(c, "SERTIFIKAT KOMPETENSI", y, size=24, bold=True, color=NAVY)
    y = _center_para(c, "<i>Certificate of Competence</i>", y - 2, size=12, color=GRAY)

    y -= 16
    y = _center_para(c, f"No. {d['nomor']}", y, size=11)

    y -= 18
    y = _center_para(c, "Dengan ini menyatakan bahwa, <i>This is to certify that,</i>", y, size=10, color=GRAY)

    # Nama pemegang
    y -= 10
    y = _center_para(c, f"<b>{d['nama']}</b>", y, size=22, bold=True)

    y -= 6
    y = _center_para(c, f"No. Reg. {d['no_reg']}", y, size=10, color=GRAY)

    y -= 16
    y = _center_para(c, "Telah kompeten pada bidang: <i>has been competence in the area of:</i>", y, size=10, color=GRAY)
    y = _center_para(c, f"<b><i>{d['bidang']}</i></b>", y - 4, size=12)

    y -= 14
    y = _center_para(c, "Dengan Kualifikasi/Kompetensi: <i>With Qualification/Competency:</i>", y, size=10, color=GRAY)
    y = _center_para(c, f"<b>{d['kualifikasi']}</b>", y - 4, size=12, color=NAVY)

    y -= 16
    y = _center_para(c, f"Sertifikat ini berlaku untuk {d['masa']}", y, size=10)
    y = _center_para(c, f"<i>This certificate is valid for {d['masa_en']}</i>", y - 2, size=9, color=GRAY)

    # Tempat & tanggal + penerbit
    y -= 26
    y = _center_para(c, f"{d['kota']}, {d['tanggal']}", y, size=10)
    y = _center_para(c, "Atas Nama Badan Nasional Sertifikasi Profesi", y - 4, size=9, color=GRAY)
    y = _center_para(c, "<i>On Behalf of Indonesian Professional Certification Authority</i>", y - 1, size=8, color=GRAY)
    y = _center_para(c, f"<b>{d['lsp_nama']}</b>", y - 3, size=10)

    # Blok tanda tangan Ketua
    sig_y = 120
    ttd = _media_path(d.get("ketua_ttd"))
    if ttd:
        try:
            c.drawImage(ttd, PAGE_W / 2 - 45, sig_y, width=90, height=45,
                        preserveAspectRatio=True, mask="auto")
        except Exception:
            pass
    c.setStrokeColor(colors.black)
    c.setLineWidth(0.7)
    c.line(PAGE_W / 2 - 80, sig_y - 2, PAGE_W / 2 + 80, sig_y - 2)
    _center_para(c, f"<b>{d['ketua_nama']}</b>", sig_y - 4, size=10)
    _center_para(c, "Ketua / <i>Chairman</i>", sig_y - 18, size=9, color=GRAY)


# ════════════════════════════════════════════════════════════════════════
# Halaman 2 — Daftar Unit Kompetensi
# ════════════════════════════════════════════════════════════════════════
def _page2(c, d: dict):
    y = PAGE_H - 60
    y = _center_para(c, "<b>Daftar Unit Kompetensi</b>", y, size=15, bold=True)
    y = _center_para(c, "<i>List of Unit(s) of Competency</i>", y - 2, size=11, color=GRAY)

    # Tabel unit
    cell = ParagraphStyle("cell", fontName="Helvetica", fontSize=9, leading=11)
    head = ParagraphStyle("head", fontName="Helvetica-Bold", fontSize=9, leading=11, alignment=1, textColor=colors.white)
    data = [[
        Paragraph("NO", head),
        Paragraph("Kode Unit Kompetensi<br/><i>Code of Competency Unit</i>", head),
        Paragraph("Judul Unit Kompetensi<br/><i>Title of Competency Unit</i>", head),
    ]]
    for i, u in enumerate(d["units"], 1):
        data.append([
            Paragraph(str(i), ParagraphStyle("n", parent=cell, alignment=1)),
            Paragraph(u.get("kode", "-"), ParagraphStyle("k", parent=cell, alignment=1)),
            Paragraph(u.get("judul", "-"), cell),
        ])
    if not d["units"]:
        data.append([Paragraph("-", cell), Paragraph("-", cell), Paragraph("Belum ada unit kompetensi", cell)])

    tbl = Table(data, colWidths=[28, 150, PAGE_W - 80 - 28 - 150])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GRAY),
        ("GRID", (0, 0), (-1, -1), 0.5, LIGHT),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    tw, th = tbl.wrap(PAGE_W - 80, PAGE_H)
    tbl.drawOn(c, 40, y - 16 - th)

    # Blok bawah: tempat/tanggal + LSP (kanan), foto+ttd pemilik (kiri), manajer (kanan)
    base = 150
    _center_para(c, f"{d['kota']}, {d['tanggal']}", base + 70, size=10, width=PAGE_W - 80)
    _center_para(c, f"<b>{d['lsp_nama']}</b>", base + 54, size=9, width=PAGE_W - 80)

    # Foto 3x4 (kiri)
    foto = _media_path(d.get("foto"))
    fx, fy = 55, base - 10
    if foto:
        try:
            c.drawImage(foto, fx, fy, width=70, height=93, preserveAspectRatio=True, mask="auto")
        except Exception:
            foto = None
    if not foto:
        c.setStrokeColor(LIGHT)
        c.setDash(2, 2)
        c.rect(fx, fy, 70, 93)
        c.setDash()
        c.setFont("Helvetica-Oblique", 7)
        c.setFillColor(LIGHT)
        c.drawCentredString(fx + 35, fy + 46, "Foto 3x4")
        c.setFillColor(colors.black)

    # TTD pemilik (kiri, di kanan foto)
    hx = fx + 95
    ttdp = _media_path(d.get("ttd_pemilik"))
    if ttdp:
        try:
            c.drawImage(ttdp, hx, base + 6, width=80, height=40, preserveAspectRatio=True, mask="auto")
        except Exception:
            pass
    c.setStrokeColor(colors.black)
    c.setLineWidth(0.6)
    c.line(hx, base, hx + 150, base)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(hx, base - 12, d["nama"])
    c.setFont("Helvetica", 8)
    c.setFillColor(GRAY)
    c.drawString(hx, base - 24, "Tanda Tangan Pemilik / Signature of Holder")
    c.setFillColor(colors.black)

    # Manajer Sertifikasi (kanan)
    mx = PAGE_W - 220
    c.line(mx, base - 2, mx + 150, base - 2)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(mx, base - 14, d["manajer_nama"])
    c.setFont("Helvetica", 8)
    c.setFillColor(GRAY)
    c.drawString(mx, base - 26, "Manajer Sertifikasi / Certification Manager")
    c.setFillColor(colors.black)


def build_sertifikat_pdf(d: dict) -> bytes:
    """Bangun PDF 2 halaman dari dict data. Kembalikan bytes."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    _page1(c, d)
    c.showPage()
    _page2(c, d)
    c.showPage()
    c.save()
    return buf.getvalue()


# ── Assembly data dari DB ────────────────────────────────────────────────
async def assemble_sertifikat_data(db, permohonan, sertifikat) -> dict:
    """Kumpulkan data sertifikat dari permohonan + objek Sertifikat.

    Mengandalkan relationship pada `permohonan` (asesi, skema) yang sudah
    di-load. LSP di-query dari skema.lsp_id.
    """
    from sqlalchemy import select
    from app.models.user import LSP

    asesi = permohonan.asesi
    skema = permohonan.skema

    lsp_nama = "Lembaga Sertifikasi Profesi"
    kota = "Indonesia"
    if skema is not None and skema.lsp_id:
        res = await db.execute(select(LSP).where(LSP.id == skema.lsp_id))
        lsp = res.scalar_one_or_none()
        if lsp:
            lsp_nama = lsp.nama or lsp_nama
            if lsp.alamat:
                kota = str(lsp.alamat).split(",")[0].strip() or kota

    units = []
    for u in (skema.unit_kompetensi or []) if skema else []:
        units.append({"kode": u.get("kode", "-"), "judul": u.get("nama", "-")})

    masa_th = max(1, round((sertifikat.tanggal_berakhir - sertifikat.tanggal_terbit).days / 365))
    nama = asesi.nama_lengkap if asesi else "-"
    skema_nama = skema.nama if skema else "-"

    return {
        "nomor": sertifikat.nomor_sertifikat,
        "no_reg": sertifikat.nomor_sertifikat,
        "nama": nama,
        "bidang": skema_nama,
        "kualifikasi": skema_nama,
        "masa": _terbilang_tahun(masa_th),
        "masa_en": f"{masa_th} ({'three' if masa_th == 3 else masa_th}) years",
        "kota": kota,
        "tanggal": _fmt_tanggal(sertifikat.tanggal_terbit),
        "lsp_nama": lsp_nama,
        "units": units,
        "foto": asesi.foto_url if asesi else None,
        "ttd_pemilik": asesi.ttd_url if asesi else None,
        "ketua_nama": "Ketua LSP",
        "ketua_ttd": None,
        "manajer_nama": "Manajer Sertifikasi",
    }
