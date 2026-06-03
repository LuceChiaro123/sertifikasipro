import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listAsesmenForms, getAsesmenForm, saveAsesmenForm } from '../services/asesmenForm'
import toast from 'react-hot-toast'
import { uploadFile } from '../services/admin'
import api from '../services/api'
import {
  ChevronDown, ChevronUp, Save, CheckCircle, Lock, FileText, ClipboardList,
  MessageSquare, FileSignature, Plus, Trash2, SlidersHorizontal, FolderOpen,
  ListChecks, PenLine, Upload, FileCheck, Network, Map, Eye, ShieldCheck, Scale,
} from 'lucide-react'

// Ambil unit kompetensi dari skema (untuk form yang unitnya statis, mis. FR.AK.02)
function useSkemaUnits(skemaId) {
  const { data } = useQuery({
    queryKey: ['skema-units', skemaId],
    queryFn: () => api.get(`/portal/skema/${skemaId}`).then(r => r.data.data),
    enabled: !!skemaId,
    retry: false,
  })
  return data?.unit_kompetensi || []
}

// /media path diserve FastAPI di root (bukan /api/v1)
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '')

// ── Info ringkas dari permohonan (auto-fill, read-only) ────────────────
function InfoAsesmen({ p }) {
  const rows = [
    ['Skema Sertifikasi', `${p.skema_nama || '-'}${p.skema_kode ? ` (${p.skema_kode})` : ''}`],
    ['Nama Asesi', p.asesi_nama || '-'],
    ['Nama Asesor', p.asesor_nama || '-'],
    ['TUK', p.tuk_nama || '-'],
    ['Tanggal Asesmen', p.tanggal_asesmen ? new Date(p.tanggal_asesmen).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'],
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 p-4 bg-slate-50 rounded-lg border border-slate-200 mb-5 text-sm">
      {rows.map(([l, v]) => (
        <div key={l} className="flex gap-2">
          <span className="text-gray-500 min-w-[120px]">{l}</span>
          <span className="font-medium text-gray-900">: {v}</span>
        </div>
      ))}
    </div>
  )
}

// ── Hook: load + save satu form ────────────────────────────────────────
function useAsesmenForm(permohonanId, kode, initialShape) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['asesmen-form', permohonanId, kode],
    queryFn: () => getAsesmenForm(permohonanId, kode).then(r => r.data.data),
    retry: false,
  })
  const [form, setForm] = useState(initialShape)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (data && !loaded) {
      if (data.data_json) setForm(prev => ({ ...prev, ...data.data_json }))
      setLoaded(true)
    }
  }, [data, loaded]) // eslint-disable-line

  const mut = useMutation({
    mutationFn: () => saveAsesmenForm(permohonanId, kode, form),
    onSuccess: () => {
      toast.success(`${kode} tersimpan`)
      qc.invalidateQueries({ queryKey: ['asesmen-forms', permohonanId] })
      qc.invalidateQueries({ queryKey: ['asesmen-form', permohonanId, kode] })
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Gagal menyimpan'),
  })

  return { form, setForm, save: () => mut.mutate(), saving: mut.isPending, savedAt: data?.updated_at }
}

function SaveBtn({ onClick, saving }) {
  return (
    <button onClick={onClick} disabled={saving}
      className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold">
      <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Form'}
    </button>
  )
}

function SavedNote({ savedAt }) {
  if (!savedAt) return null
  return <p className="text-xs text-gray-400 mt-2">Terakhir disimpan: {new Date(savedAt).toLocaleString('id-ID')}</p>
}

// URL TTD/berkas (media diserve di root FastAPI)
const ttdSrc = (u) => (u ? (u.startsWith('http') ? u : `${API_ROOT}${u}`) : null)

// TTD profil user yang login (live) — agar tampil segera setelah upload
function useMyTtd() {
  const { data } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/auth/profile/me').then(r => r.data.data),
    retry: false,
  })
  return data?.ttd_url || null
}

// Hak edit per-peran (form kolaboratif asesi + asesor). Staff (admin) bisa semua.
function roleFlags(role) {
  const isStaff = ['admin', 'superadmin'].includes(role)
  return {
    isStaff,
    canAsesi: isStaff || ['asesi', 'calon_asesi'].includes(role),
    canAsesor: isStaff || role === 'asesor',
  }
}

// ── Blok Tanda Tangan (e-sign): TTD asesi & asesor pada dokumen ────────
export function SignatureBlock({ p, role, showAsesi = true, showAsesor = true }) {
  const myTtd = useMyTtd()
  const isAsesi = ['asesi', 'calon_asesi'].includes(role)
  const isAsesor = role === 'asesor'
  const asesiTtd = (isAsesi && myTtd) || p?.asesi_ttd_url
  const asesorTtd = (isAsesor && myTtd) || p?.asesor_ttd_url
  const Box = ({ label, nama, ttd }) => (
    <div className="p-3 border border-gray-200 rounded-lg text-center bg-white">
      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{label}</p>
      <div className="h-16 flex items-center justify-center mb-1">
        {ttdSrc(ttd)
          ? <img src={ttdSrc(ttd)} alt="Tanda tangan" className="max-h-16 object-contain" />
          : <span className="text-gray-300 text-xs italic">(belum ada TTD)</span>}
      </div>
      <div className="border-t border-gray-300 pt-1">
        <p className="text-sm font-medium text-gray-800">{nama || '-'}</p>
      </div>
    </div>
  )
  return (
    <div className="mt-5 pt-4 border-t border-gray-100">
      <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><PenLine size={15} className="text-indigo-500" /> Tanda Tangan Digital</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {showAsesi && <Box label="Asesi" nama={p?.asesi_nama} ttd={asesiTtd} />}
        {showAsesor && <Box label="Asesor" nama={p?.asesor_nama} ttd={asesorTtd} />}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FR.AK.01 — Persetujuan Asesmen & Kerahasiaan (asesor)
// ════════════════════════════════════════════════════════════════════
const BUKTI_OPTS = [
  ['portofolio', 'Hasil Verifikasi Portofolio'],
  ['reviu_produk', 'Hasil Reviu Produk'],
  ['observasi', 'Hasil Observasi Langsung'],
  ['terstruktur', 'Hasil Kegiatan Terstruktur'],
  ['tanya_jawab', 'Hasil Tanya Jawab (Tertulis)'],
  ['lisan', 'Daftar Pertanyaan Lisan'],
  ['wawancara', 'Daftar Pertanyaan Wawancara'],
]

function FormAK01({ permohonanId, p, role }) {
  const { canAsesi, canAsesor } = roleFlags(role)
  const { form, setForm, save, saving, savedAt } = useAsesmenForm(permohonanId, 'FR.AK.01', {
    bukti: [], persetujuan_asesi: false, persetujuan_asesor: false,
    nama_asesi: p.asesi_nama || '', tgl_asesi: '', nama_asesor: p.asesor_nama || '', tgl_asesor: '',
  })
  const toggleBukti = (key) => setForm(f => ({
    ...f, bukti: (f.bukti || []).includes(key) ? f.bukti.filter(b => b !== key) : [...(f.bukti || []), key],
  }))

  return (
    <div className="space-y-5">
      <InfoAsesmen p={p} />
      <p className="text-xs text-gray-500 italic">Bagian asesi & asesor diisi masing-masing peran. Centang persetujuan Anda dan isi nama/tanggal pihak Anda.</p>
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Bukti yang dikumpulkan: <span className="text-xs font-normal text-gray-400">(asesor)</span></p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BUKTI_OPTS.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" disabled={!canAsesor} checked={(form.bukti || []).includes(key)} onChange={() => toggleBukti(key)} />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" disabled={!canAsesi} className="mt-1" checked={form.persetujuan_asesi}
            onChange={(e) => setForm(f => ({ ...f, persetujuan_asesi: e.target.checked }))} />
          <span><strong>Asesi:</strong> Setuju mengikuti asesmen & telah diberi penjelasan hak/prosedur banding.</span>
        </label>
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" disabled={!canAsesor} className="mt-1" checked={form.persetujuan_asesor}
            onChange={(e) => setForm(f => ({ ...f, persetujuan_asesor: e.target.checked }))} />
          <span><strong>Asesor:</strong> Menjaga kerahasiaan & menjalankan asesmen sesuai penugasan LSP.</span>
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[['Pihak Asesi', 'nama_asesi', 'tgl_asesi', canAsesi], ['Pihak Asesor', 'nama_asesor', 'tgl_asesor', canAsesor]].map(([lbl, nk, tk, ed]) => (
          <div key={nk} className="p-3 border border-gray-200 rounded-lg space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">{lbl}</p>
            <input type="text" disabled={!ed} value={form[nk] || ''} placeholder="Nama lengkap"
              onChange={(e) => setForm(f => ({ ...f, [nk]: e.target.value }))}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
            <input type="date" disabled={!ed} value={form[tk] || ''}
              onChange={(e) => setForm(f => ({ ...f, [tk]: e.target.value }))}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
          </div>
        ))}
      </div>
      {(canAsesi || canAsesor) && <SaveBtn onClick={save} saving={saving} />}
      <SavedNote savedAt={savedAt} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FR.AK.02 — Rekaman Asesmen Kompetensi (asesor)
// ════════════════════════════════════════════════════════════════════
const JENIS_BUKTI = ['Observasi', 'Portofolio', 'Pihak Ketiga', 'Lisan', 'Tertulis', 'Proyek', 'Lainnya']

function FormAK02({ permohonanId, p, readOnly }) {
  const skemaUnits = useSkemaUnits(p?.skema_id)
  const { form, setForm, save, saving, savedAt } = useAsesmenForm(permohonanId, 'FR.AK.02', {
    bukti: {}, rekomendasi: '', tindak_lanjut: '', komentar: '',
  })
  // Daftar unit STATIS dari skema (bukan input manual). Key = kode unit / index.
  const units = (skemaUnits.length ? skemaUnits : []).map((u, i) => ({
    key: u.kode || `unit${i}`, nama: u.nama || u.kode || `Unit ${i + 1}`,
  }))
  const toggleBukti = (unitKey, jb) => setForm(f => {
    const cur = (f.bukti?.[unitKey]) || []
    return { ...f, bukti: { ...f.bukti, [unitKey]: cur.includes(jb) ? cur.filter(x => x !== jb) : [...cur, jb] } }
  })

  return (
    <div className="space-y-5">
      <InfoAsesmen p={p} />
      <p className="text-sm font-semibold text-gray-700">Matriks Rekaman Bukti per Unit Kompetensi</p>
      {units.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Skema belum memiliki daftar unit kompetensi.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-700 text-white">
              <tr>
                <th className="text-left px-3 py-2 min-w-[200px]">Unit Kompetensi</th>
                {JENIS_BUKTI.map(jb => <th key={jb} className="px-2 py-2">{jb}</th>)}
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.key} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-800">{u.nama}</td>
                  {JENIS_BUKTI.map(jb => (
                    <td key={jb} className="px-2 py-2 text-center">
                      <input type="checkbox" disabled={readOnly}
                        checked={(form.bukti?.[u.key] || []).includes(jb)} onChange={() => toggleBukti(u.key, jb)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Rekomendasi Hasil Asesmen</p>
        <div className="flex gap-3">
          {[['Kompeten', 'K'], ['Belum Kompeten', 'BK']].map(([lbl, val]) => (
            <button key={val} disabled={readOnly} onClick={() => setForm(f => ({ ...f, rekomendasi: val }))}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition disabled:opacity-60
                ${form.rekomendasi === val
                  ? (val === 'K' ? 'bg-green-600 border-green-600 text-white' : 'bg-red-600 border-red-600 text-white')
                  : 'border-gray-200 text-gray-600 hover:border-blue-400'}`}>
              {lbl} ({val})
            </button>
          ))}
        </div>
      </div>

      {[['Tindak Lanjut yang Dibutuhkan', 'tindak_lanjut'], ['Komentar / Observasi Asesor', 'komentar']].map(([lbl, key]) => (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{lbl}</label>
          <textarea disabled={readOnly} rows={2} value={form[key] || ''}
            onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
        </div>
      ))}
      {!readOnly && <SaveBtn onClick={save} saving={saving} />}
      <SavedNote savedAt={savedAt} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FR.AK.03 — Umpan Balik & Catatan Asesmen (asesi)
// ════════════════════════════════════════════════════════════════════
const UMPAN_BALIK_Q = [
  'Saya mendapatkan penjelasan yang memadai mengenai proses asesmen',
  'Saya diberi kesempatan mempelajari standar kompetensi & menilai diri sendiri',
  'Asesor memberi kesempatan diskusi metode, instrumen, & jadwal asesmen',
  'Asesor menggali seluruh bukti sesuai latar belakang saya',
  'Saya diberi kesempatan penuh mendemonstrasikan kompetensi',
  'Saya mendapatkan penjelasan memadai mengenai keputusan asesmen',
  'Asesor memberi umpan balik yang mendukung serta tindak lanjut',
  'Asesor bersama saya mempelajari & menandatangani dokumen asesmen',
  'Saya mendapatkan jaminan kerahasiaan hasil asesmen',
  'Asesor menggunakan komunikasi yang efektif selama asesmen',
]

function FormAK03({ permohonanId, p, readOnly }) {
  const { form, setForm, save, saving, savedAt } = useAsesmenForm(permohonanId, 'FR.AK.03', {
    jawaban: {}, catatan: {}, catatan_lain: '',
  })
  const setJawab = (i, val) => setForm(f => ({ ...f, jawaban: { ...f.jawaban, [i]: val } }))
  const setCatatan = (i, val) => setForm(f => ({ ...f, catatan: { ...f.catatan, [i]: val } }))

  return (
    <div className="space-y-5">
      <InfoAsesmen p={p} />
      <p className="text-xs text-gray-500 italic">Diisi oleh asesi setelah pengambilan keputusan asesmen.</p>
      <div className="space-y-2">
        {UMPAN_BALIK_Q.map((q, i) => (
          <div key={i} className="p-3 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-800 mb-2">{i + 1}. {q}</p>
            <div className="flex items-center gap-3">
              {['Ya', 'Tidak'].map(opt => (
                <button key={opt} disabled={readOnly} onClick={() => setJawab(i, opt)}
                  className={`px-4 py-1 rounded-lg text-xs font-semibold border transition disabled:opacity-60
                    ${form.jawaban?.[i] === opt
                      ? (opt === 'Ya' ? 'bg-green-100 text-green-700 border-green-400' : 'bg-red-100 text-red-700 border-red-400')
                      : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                  {opt}
                </button>
              ))}
              <input type="text" disabled={readOnly} value={form.catatan?.[i] || ''} placeholder="Catatan (opsional)"
                onChange={(e) => setCatatan(i, e.target.value)}
                className="flex-1 px-3 py-1 border border-gray-300 rounded text-xs" />
            </div>
          </div>
        ))}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Catatan / Komentar Lainnya</label>
        <textarea disabled={readOnly} rows={3} value={form.catatan_lain || ''}
          onChange={(e) => setForm(f => ({ ...f, catatan_lain: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
      </div>
      {!readOnly && <SaveBtn onClick={save} saving={saving} />}
      <SavedNote savedAt={savedAt} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FR.AK.05 — Laporan Asesmen (asesor)
// ════════════════════════════════════════════════════════════════════
function FormAK05({ permohonanId, p, readOnly }) {
  const { form, setForm, save, saving, savedAt } = useAsesmenForm(permohonanId, 'FR.AK.05', {
    rows: [{ nama: p.asesi_nama || '', rekomendasi: '', keterangan: '' }],
    aspek: '', penolakan: '', saran: '',
  })
  const updRow = (i, key, val) => setForm(f => {
    const r = [...f.rows]; r[i] = { ...r[i], [key]: val }; return { ...f, rows: r }
  })
  const addRow = () => setForm(f => ({ ...f, rows: [...f.rows, { nama: '', rekomendasi: '', keterangan: '' }] }))
  const delRow = (i) => setForm(f => ({ ...f, rows: f.rows.filter((_, idx) => idx !== i) }))

  return (
    <div className="space-y-5">
      <InfoAsesmen p={p} />
      <p className="text-sm font-semibold text-gray-700">Daftar Rekomendasi & Hasil Asesmen</p>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-700 text-white">
            <tr>
              <th className="text-left px-3 py-2">Nama Asesi</th>
              <th className="px-2 py-2 w-32">Rekomendasi</th>
              <th className="text-left px-3 py-2">Keterangan (Unit BK)</th>
              {!readOnly && <th className="px-2 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {(form.rows || []).map((r, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-3 py-2">
                  <input type="text" disabled={readOnly} value={r.nama} placeholder="Nama asesi"
                    onChange={(e) => updRow(i, 'nama', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
                </td>
                <td className="px-2 py-2">
                  <div className="flex gap-1 justify-center">
                    {['K', 'BK'].map(v => (
                      <button key={v} disabled={readOnly} onClick={() => updRow(i, 'rekomendasi', v)}
                        className={`px-2 py-1 rounded text-xs font-bold border ${r.rekomendasi === v
                          ? (v === 'K' ? 'bg-green-100 text-green-700 border-green-400' : 'bg-red-100 text-red-700 border-red-400')
                          : 'border-gray-200 text-gray-500'}`}>{v}</button>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <input type="text" disabled={readOnly} value={r.keterangan} placeholder="Kode/judul unit jika BK"
                    onChange={(e) => updRow(i, 'keterangan', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
                </td>
                {!readOnly && (
                  <td className="px-2 py-2 text-center">
                    {form.rows.length > 1 && <button onClick={() => delRow(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <button onClick={addRow} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
          <Plus size={14} /> Tambah Baris
        </button>
      )}
      {[['Aspek Negatif & Positif dalam Asesmen', 'aspek'], ['Pencatatan Penolakan Hasil Asesmen', 'penolakan'], ['Saran Perbaikan', 'saran']].map(([lbl, key]) => (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{lbl}</label>
          <textarea disabled={readOnly} rows={2} value={form[key] || ''}
            onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
        </div>
      ))}
      {!readOnly && <SaveBtn onClick={save} saving={saving} />}
      <SavedNote savedAt={savedAt} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FR.AK.07 — Ceklis Penyesuaian yang Wajar & Beralasan (asesor)
// ════════════════════════════════════════════════════════════════════
const POTENSI_OPTS = [
  ['pelatihan_telusur', 'Hasil pelatihan/pendidikan, kurikulum & fasilitas mampu telusur ke standar kompetensi'],
  ['pelatihan_belum', 'Hasil pelatihan/pendidikan, kurikulum belum berbasis kompetensi'],
  ['pekerja_telusur', 'Pekerja berpengalaman, operasional mampu telusur ke standar kompetensi'],
  ['pekerja_belum', 'Pekerja berpengalaman, operasional belum berbasis kompetensi'],
  ['otodidak', 'Pelatihan / belajar mandiri atau otodidak'],
]
const KARAKTERISTIK = [
  'Keterbatasan bahasa, literasi, numerasi',
  'Penyediaan dukungan pembaca/penerjemah/penulis',
  'Penggunaan teknologi adaptif / peralatan khusus',
  'Pelaksanaan fleksibel (keletihan / pengobatan)',
  'Penyediaan peralatan braille / audio-video',
  'Penyesuaian tempat fisik / lingkungan asesmen',
  'Pertimbangan umur / usia lanjut / gender',
  'Pertimbangan budaya / tradisi / agama',
]

function FormAK07({ permohonanId, p, readOnly }) {
  const { form, setForm, save, saving, savedAt } = useAsesmenForm(permohonanId, 'FR.AK.07', {
    potensi: [], karakteristik: KARAKTERISTIK.map(() => ({ perlu: '', keterangan: '' })),
    acuan: '', metode: '', instrumen: '',
  })
  const togglePotensi = (key) => setForm(f => ({
    ...f, potensi: (f.potensi || []).includes(key) ? f.potensi.filter(x => x !== key) : [...(f.potensi || []), key],
  }))
  const updKar = (i, key, val) => setForm(f => {
    const k = [...(f.karakteristik || [])]; k[i] = { ...k[i], [key]: val }; return { ...f, karakteristik: k }
  })

  return (
    <div className="space-y-5">
      <InfoAsesmen p={p} />
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Potensi Asesi</p>
        <div className="space-y-2">
          {POTENSI_OPTS.map(([key, label]) => (
            <label key={key} className="flex items-start gap-2 text-sm p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" disabled={readOnly} className="mt-1" checked={(form.potensi || []).includes(key)} onChange={() => togglePotensi(key)} />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Karakteristik Asesi & Persyaratan Penyesuaian</p>
        <div className="space-y-2">
          {KARAKTERISTIK.map((label, i) => (
            <div key={i} className="p-3 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-800 mb-2">{i + 1}. {label}</p>
              <div className="flex items-center gap-3">
                {['Ya', 'Tidak'].map(opt => (
                  <button key={opt} disabled={readOnly} onClick={() => updKar(i, 'perlu', opt)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition disabled:opacity-60
                      ${form.karakteristik?.[i]?.perlu === opt
                        ? (opt === 'Ya' ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-600 text-white border-slate-600')
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>{opt}</button>
                ))}
                <input type="text" disabled={readOnly} value={form.karakteristik?.[i]?.keterangan || ''} placeholder="Metode/instrumen penyesuaian (jika Ya)"
                  onChange={(e) => updKar(i, 'keterangan', e.target.value)}
                  className="flex-1 px-3 py-1 border border-gray-300 rounded text-xs" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[['Acuan Pembanding', 'acuan'], ['Metode Asesmen', 'metode'], ['Instrumen Asesmen', 'instrumen']].map(([lbl, key]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{lbl}</label>
            <textarea disabled={readOnly} rows={2} value={form[key] || ''}
              onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
          </div>
        ))}
      </div>
      {!readOnly && <SaveBtn onClick={save} saving={saving} />}
      <SavedNote savedAt={savedAt} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FR.IA.04A — DIT Penjelasan Singkat Proyek (asesor)
// ════════════════════════════════════════════════════════════════════
function FormIA04A({ permohonanId, p, role }) {
  const { canAsesi, canAsesor } = roleFlags(role)
  const readOnly = !canAsesor   // field deskripsi proyek milik asesor
  const { form, setForm, save, saving, savedAt } = useAsesmenForm(permohonanId, 'FR.IA.04A', {
    situation: '', task: '', peralatan: '', bahan: '', action: '', result: '', waktu: '',
    demonstrasi: '', umpan_balik: '', tugas_url: '',
  })
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadFile(file)
      setForm(f => ({ ...f, tugas_url: res.data.data.url }))
      toast.success('Berkas tugas terupload')
    } catch { toast.error('Gagal upload (maks 5MB)') }
    finally { setUploading(false) }
  }

  const tugasFull = form.tugas_url && (form.tugas_url.startsWith('http') ? form.tugas_url : `${API_ROOT}${form.tugas_url}`)

  const STAR = [
    ['Situation', 'situation', 'Latar belakang situasi / studi kasus...'],
    ['Task', 'task', 'Tugas utama yang harus diselesaikan...'],
    ['Action', 'action', 'Langkah/tindakan spesifik yang didemonstrasikan...'],
    ['Result', 'result', 'Hasil akhir / output / dokumen yang diserahkan...'],
  ]

  return (
    <div className="space-y-5">
      <InfoAsesmen p={p} />
      <p className="text-xs text-gray-500 italic">Asesor menetapkan proyek singkat/kegiatan terstruktur (format STAR-S) untuk dipresentasikan asesi.</p>
      {STAR.map(([lbl, key, ph]) => (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{lbl}</label>
          <textarea disabled={readOnly} rows={4} value={form[key] || ''} placeholder={ph}
            onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y min-h-[90px]" />
        </div>
      ))}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[['Peralatan', 'peralatan'], ['Bahan', 'bahan'], ['Waktu', 'waktu']].map(([lbl, key]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{lbl}</label>
            <input type="text" disabled={readOnly} value={form[key] || ''}
              onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
          </div>
        ))}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Hal yang Perlu Didemonstrasikan</label>
        <textarea disabled={readOnly} rows={4} value={form.demonstrasi || ''}
          onChange={(e) => setForm(f => ({ ...f, demonstrasi: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y min-h-[90px]" />
      </div>
      {/* Upload tugas proyek */}
      <div className="flex items-center gap-3 p-3 border border-dashed border-gray-300 rounded-lg">
        <FolderOpen size={18} className="text-gray-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700">Berkas Tugas Proyek <span className="text-xs font-normal text-gray-400">(diupload asesi)</span></p>
          {tugasFull
            ? <a href={tugasFull} target="_blank" rel="noreferrer" className="text-xs text-green-600 inline-flex items-center gap-1 hover:underline"><FileCheck size={12} /> {form.tugas_url.split('/').pop()}</a>
            : <p className="text-xs text-gray-400">Belum diupload</p>}
        </div>
        {(canAsesi || canAsesor) && (
          <label className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 ${uploading ? 'opacity-50' : ''}`}>
            <Upload size={14} /> {uploading ? 'Upload...' : form.tugas_url ? 'Ganti' : 'Upload'}
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleUpload(e.target.files[0])} disabled={uploading} />
          </label>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Umpan Balik untuk Asesi</label>
        <textarea disabled={readOnly} rows={2} value={form.umpan_balik || ''}
          onChange={(e) => setForm(f => ({ ...f, umpan_balik: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
      </div>
      {(canAsesi || canAsesor) && <SaveBtn onClick={save} saving={saving} />}
      <SavedNote savedAt={savedAt} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FR.IA.04B — Penilaian Proyek Singkat (asesor)
// ════════════════════════════════════════════════════════════════════
function FormIA04B({ permohonanId, p, role }) {
  const { canAsesi, canAsesor } = roleFlags(role)
  const { form, setForm, save, saving, savedAt } = useAsesmenForm(permohonanId, 'FR.IA.04B', {
    rows: [{ aspek: '', tanggapan: '', pencapaian: '' }], rekomendasi: '',
  })
  const updRow = (i, key, val) => setForm(f => {
    const r = [...f.rows]; r[i] = { ...r[i], [key]: val }; return { ...f, rows: r }
  })
  const addRow = () => setForm(f => ({ ...f, rows: [...f.rows, { aspek: '', tanggapan: '', pencapaian: '' }] }))
  const delRow = (i) => setForm(f => ({ ...f, rows: f.rows.filter((_, idx) => idx !== i) }))

  return (
    <div className="space-y-5">
      <InfoAsesmen p={p} />
      <p className="text-sm font-semibold text-gray-700">FR.IA.04B — Penilaian Proyek Singkat atau Kegiatan Terstruktur Lainnya</p>
      <p className="text-xs text-gray-500 italic">Asesor menetapkan Aspek Penilaian & menilai pencapaian (Ya/Tidak). <strong>Asesi mengisi kolom Pertanyaan/Tanggapan</strong>.</p>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-600 text-white">
            <tr>
              <th className="px-2 py-2 w-8">No</th>
              <th className="px-2 py-2 text-left">Aspek Penilaian</th>
              <th className="px-2 py-2 text-left w-1/3">Pertanyaan / Tanggapan</th>
              <th className="px-2 py-2 w-12">Ya</th>
              <th className="px-2 py-2 w-12">Tdk</th>
              {canAsesor && <th className="px-2 py-2 w-8"></th>}
            </tr>
          </thead>
          <tbody>
            {(form.rows || []).map((r, i) => (
              <tr key={i} className="border-t border-gray-100 align-top">
                <td className="px-2 py-2 text-center">{i + 1}</td>
                <td className="px-2 py-2">
                  <textarea disabled={!canAsesor} rows={2} value={r.aspek} placeholder="Aspek penilaian (asesor)"
                    onChange={(e) => updRow(i, 'aspek', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs resize-y" />
                </td>
                <td className="px-2 py-2">
                  <textarea disabled={!canAsesi} rows={2} value={r.tanggapan} placeholder="Tanggapan / jawaban asesi"
                    onChange={(e) => updRow(i, 'tanggapan', e.target.value)}
                    className="w-full px-2 py-1 border border-blue-300 bg-blue-50/40 rounded text-xs resize-y" />
                </td>
                {['Ya', 'Tidak'].map(opt => (
                  <td key={opt} className="px-2 py-2 text-center">
                    <input type="checkbox" disabled={!canAsesor} checked={r.pencapaian === opt}
                      onChange={() => updRow(i, 'pencapaian', r.pencapaian === opt ? '' : opt)} />
                  </td>
                ))}
                {canAsesor && (
                  <td className="px-2 py-2 text-center">
                    {form.rows.length > 1 && <button onClick={() => delRow(i)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canAsesor && (
        <button onClick={addRow} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
          <Plus size={14} /> Tambah Aspek
        </button>
      )}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Rekomendasi Asesor</p>
        <div className="flex gap-3">
          {[['Kompeten', 'K'], ['Belum Kompeten', 'BK']].map(([lbl, val]) => (
            <button key={val} disabled={!canAsesor} onClick={() => setForm(f => ({ ...f, rekomendasi: val }))}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition disabled:opacity-60
                ${form.rekomendasi === val
                  ? (val === 'K' ? 'bg-green-600 border-green-600 text-white' : 'bg-red-600 border-red-600 text-white')
                  : 'border-gray-200 text-gray-600 hover:border-blue-400'}`}>{lbl} ({val})</button>
          ))}
        </div>
      </div>
      {(canAsesi || canAsesor) && <SaveBtn onClick={save} saving={saving} />}
      <SavedNote savedAt={savedAt} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FR.IA.06 — Pertanyaan Tertulis (kolaboratif: asesi jawab, asesor nilai)
// ════════════════════════════════════════════════════════════════════
function FormIA06({ permohonanId, p, role }) {
  const { canAsesi, canAsesor } = roleFlags(role)
  const { form, setForm, save, saving, savedAt } = useAsesmenForm(permohonanId, 'FR.IA.06', {
    soal: [{ pertanyaan: '', jawaban: '', pencapaian: '' }], umpan_balik: '',
  })
  const updSoal = (i, key, val) => setForm(f => {
    const s = [...f.soal]; s[i] = { ...s[i], [key]: val }; return { ...f, soal: s }
  })
  const addSoal = () => setForm(f => ({ ...f, soal: [...f.soal, { pertanyaan: '', jawaban: '', pencapaian: '' }] }))
  const delSoal = (i) => setForm(f => ({ ...f, soal: f.soal.filter((_, idx) => idx !== i) }))

  return (
    <div className="space-y-5">
      <InfoAsesmen p={p} />
      <p className="text-xs text-gray-500 italic">Asesor menulis pertanyaan/soal & menilai. <strong>Asesi mengisi kolom Jawaban</strong>.</p>
      <div className="space-y-3">
        {(form.soal || []).map((s, i) => (
          <div key={i} className="p-3 border border-gray-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Soal {i + 1}</span>
              {canAsesor && form.soal.length > 1 && (
                <button onClick={() => delSoal(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
              )}
            </div>
            <textarea disabled={!canAsesor} rows={3} value={s.pertanyaan} placeholder="Pertanyaan / soal (asesor)"
              onChange={(e) => updSoal(i, 'pertanyaan', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-y min-h-[70px]" />
            <textarea disabled={!canAsesi} rows={3} value={s.jawaban} placeholder="Jawaban asesi"
              onChange={(e) => updSoal(i, 'jawaban', e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 bg-blue-50/40 rounded text-sm resize-y min-h-[70px]" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Pencapaian:</span>
              {['Ya', 'Tidak'].map(opt => (
                <button key={opt} disabled={!canAsesor} onClick={() => updSoal(i, 'pencapaian', opt)}
                  className={`px-3 py-1 rounded text-xs font-semibold border disabled:opacity-60 ${s.pencapaian === opt
                    ? (opt === 'Ya' ? 'bg-green-100 text-green-700 border-green-400' : 'bg-red-100 text-red-700 border-red-400')
                    : 'border-gray-200 text-gray-500'}`}>{opt}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {canAsesor && (
        <button onClick={addSoal} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
          <Plus size={14} /> Tambah Soal
        </button>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Umpan Balik untuk Asesi</label>
        <textarea disabled={!canAsesor} rows={3} value={form.umpan_balik || ''}
          onChange={(e) => setForm(f => ({ ...f, umpan_balik: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y min-h-[70px]" />
      </div>
      {(canAsesi || canAsesor) && <SaveBtn onClick={save} saving={saving} />}
      <SavedNote savedAt={savedAt} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FR.MAPA.01 — Merencanakan Aktivitas & Proses Asesmen (asesor)
// ════════════════════════════════════════════════════════════════════
const MAPA_METODE = ['Observasi Demonstrasi', 'Pertanyaan Tertulis', 'Pertanyaan Lisan', 'Verifikasi Portofolio', 'Studi Kasus/Proyek', 'Pihak Ketiga']
function FormMAPA01({ permohonanId, p, readOnly }) {
  const { form, setForm, save, saving, savedAt } = useAsesmenForm(permohonanId, 'FR.MAPA.01', {
    pendekatan: '', metode: [], sumber_daya: '', jadwal: '', ringkasan: '',
  })
  const toggle = (m) => setForm(f => ({ ...f, metode: (f.metode || []).includes(m) ? f.metode.filter(x => x !== m) : [...(f.metode || []), m] }))
  return (
    <div className="space-y-5">
      <InfoAsesmen p={p} />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pendekatan Asesmen</label>
        <textarea disabled={readOnly} rows={3} value={form.pendekatan || ''} placeholder="Tujuan & pendekatan asesmen (acuan pembanding, konteks)..."
          onChange={(e) => setForm(f => ({ ...f, pendekatan: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y min-h-[70px]" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Metode & Perangkat Asesmen</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MAPA_METODE.map(m => (
            <label key={m} className="flex items-center gap-2 text-sm p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="checkbox" disabled={readOnly} checked={(form.metode || []).includes(m)} onChange={() => toggle(m)} /> {m}
            </label>
          ))}
        </div>
      </div>
      {[['Sumber Daya / Pengaturan', 'sumber_daya'], ['Jadwal & Durasi', 'jadwal'], ['Ringkasan Rencana', 'ringkasan']].map(([lbl, key]) => (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{lbl}</label>
          <textarea disabled={readOnly} rows={2} value={form[key] || ''}
            onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y" />
        </div>
      ))}
      {!readOnly && <SaveBtn onClick={save} saving={saving} />}
      <SavedNote savedAt={savedAt} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FR.MAPA.02 — Peta Instrumen Asesmen (asesor)
// ════════════════════════════════════════════════════════════════════
function FormMAPA02({ permohonanId, p, readOnly }) {
  const skemaUnits = useSkemaUnits(p?.skema_id)
  const { form, setForm, save, saving, savedAt } = useAsesmenForm(permohonanId, 'FR.MAPA.02', { instrumen: {} })
  const units = skemaUnits.map((u, i) => ({ key: u.kode || `unit${i}`, nama: u.nama || u.kode || `Unit ${i + 1}` }))
  const setInstrumen = (key, val) => setForm(f => ({ ...f, instrumen: { ...f.instrumen, [key]: val } }))
  return (
    <div className="space-y-5">
      <InfoAsesmen p={p} />
      <p className="text-sm font-semibold text-gray-700">Peta Instrumen per Unit Kompetensi</p>
      {units.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Skema belum memiliki daftar unit kompetensi.</p>
      ) : (
        <div className="space-y-2">
          {units.map((u) => (
            <div key={u.key} className="p-3 border border-gray-200 rounded-lg">
              <p className="text-sm font-medium text-gray-800 mb-1">{u.nama}</p>
              <input type="text" disabled={readOnly} value={form.instrumen?.[u.key] || ''}
                placeholder="Instrumen yang digunakan (mis. FR.IA.04A, FR.IA.06, ceklis observasi)"
                onChange={(e) => setInstrumen(u.key, e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
            </div>
          ))}
        </div>
      )}
      {!readOnly && <SaveBtn onClick={save} saving={saving} />}
      <SavedNote savedAt={savedAt} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FR.AK.06 — Meninjau Proses Asesmen (asesor)
// ════════════════════════════════════════════════════════════════════
const TINJAUAN_Q = [
  'Proses asesmen telah memenuhi prinsip asesmen (VRFA)',
  'Bukti yang dikumpulkan memenuhi aturan bukti (VATM)',
  'Instrumen asesmen digunakan sesuai rencana',
  'Keputusan asesmen konsisten dengan bukti',
  'Umpan balik diberikan kepada asesi',
  'Dokumentasi asesmen lengkap & tersimpan',
]
function FormAK06({ permohonanId, p, readOnly }) {
  const { form, setForm, save, saving, savedAt } = useAsesmenForm(permohonanId, 'FR.AK.06', { jawaban: {}, catatan: '', perbaikan: '' })
  const setJawab = (i, v) => setForm(f => ({ ...f, jawaban: { ...f.jawaban, [i]: v } }))
  return (
    <div className="space-y-5">
      <InfoAsesmen p={p} />
      <p className="text-xs text-gray-500 italic">Peninjauan proses asesmen oleh asesor (FR.AK.06).</p>
      <div className="space-y-2">
        {TINJAUAN_Q.map((q, i) => (
          <div key={i} className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg">
            <span className="text-sm text-gray-800">{i + 1}. {q}</span>
            <div className="flex gap-2 shrink-0">
              {['Ya', 'Tidak'].map(opt => (
                <button key={opt} disabled={readOnly} onClick={() => setJawab(i, opt)}
                  className={`px-3 py-1 rounded text-xs font-semibold border disabled:opacity-60 ${form.jawaban?.[i] === opt
                    ? (opt === 'Ya' ? 'bg-green-100 text-green-700 border-green-400' : 'bg-red-100 text-red-700 border-red-400')
                    : 'border-gray-200 text-gray-500'}`}>{opt}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {[['Catatan Tinjauan', 'catatan'], ['Saran Perbaikan', 'perbaikan']].map(([lbl, key]) => (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{lbl}</label>
          <textarea disabled={readOnly} rows={2} value={form[key] || ''}
            onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y" />
        </div>
      ))}
      {!readOnly && <SaveBtn onClick={save} saving={saving} />}
      <SavedNote savedAt={savedAt} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FR.VA — Kontribusi dalam Validasi Asesmen (asesor)
// ════════════════════════════════════════════════════════════════════
const VA_Q = [
  'Instrumen asesmen valid (mengukur yang seharusnya)',
  'Proses asesmen reliabel & konsisten',
  'Bukti cukup, terkini, asli, dan memadai',
  'Keputusan asesmen adil untuk semua asesi',
  'Penyesuaian wajar diterapkan bila perlu',
]
function FormVA({ permohonanId, p, readOnly }) {
  const { form, setForm, save, saving, savedAt } = useAsesmenForm(permohonanId, 'FR.VA', { jawaban: {}, rekomendasi: '', catatan: '' })
  const setJawab = (i, v) => setForm(f => ({ ...f, jawaban: { ...f.jawaban, [i]: v } }))
  return (
    <div className="space-y-5">
      <InfoAsesmen p={p} />
      <p className="text-xs text-gray-500 italic">Kontribusi dalam validasi asesmen (FR.VA) — diisi asesor/validator.</p>
      <div className="space-y-2">
        {VA_Q.map((q, i) => (
          <div key={i} className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg">
            <span className="text-sm text-gray-800">{i + 1}. {q}</span>
            <div className="flex gap-2 shrink-0">
              {['Ya', 'Tidak'].map(opt => (
                <button key={opt} disabled={readOnly} onClick={() => setJawab(i, opt)}
                  className={`px-3 py-1 rounded text-xs font-semibold border disabled:opacity-60 ${form.jawaban?.[i] === opt
                    ? (opt === 'Ya' ? 'bg-green-100 text-green-700 border-green-400' : 'bg-red-100 text-red-700 border-red-400')
                    : 'border-gray-200 text-gray-500'}`}>{opt}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Rekomendasi Validasi</label>
        <textarea disabled={readOnly} rows={2} value={form.rekomendasi || ''}
          onChange={(e) => setForm(f => ({ ...f, rekomendasi: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
        <textarea disabled={readOnly} rows={2} value={form.catatan || ''}
          onChange={(e) => setForm(f => ({ ...f, catatan: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y" />
      </div>
      {!readOnly && <SaveBtn onClick={save} saving={saving} />}
      <SavedNote savedAt={savedAt} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FR.AK.04 — Banding Asesmen (asesi)
// ════════════════════════════════════════════════════════════════════
const BANDING_QUESTIONS = [
  'Apakah Proses Banding telah dijelaskan kepada anda?',
  'Apakah anda telah mendiskusikan banding dengan asesor?',
  'Apakah anda mau melibatkan "orang lain" membantu anda dalam Proses Banding?',
]
function FormBanding({ permohonanId, p, readOnly }) {
  const { form, setForm, save, saving, savedAt } = useAsesmenForm(permohonanId, 'FR.BANDING', {
    jawaban: {}, alasan: '', tanggal: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setJawab = (i, v) => setForm(f => ({ ...f, jawaban: { ...f.jawaban, [i]: v } }))
  return (
    <div className="space-y-5">
      <InfoAsesmen p={p} />
      <p className="text-xs text-gray-500 italic">FR.AK.04 — diisi oleh asesi bila ingin mengajukan banding atas proses/keputusan asesmen.</p>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-600 text-white">
            <tr><th className="px-3 py-2 text-left">Pertanyaan</th><th className="px-2 py-2 w-16">Ya</th><th className="px-2 py-2 w-16">Tidak</th></tr>
          </thead>
          <tbody>
            {BANDING_QUESTIONS.map((q, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-800">{q}</td>
                {['Ya', 'Tidak'].map(opt => (
                  <td key={opt} className="px-2 py-2 text-center">
                    <input type="checkbox" disabled={readOnly} checked={form.jawaban?.[i] === opt}
                      onChange={() => setJawab(i, form.jawaban?.[i] === opt ? '' : opt)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Banding</label>
        <p className="text-xs text-gray-400 italic mb-1">*Anda berhak mengajukan banding jika menilai proses asesmen tidak sesuai SOP dan tidak memenuhi prinsip asesmen.</p>
        <textarea disabled={readOnly} rows={4} value={form.alasan || ''} placeholder="Tuliskan alasan pengajuan banding secara detail..."
          onChange={(e) => set('alasan', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y min-h-[90px]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal</label>
          <input type="date" disabled={readOnly} value={form.tanggal || ''} onChange={(e) => set('tanggal', e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
        </div>
      </div>
      {!readOnly && <SaveBtn onClick={save} saving={saving} />}
      <SavedNote savedAt={savedAt} />
    </div>
  )
}

// ── Registry komponen form ─────────────────────────────────────────────
// collab: form kolaboratif (asesi + asesor isi field berbeda)
// ttd: false → jangan tampilkan blok tanda tangan (mis. MAPA perencanaan)
// asesiHidden: true → form internal asesor (perencanaan/peninjauan/validasi),
//   disembunyikan dari tampilan asesi (feedback Meeting 4: "Dihilangkan").
const FORM_COMPONENTS = {
  'FR.MAPA.01': { comp: FormMAPA01, icon: Network, ttd: false, asesiHidden: true },
  'FR.MAPA.02': { comp: FormMAPA02, icon: Map, ttd: false, asesiHidden: true },
  'FR.AK.01': { comp: FormAK01, icon: FileSignature, collab: true },
  'FR.AK.07': { comp: FormAK07, icon: SlidersHorizontal },
  'FR.IA.04A': { comp: FormIA04A, icon: FolderOpen, collab: true },
  'FR.IA.04B': { comp: FormIA04B, icon: ListChecks, collab: true },
  'FR.IA.06': { comp: FormIA06, icon: PenLine, collab: true },
  'FR.AK.02': { comp: FormAK02, icon: ClipboardList },
  'FR.BANDING': { comp: FormBanding, icon: Scale, ttdAsesiOnly: true },
  'FR.AK.03': { comp: FormAK03, icon: MessageSquare },
  'FR.AK.05': { comp: FormAK05, icon: FileText },
  'FR.AK.06': { comp: FormAK06, icon: Eye, asesiHidden: true },
  'FR.VA': { comp: FormVA, icon: ShieldCheck, asesiHidden: true },
}

// ── Accordion item ─────────────────────────────────────────────────────
function FormCard({ meta, permohonanId, p, role }) {
  const [open, setOpen] = useState(false)
  const entry = FORM_COMPONENTS[meta.kode_form]
  if (!entry) return null
  const Icon = entry.icon
  const Comp = entry.comp
  const isStaff = ['admin', 'superadmin'].includes(role)
  // Samakan 'calon_asesi' dengan 'asesi' untuk kepemilikan form (mis. FR.AK.03, FR.BANDING)
  const ownerRole = ['asesi', 'calon_asesi'].includes(role) ? 'asesi' : role
  // Form kolaboratif (asesi + asesor): kontrol per-field di dalam komponen.
  // Form biasa: read-only jika user bukan pengisi (admin/superadmin selalu bisa edit).
  const readOnly = !entry.collab && ownerRole !== meta.diisi_oleh && !isStaff
  const showTtd = entry.ttd !== false
  const lockBadge = readOnly && !entry.collab

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50">
        <div className="flex items-center gap-3">
          <Icon size={17} className="text-blue-500" />
          <div>
            <p className="font-semibold text-gray-900 text-sm">{meta.kode_form} — {meta.label}</p>
            <p className="text-xs text-gray-400">
              {entry.collab ? 'Kolaboratif (asesi & asesor)' : `Diisi oleh ${meta.diisi_oleh}`}{lockBadge && ' · hanya-baca untuk Anda'}
            </p>
          </div>
          {meta.terisi && <CheckCircle size={15} className="text-green-500" />}
          {lockBadge && <Lock size={13} className="text-gray-300" />}
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 pb-6 border-t border-gray-100 pt-4">
          <Comp permohonanId={permohonanId} p={p} readOnly={readOnly} role={role} />
          {showTtd && <SignatureBlock p={p} role={role} showAsesor={!entry.ttdAsesiOnly} />}
        </div>
      )}
    </div>
  )
}

// ── Kartu Tanda Tangan Digital (upload sekali, dipakai semua form) ──────
function TandaTanganCard() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/auth/profile/me').then(r => r.data.data),
    retry: false,
  })
  const ttd = data?.ttd_url
  const ttdFull = ttd && (ttd.startsWith('http') ? ttd : `${API_ROOT}${ttd}`)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadFile(file)
      await api.post('/auth/profile/ttd', { ttd_url: res.data.data.url })
      qc.invalidateQueries({ queryKey: ['my-profile'] })
      qc.invalidateQueries({ queryKey: ['permohonan'] })  // segarkan TTD di blok tanda tangan
      toast.success('Tanda tangan tersimpan & otomatis dipakai semua form')
    } catch {
      toast.error('Gagal upload tanda tangan (maks 5MB, gambar)')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
      <div className="w-24 h-16 bg-white border border-indigo-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
        {ttdFull
          ? <img src={ttdFull} alt="Tanda tangan" className="max-w-full max-h-full object-contain" />
          : <PenLine size={20} className="text-indigo-300" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-indigo-900">Tanda Tangan Digital</p>
        <p className="text-xs text-indigo-700 mt-0.5">
          {ttd ? 'Tersimpan — otomatis dipakai untuk semua form asesmen.' : 'Upload satu kali, dipakai untuk semua form. Format gambar (PNG/JPG), maks 5MB.'}
        </p>
      </div>
      <label className={`cursor-pointer flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 ${uploading ? 'opacity-50' : ''}`}>
        <Upload size={14} /> {uploading ? 'Mengupload...' : ttd ? 'Ganti' : 'Upload TTD'}
        <input type="file" className="hidden" accept=".png,.jpg,.jpeg" onChange={(e) => handleUpload(e.target.files[0])} disabled={uploading} />
      </label>
    </div>
  )
}

/**
 * ProsesAsesmen — daftar form proses asesmen.
 * Props: permohonanId, p (objek permohonan), role (role user saat ini)
 */
export default function ProsesAsesmen({ permohonanId, p, role }) {
  const { data, isLoading } = useQuery({
    queryKey: ['asesmen-forms', permohonanId],
    queryFn: () => listAsesmenForms(permohonanId).then(r => r.data.data),
    retry: false,
  })
  const isAsesi = ['asesi', 'calon_asesi'].includes(role)
  // Tampilkan form yang punya UI. Untuk asesi: form internal asesor
  // (perencanaan/peninjauan/validasi) disembunyikan; form yang melibatkan
  // asesi tetap tampil (read-only bila bukan bagiannya).
  const forms = (data || []).filter(f => {
    const e = FORM_COMPONENTS[f.kode_form]
    if (!e) return false
    if (isAsesi && e.asesiHidden) return false
    return true
  })

  if (isLoading) return <p className="text-sm text-gray-400">Memuat form...</p>
  if (forms.length === 0) {
    return <p className="text-sm text-gray-400 italic">Tidak ada form yang perlu Anda isi pada tahap ini.</p>
  }

  return (
    <div className="space-y-3">
      <TandaTanganCard />
      <p className="text-sm text-gray-500">
        {isAsesi
          ? 'Form yang dapat Anda isi ditandai aktif; form milik asesor dapat Anda lihat (hanya-baca).'
          : 'Form-form berikut diisi selama sesi asesmen (mis. saat Zoom), berurutan sesuai tahapan. Tersimpan otomatis.'}
      </p>
      {forms.map(meta => (
        <FormCard key={meta.kode_form} meta={meta} permohonanId={permohonanId} p={p} role={role} />
      ))}
    </div>
  )
}
