import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listUjiForms, getUjiForm, saveUjiForm, validasiUjiForm, getUjiPeople } from '../services/uji'
import toast from 'react-hot-toast'
import {
  ChevronDown, ChevronUp, Save, CheckCircle, Lock, ShieldCheck,
  FileSignature, ClipboardList, FileText, Clock,
  NotebookPen, Gavel, Award, Plus, Trash2,
} from 'lucide-react'

// ── Hook load + save satu form uji ─────────────────────────────────────
function useUjiForm(ujiId, kode, initialShape) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['uji-form', ujiId, kode],
    queryFn: () => getUjiForm(ujiId, kode).then(r => r.data.data),
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
    mutationFn: () => saveUjiForm(ujiId, kode, form),
    onSuccess: () => {
      toast.success(`${kode} tersimpan`)
      qc.invalidateQueries({ queryKey: ['uji-forms', ujiId] })
      qc.invalidateQueries({ queryKey: ['uji-form', ujiId, kode] })
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Gagal menyimpan'),
  })
  return { form, setForm, save: () => mut.mutate(), saving: mut.isPending, status: data?.status }
}

function SaveBtn({ onClick, saving, disabled }) {
  return (
    <button onClick={onClick} disabled={saving || disabled}
      className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold">
      <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan'}
    </button>
  )
}

// Validasi anggota Pleno: minimal 3 orang & bukan asesor penilai event ini
function plenoIssues(members, uji) {
  const named = (members || []).filter(m => (m.nama || '').trim())
  const issues = []
  if (named.length < 3) issues.push(`Anggota Pleno minimal 3 orang (saat ini ${named.length}).`)
  const assessors = new Set((uji.asesor_ids || []).map(a => (a.nama || a)).filter(Boolean))
  const conflict = [...new Set(named.filter(m => assessors.has(m.nama)).map(m => m.nama))]
  if (conflict.length) issues.push(`Asesor penilai tidak boleh jadi anggota Pleno: ${conflict.join(', ')}. Gunakan asesor lain.`)
  return issues
}

function PlenoWarn({ issues }) {
  if (!issues.length) return null
  return (
    <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800 space-y-0.5">
      {issues.map((m, i) => <p key={i}>⚠ {m}</p>)}
    </div>
  )
}

// Info event ringkas
function InfoUji({ uji }) {
  const rows = [
    ['Skema', `${uji.skema_nama || '-'}${uji.skema_kode ? ` (${uji.skema_kode})` : ''}`],
    ['TUK', uji.tuk_nama || '-'],
    ['Tanggal', uji.tanggal ? new Date(uji.tanggal).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'],
    ['Nomor SPT', uji.nomor_spt || '-'],
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 p-3 bg-slate-50 rounded-lg border border-slate-200 mb-4 text-sm">
      {rows.map(([l, v]) => (
        <div key={l} className="flex gap-2"><span className="text-gray-500 min-w-[90px]">{l}</span><span className="font-medium text-gray-900">: {v}</span></div>
      ))}
    </div>
  )
}

// ── e-Sign untuk dokumen event ─────────────────────────────────────────
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '')
const ttdSrc = (u) => (u ? (u.startsWith('http') ? u : `${API_ROOT}${u}`) : null)

function SignBox({ label, nama, sub, ttd }) {
  return (
    <div className="p-3 border border-gray-200 rounded-lg text-center bg-white">
      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{label}</p>
      <div className="h-14 flex items-center justify-center mb-1">
        {ttdSrc(ttd)
          ? <img src={ttdSrc(ttd)} alt="Tanda tangan" className="max-h-14 object-contain" />
          : <span className="text-gray-300 text-xs italic">(belum ada TTD)</span>}
      </div>
      <div className="border-t border-gray-300 pt-1">
        <p className="text-sm font-medium text-gray-800">{nama || '-'}</p>
        {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

// Data jadwal/anggota/lokasi dari event (read-only) — agar Pleno tak input berulang
function EventJadwal({ uji }) {
  const tgl = uji.tanggal ? new Date(uji.tanggal).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) : '-'
  const rows = [
    ['Jadwal', tgl + (uji.waktu ? ` · ${uji.waktu}` : '')],
    ['Lokasi / TUK', uji.tuk_nama || '-'],
    ['Anggota (Asesor)', (uji.asesor_ids || []).map(a => a.nama || a).join(', ') || '-'],
  ]
  return (
    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
      <p className="text-xs font-semibold text-indigo-700 mb-1.5">Data dari Event (otomatis — tidak perlu input ulang)</p>
      {rows.map(([l, v]) => (
        <div key={l} className="flex gap-2"><span className="text-gray-500 min-w-[130px]">{l}</span><span className="font-medium text-gray-900">: {v}</span></div>
      ))}
    </div>
  )
}

// Blok TTD dokumen event: asesor (snapshot event) + Ketua LSP (validator)
function EventSignature({ uji, meta, signAsesor }) {
  const asesors = uji.asesor_ids || []
  return (
    <div className="mt-5 pt-4 border-t border-gray-100">
      <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><FileSignature size={15} className="text-indigo-500" /> Tanda Tangan</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {signAsesor && asesors.map((a, i) => (
          <SignBox key={i} label={asesors.length > 1 ? `Asesor ${i + 1}` : 'Asesor'} nama={a.nama} sub={a.no_reg} ttd={a.ttd_url} />
        ))}
        <SignBox label="Ketua LSP" nama="Ketua LSP" ttd={meta?.divalidasi_ttd_url} />
      </div>
    </div>
  )
}

// Editor daftar orang (Tim Pleno / Komite Teknis) — items: [{nama, jabatan}]
// Daftar orang (asesor + pimpinan) dari DB untuk dropdown anggota
function useUjiPeople() {
  const { data } = useQuery({ queryKey: ['uji-people'], queryFn: () => getUjiPeople().then(r => r.data.data), retry: false })
  return data || []
}

function PersonListEditor({ label, items, onChange, readOnly, jabatanLabel = 'Jabatan dalam Tim', options = [] }) {
  const list = items || []
  const add = () => onChange([...list, { nama: '', jabatan: '' }])
  const upd = (i, patch) => onChange(list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  const del = (i) => onChange(list.filter((_, idx) => idx !== i))
  const pick = (i, nama) => {
    if (nama === '__manual__') { upd(i, { nama: '', ttd_url: null }); return }
    const f = options.find(o => o.nama === nama)
    upd(i, f ? { nama: f.nama, jabatan: list[i].jabatan || f.jabatan || '', ttd_url: f.ttd_url || null } : { nama })
  }
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
      <div className="space-y-2">
        {list.map((it, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
            {options.length > 0 && (
              <select disabled={readOnly} value={options.some(o => o.nama === it.nama) ? it.nama : '__manual__'}
                onChange={(e) => pick(i, e.target.value)} className="w-40 px-2 py-1.5 border border-gray-300 rounded text-sm">
                <option value="__manual__">— ketik manual —</option>
                {options.map((o, oi) => <option key={oi} value={o.nama}>{o.nama} ({o.jabatan})</option>)}
              </select>
            )}
            <input type="text" disabled={readOnly} value={it.nama || ''} onChange={(e) => upd(i, { nama: e.target.value })}
              placeholder="Nama" className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm" />
            <input type="text" disabled={readOnly} value={it.jabatan || ''} onChange={(e) => upd(i, { jabatan: e.target.value })}
              placeholder={jabatanLabel} className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm" />
            {!readOnly && <button onClick={() => del(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
          </div>
        ))}
        {list.length === 0 && <p className="text-xs text-gray-400">Belum ada anggota.</p>}
      </div>
      {!readOnly && (
        <button onClick={add} className="mt-2 flex items-center gap-1 text-blue-600 text-xs font-medium hover:underline">
          <Plus size={13} /> Tambah Anggota
        </button>
      )}
    </div>
  )
}

// Editor baris generik (rincian anggaran / unit kompetensi) — cols: [{key, placeholder, flex, type}]
function RowListEditor({ label, items, onChange, readOnly, cols, addLabel = 'Tambah Baris' }) {
  const list = items || []
  const blank = () => Object.fromEntries(cols.map(c => [c.key, '']))
  const add = () => onChange([...list, blank()])
  const upd = (i, k, v) => onChange(list.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)))
  const del = (i) => onChange(list.filter((_, idx) => idx !== i))
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
      <div className="space-y-2">
        {list.map((it, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
            {cols.map(c => (
              <input key={c.key} type={c.type || 'text'} disabled={readOnly} value={it[c.key] || ''} onChange={(e) => upd(i, c.key, e.target.value)}
                placeholder={c.placeholder} className={`px-2 py-1.5 border border-gray-300 rounded text-sm ${c.flex || 'flex-1'}`} />
            ))}
            {!readOnly && <button onClick={() => del(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
          </div>
        ))}
        {list.length === 0 && <p className="text-xs text-gray-400">Belum ada baris.</p>}
      </div>
      {!readOnly && <button onClick={add} className="mt-2 flex items-center gap-1 text-blue-600 text-xs font-medium hover:underline"><Plus size={13} /> {addLabel}</button>}
    </div>
  )
}

// Tabel peserta read-only (dipakai beberapa form pleno sebagai konteks)
function PesertaTabel({ peserta }) {
  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="w-full text-xs">
        <thead className="bg-slate-600 text-white"><tr><th className="px-2 py-1.5 text-left">No</th><th className="px-2 py-1.5 text-left">Nama Asesi</th><th className="px-2 py-1.5 text-left">Perusahaan</th><th className="px-2 py-1.5 text-left">Asesor</th></tr></thead>
        <tbody>
          {(peserta || []).map((p, i) => (
            <tr key={i} className="border-t border-gray-100"><td className="px-2 py-1.5">{i + 1}</td><td className="px-2 py-1.5">{p.nama}</td><td className="px-2 py-1.5">{p.perusahaan || '-'}</td><td className="px-2 py-1.5">{p.asesor || '-'}</td></tr>
          ))}
          {(peserta || []).length === 0 && <tr><td colSpan={4} className="px-2 py-3 text-center text-gray-400">Belum ada peserta</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// SPT — Surat Tugas Asesor (input: admin)
// ════════════════════════════════════════════════════════════════════
function FormSPT({ ujiId, uji, readOnly }) {
  const { form, setForm, save, saving } = useUjiForm(ujiId, 'SPT', {
    nomor_surat: uji.nomor_spt || '', alamat_tuk: '', ruang: uji.ruang || '', hari_tanggal: '', waktu: uji.waktu || '', ttd_tanggal: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="space-y-4">
      <InfoUji uji={uji} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[['Nomor Surat Tugas', 'nomor_surat'], ['Alamat TUK', 'alamat_tuk'], ['Ruang', 'ruang'], ['Waktu', 'waktu'], ['Hari / Tanggal', 'hari_tanggal']].map(([lbl, k]) => (
          <div key={k}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{lbl}</label>
            <input type="text" disabled={readOnly} value={form[k] || ''} onChange={(e) => set(k, e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
          </div>
        ))}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Asesor Ditugaskan</p>
        {(uji.asesor_ids || []).length === 0
          ? <p className="text-xs text-gray-400">Belum ada asesor (atur di info event).</p>
          : <ol className="list-decimal pl-5 text-sm text-gray-800">{uji.asesor_ids.map((a, i) => <li key={i}>{a.nama || a}{a.no_reg ? ` — ${a.no_reg}` : ''}</li>)}</ol>}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Daftar Peserta</p>
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-600 text-white"><tr><th className="px-2 py-1.5 text-left">No</th><th className="px-2 py-1.5 text-left">Nama Asesi</th><th className="px-2 py-1.5 text-left">Perusahaan</th><th className="px-2 py-1.5 text-left">Asesor</th></tr></thead>
            <tbody>
              {(uji.peserta || []).map((p, i) => (
                <tr key={i} className="border-t border-gray-100"><td className="px-2 py-1.5">{i + 1}</td><td className="px-2 py-1.5">{p.nama}</td><td className="px-2 py-1.5">{p.perusahaan || '-'}</td><td className="px-2 py-1.5">{p.asesor || '-'}</td></tr>
              ))}
              {(uji.peserta || []).length === 0 && <tr><td colSpan={4} className="px-2 py-3 text-center text-gray-400">Belum ada peserta</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal TTD (Ketua LSP)</label>
          <input type="date" disabled={readOnly} value={form.ttd_tanggal || ''} onChange={(e) => set('ttd_tanggal', e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
        </div>
      </div>
      {!readOnly && <SaveBtn onClick={save} saving={saving} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// BERITA ACARA Asesmen (input: asesor)
// ════════════════════════════════════════════════════════════════════
function FormBeritaAcara({ ujiId, uji, readOnly }) {
  const { form, setForm, save, saving } = useUjiForm(ujiId, 'BERITA_ACARA', {
    hari: '', tanggal: '', bulan: '', tahun: '', waktu_mulai: '', waktu_selesai: '',
    hasil: {}, ttd_tanggal: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setHasil = (i, key, v) => setForm(f => ({ ...f, hasil: { ...f.hasil, [i]: { ...f.hasil?.[i], [key]: v } } }))
  const peserta = uji.peserta || []
  const kompeten = peserta.filter((_, i) => form.hasil?.[i]?.hasil === 'K').length
  const bk = peserta.filter((_, i) => form.hasil?.[i]?.hasil === 'BK').length

  return (
    <div className="space-y-4">
      <InfoUji uji={uji} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[['Hari', 'hari'], ['Tanggal', 'tanggal'], ['Bulan', 'bulan'], ['Tahun', 'tahun'], ['Waktu Mulai', 'waktu_mulai'], ['Waktu Selesai', 'waktu_selesai']].map(([lbl, k]) => (
          <div key={k}><label className="block text-xs text-gray-600 mb-1">{lbl}</label>
            <input type="text" disabled={readOnly} value={form[k] || ''} onChange={(e) => set(k, e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-xs" /></div>
        ))}
      </div>
      <div className="flex gap-4 text-sm">
        <span className="px-3 py-1 bg-green-50 text-green-700 rounded">Kompeten: <strong>{kompeten}</strong></span>
        <span className="px-3 py-1 bg-red-50 text-red-700 rounded">Belum Kompeten: <strong>{bk}</strong></span>
      </div>
      <p className="text-sm font-semibold text-gray-700">Hasil Asesmen Peserta</p>
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-600 text-white"><tr><th className="px-2 py-1.5 text-left">No</th><th className="px-2 py-1.5 text-left">Nama Peserta</th><th className="px-2 py-1.5">Hasil</th><th className="px-2 py-1.5 text-left">Rekomendasi / Tindak Lanjut</th></tr></thead>
          <tbody>
            {peserta.map((p, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-2 py-1.5">{i + 1}</td>
                <td className="px-2 py-1.5">{p.nama}</td>
                <td className="px-2 py-1.5">
                  <div className="flex gap-1 justify-center">
                    {['K', 'BK'].map(v => (
                      <button key={v} disabled={readOnly} onClick={() => setHasil(i, 'hasil', v)}
                        className={`px-2 py-0.5 rounded text-xs font-bold border ${form.hasil?.[i]?.hasil === v ? (v === 'K' ? 'bg-green-100 text-green-700 border-green-400' : 'bg-red-100 text-red-700 border-red-400') : 'border-gray-200 text-gray-500'}`}>{v}</button>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-1.5">
                  <input type="text" disabled={readOnly} value={form.hasil?.[i]?.rekomendasi || ''} onChange={(e) => setHasil(i, 'rekomendasi', e.target.value)}
                    placeholder="mis. Direkomendasikan Terbit Sertifikat" className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
                </td>
              </tr>
            ))}
            {peserta.length === 0 && <tr><td colSpan={4} className="px-2 py-3 text-center text-gray-400">Belum ada peserta</td></tr>}
          </tbody>
        </table>
      </div>
      {/* TTD Asesor — nama + no reg dari asesor event */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 border border-gray-200 rounded-lg text-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Asesor</p>
          {(uji.asesor_ids || []).length
            ? uji.asesor_ids.map((a, i) => <p key={i} className="text-gray-800">{a.nama || a}{a.no_reg ? <span className="text-gray-400"> · {a.no_reg}</span> : ''}</p>)
            : <p className="text-gray-400 text-xs">Belum ada asesor</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal TTD</label>
          <input type="date" disabled={readOnly} value={form.ttd_tanggal || ''} onChange={(e) => set('ttd_tanggal', e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
        </div>
      </div>
      {!readOnly && <SaveBtn onClick={save} saving={saving} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// LAPORAN ASESMEN (FR.AK.05) (input: asesor)
// ════════════════════════════════════════════════════════════════════
function FormLaporanAK05({ ujiId, uji, readOnly }) {
  const { form, setForm, save, saving } = useUjiForm(ujiId, 'LAPORAN_AK05', {
    hasil: {}, aspek: '', penolakan: '', saran: '', ttd_tanggal: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setHasil = (i, key, v) => setForm(f => ({ ...f, hasil: { ...f.hasil, [i]: { ...f.hasil?.[i], [key]: v } } }))
  const peserta = uji.peserta || []
  return (
    <div className="space-y-4">
      <InfoUji uji={uji} />
      <p className="text-sm font-semibold text-gray-700">Daftar Rekomendasi & Hasil Asesmen</p>
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-600 text-white"><tr><th className="px-2 py-1.5">No</th><th className="px-2 py-1.5 text-left">Nama Asesi</th><th className="px-2 py-1.5">Rekomendasi</th><th className="px-2 py-1.5 text-left">Keterangan (Unit BK)</th></tr></thead>
          <tbody>
            {peserta.map((p, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-2 py-1.5 text-center">{i + 1}</td>
                <td className="px-2 py-1.5">{p.nama}</td>
                <td className="px-2 py-1.5">
                  <div className="flex gap-1 justify-center">
                    {['K', 'BK'].map(v => (
                      <button key={v} disabled={readOnly} onClick={() => setHasil(i, 'rekomendasi', v)}
                        className={`px-2 py-0.5 rounded text-xs font-bold border ${form.hasil?.[i]?.rekomendasi === v ? (v === 'K' ? 'bg-green-100 text-green-700 border-green-400' : 'bg-red-100 text-red-700 border-red-400') : 'border-gray-200 text-gray-500'}`}>{v}</button>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-1.5">
                  <input type="text" disabled={readOnly} value={form.hasil?.[i]?.keterangan || ''} onChange={(e) => setHasil(i, 'keterangan', e.target.value)}
                    placeholder="Kode/judul unit jika BK" className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
                </td>
              </tr>
            ))}
            {peserta.length === 0 && <tr><td colSpan={4} className="px-2 py-3 text-center text-gray-400">Belum ada peserta</td></tr>}
          </tbody>
        </table>
      </div>
      {[['Aspek Negatif & Positif dalam Asesmen', 'aspek'], ['Pencatatan Penolakan Hasil Asesmen', 'penolakan'], ['Saran Perbaikan', 'saran']].map(([lbl, k]) => (
        <div key={k}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{lbl}</label>
          <textarea disabled={readOnly} rows={2} value={form[k] || ''} onChange={(e) => set(k, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y" />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Tanggal TTD Asesor</label>
          <input type="date" disabled={readOnly} value={form.ttd_tanggal || ''} onChange={(e) => set('ttd_tanggal', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" /></div>
      </div>
      {!readOnly && <SaveBtn onClick={save} saving={saving} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// PLENO — SPT Tim Pleno (input: admin)
// ════════════════════════════════════════════════════════════════════
function FormSPTPleno({ ujiId, uji, readOnly }) {
  const people = useUjiPeople()
  const { form, setForm, save, saving } = useUjiForm(ujiId, 'SPT_PLENO', {
    nomor_surat: '', dasar: '', hari_tanggal: '', waktu: '', tempat: uji.tuk_nama || '', agenda: '', tim: [], ttd_tanggal: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="space-y-4">
      <InfoUji uji={uji} />
      <EventJadwal uji={uji} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Nomor Surat Tugas</label>
          <input type="text" disabled={readOnly} value={form.nomor_surat || ''} onChange={(e) => set('nomor_surat', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" /></div>
      </div>
      {[['Dasar Penugasan', 'dasar'], ['Agenda Rapat Pleno', 'agenda']].map(([lbl, k]) => (
        <div key={k}><label className="block text-sm font-medium text-gray-700 mb-1">{lbl}</label>
          <textarea disabled={readOnly} rows={2} value={form[k] || ''} onChange={(e) => set(k, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y" /></div>
      ))}
      <PersonListEditor label="Tim Pleno" items={form.tim} onChange={(v) => set('tim', v)} readOnly={readOnly} jabatanLabel="Jabatan (Ketua/Anggota)" options={people} />
      {!readOnly && <PlenoWarn issues={plenoIssues(form.tim, uji)} />}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Peserta yang Diplenokan</p>
        <PesertaTabel peserta={uji.peserta} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Tanggal TTD (Ketua LSP)</label>
          <input type="date" disabled={readOnly} value={form.ttd_tanggal || ''} onChange={(e) => set('ttd_tanggal', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" /></div>
      </div>
      {!readOnly && (() => { const iss = plenoIssues(form.tim, uji); return <SaveBtn onClick={() => iss.length ? toast.error(iss[0]) : save()} saving={saving} disabled={iss.length > 0} /> })()}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// PLENO — Notulen Rapat (input: asesor) · verifikasi dokumen per peserta (VATM)
// ════════════════════════════════════════════════════════════════════
const VATM = [['valid', 'Valid'], ['asli', 'Asli'], ['terkini', 'Terkini'], ['memadai', 'Memadai']]
function FormNotulenPleno({ ujiId, uji, readOnly }) {
  const people = useUjiPeople()
  const { form, setForm, save, saving } = useUjiForm(ujiId, 'NOTULEN', {
    hari_tanggal: '', waktu: '', tempat: uji.tuk_nama || '', verif: {}, catatan: '', notulis: '', tim: [], ttd_tanggal: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setVerif = (i, key, v) => setForm(f => ({ ...f, verif: { ...f.verif, [i]: { ...f.verif?.[i], [key]: v } } }))
  const peserta = uji.peserta || []
  return (
    <div className="space-y-4">
      <InfoUji uji={uji} />
      <EventJadwal uji={uji} />
      <p className="text-sm font-semibold text-gray-700">Verifikasi Kelengkapan Dokumen Peserta</p>
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-600 text-white"><tr>
            <th className="px-2 py-1.5 text-left">No</th><th className="px-2 py-1.5 text-left">Nama Asesi</th>
            {VATM.map(([, l]) => <th key={l} className="px-2 py-1.5">{l}</th>)}
            <th className="px-2 py-1.5 text-left">Keputusan</th>
          </tr></thead>
          <tbody>
            {peserta.map((p, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-2 py-1.5">{i + 1}</td><td className="px-2 py-1.5">{p.nama}</td>
                {VATM.map(([key]) => (
                  <td key={key} className="px-2 py-1.5 text-center">
                    <input type="checkbox" disabled={readOnly} checked={!!form.verif?.[i]?.[key]} onChange={(e) => setVerif(i, key, e.target.checked)} />
                  </td>
                ))}
                <td className="px-2 py-1.5">
                  <input type="text" disabled={readOnly} value={form.verif?.[i]?.keputusan || ''} onChange={(e) => setVerif(i, 'keputusan', e.target.value)}
                    placeholder="mis. Memenuhi syarat" className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
                </td>
              </tr>
            ))}
            {peserta.length === 0 && <tr><td colSpan={7} className="px-2 py-3 text-center text-gray-400">Belum ada peserta</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-400">VATM = Valid · Asli · Terkini · Memadai (aturan bukti BNSP).</p>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Catatan / Hasil Pembahasan</label>
        <textarea disabled={readOnly} rows={3} value={form.catatan || ''} onChange={(e) => set('catatan', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y" /></div>
      <PersonListEditor label="Tim Pleno (TTD)" items={form.tim} onChange={(v) => set('tim', v)} readOnly={readOnly} jabatanLabel="Jabatan (Ketua/Anggota)" options={people} />
      {!readOnly && <PlenoWarn issues={plenoIssues(form.tim, uji)} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Notulis</label>
          <input type="text" disabled={readOnly} value={form.notulis || ''} onChange={(e) => set('notulis', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" /></div>
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Tanggal TTD</label>
          <input type="date" disabled={readOnly} value={form.ttd_tanggal || ''} onChange={(e) => set('ttd_tanggal', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" /></div>
      </div>
      {!readOnly && (() => { const iss = plenoIssues(form.tim, uji); return <SaveBtn onClick={() => iss.length ? toast.error(iss[0]) : save()} saving={saving} disabled={iss.length > 0} /> })()}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// PLENO — Berita Acara Pleno (input: asesor) · Komite Teknis + hasil K/BK
// ════════════════════════════════════════════════════════════════════
function FormBeritaAcaraPleno({ ujiId, uji, readOnly }) {
  const people = useUjiPeople()
  const { form, setForm, save, saving } = useUjiForm(ujiId, 'BERITA_ACARA_PLENO', {
    nomor: '', hari_tanggal: '', komite: [], hasil: {}, kesimpulan: '', ttd_tanggal: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setHasil = (i, key, v) => setForm(f => ({ ...f, hasil: { ...f.hasil, [i]: { ...f.hasil?.[i], [key]: v } } }))
  const peserta = uji.peserta || []
  const kompeten = peserta.filter((_, i) => form.hasil?.[i]?.hasil === 'K').length
  return (
    <div className="space-y-4">
      <InfoUji uji={uji} />
      <EventJadwal uji={uji} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[['Nomor Berita Acara', 'nomor']].map(([lbl, k]) => (
          <div key={k}><label className="block text-xs font-medium text-gray-700 mb-1">{lbl}</label>
            <input type="text" disabled={readOnly} value={form[k] || ''} onChange={(e) => set(k, e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" /></div>
        ))}
      </div>
      <PersonListEditor label="Komite Teknis" items={form.komite} onChange={(v) => set('komite', v)} readOnly={readOnly} jabatanLabel="Jabatan" options={people} />
      {!readOnly && <PlenoWarn issues={plenoIssues(form.komite, uji)} />}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Asesor Pelaksana</p>
        {(uji.asesor_ids || []).length
          ? <ol className="list-decimal pl-5 text-sm text-gray-800">{uji.asesor_ids.map((a, i) => <li key={i}>{a.nama || a}{a.no_reg ? ` — ${a.no_reg}` : ''}</li>)}</ol>
          : <p className="text-xs text-gray-400">Belum ada asesor.</p>}
      </div>
      <div className="flex gap-4 text-sm"><span className="px-3 py-1 bg-green-50 text-green-700 rounded">Kompeten: <strong>{kompeten}</strong> / {peserta.length}</span></div>
      <p className="text-sm font-semibold text-gray-700">Keputusan Pleno per Peserta</p>
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-600 text-white"><tr><th className="px-2 py-1.5">No</th><th className="px-2 py-1.5 text-left">Nama Asesi</th><th className="px-2 py-1.5">Hasil</th><th className="px-2 py-1.5 text-left">Keputusan Pleno</th></tr></thead>
          <tbody>
            {peserta.map((p, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-2 py-1.5 text-center">{i + 1}</td><td className="px-2 py-1.5">{p.nama}</td>
                <td className="px-2 py-1.5">
                  <div className="flex gap-1 justify-center">
                    {['K', 'BK'].map(v => (
                      <button key={v} disabled={readOnly} onClick={() => setHasil(i, 'hasil', v)}
                        className={`px-2 py-0.5 rounded text-xs font-bold border ${form.hasil?.[i]?.hasil === v ? (v === 'K' ? 'bg-green-100 text-green-700 border-green-400' : 'bg-red-100 text-red-700 border-red-400') : 'border-gray-200 text-gray-500'}`}>{v}</button>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-1.5">
                  <input type="text" disabled={readOnly} value={form.hasil?.[i]?.keputusan || ''} onChange={(e) => setHasil(i, 'keputusan', e.target.value)}
                    placeholder="mis. Direkomendasikan terbit sertifikat" className="w-full px-2 py-1 border border-gray-300 rounded text-xs" />
                </td>
              </tr>
            ))}
            {peserta.length === 0 && <tr><td colSpan={4} className="px-2 py-3 text-center text-gray-400">Belum ada peserta</td></tr>}
          </tbody>
        </table>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Kesimpulan Pleno</label>
        <textarea disabled={readOnly} rows={2} value={form.kesimpulan || ''} onChange={(e) => set('kesimpulan', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Tanggal TTD</label>
          <input type="date" disabled={readOnly} value={form.ttd_tanggal || ''} onChange={(e) => set('ttd_tanggal', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" /></div>
      </div>
      {!readOnly && (() => { const iss = plenoIssues(form.komite, uji); return <SaveBtn onClick={() => iss.length ? toast.error(iss[0]) : save()} saving={saving} disabled={iss.length > 0} /> })()}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// PLENO — SK Penerbitan Sertifikat (input: asesor)
// ════════════════════════════════════════════════════════════════════
// Teks baku SK (boilerplate) — disediakan default agar tidak diketik ulang.
const SK_BAKU = {
  tentang: 'Penetapan Hasil Uji Kompetensi dan Penerbitan Sertifikat Kompetensi',
  menimbang: 'a. bahwa telah dilaksanakan uji kompetensi sesuai skema sertifikasi;\nb. bahwa hasil uji kompetensi telah dibahas dan ditetapkan dalam Rapat Pleno Komite Teknis;\nc. bahwa berdasarkan pertimbangan tersebut perlu menetapkan Surat Keputusan Penerbitan Sertifikat Kompetensi.',
  mengingat: '1. Undang-Undang Nomor 13 Tahun 2003 tentang Ketenagakerjaan;\n2. Peraturan Pemerintah Nomor 10 Tahun 2018 tentang Badan Nasional Sertifikasi Profesi (BNSP);\n3. Pedoman BNSP 201 tentang Persyaratan Umum Lembaga Sertifikasi Profesi.',
  memperhatikan: 'Hasil Rapat Pleno Komite Teknis LSP atas pelaksanaan uji kompetensi.',
  memutuskan: 'Menetapkan peserta yang dinyatakan KOMPETEN sebagaimana tercantum dalam lampiran untuk diterbitkan Sertifikat Kompetensi.',
}
function FormSKPleno({ ujiId, uji, readOnly }) {
  const { form, setForm, save, saving } = useUjiForm(ujiId, 'SK_SERTIFIKAT', {
    nomor_sk: '', ...SK_BAKU,
    ditetapkan_di: uji.tuk_nama || '', tanggal: '', ketua: '', penerima: {},
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setPen = (i, key, v) => setForm(f => ({ ...f, penerima: { ...f.penerima, [i]: { ...f.penerima?.[i], [key]: v } } }))
  const peserta = uji.peserta || []
  const terbit = peserta.filter((_, i) => form.penerima?.[i]?.terbit).length
  return (
    <div className="space-y-4">
      <InfoUji uji={uji} />
      <div className="flex items-center justify-between gap-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
        <p className="text-xs text-indigo-700">Klausul SK (Tentang/Menimbang/Mengingat/Memperhatikan/Memutuskan) sudah terisi teks baku — ubah hanya bila perlu.</p>
        {!readOnly && (
          <button onClick={() => setForm(f => ({ ...f, ...SK_BAKU }))} className="shrink-0 text-xs font-medium text-indigo-700 underline hover:text-indigo-900">Pulihkan teks baku</button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[['Nomor SK', 'nomor_sk'], ['Tentang', 'tentang']].map(([lbl, k]) => (
          <div key={k}><label className="block text-xs font-medium text-gray-700 mb-1">{lbl}</label>
            <input type="text" disabled={readOnly} value={form[k] || ''} onChange={(e) => set(k, e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" /></div>
        ))}
      </div>
      {[['Menimbang', 'menimbang'], ['Mengingat', 'mengingat'], ['Memperhatikan', 'memperhatikan'], ['Memutuskan / Menetapkan', 'memutuskan']].map(([lbl, k]) => (
        <div key={k}><label className="block text-sm font-medium text-gray-700 mb-1">{lbl}</label>
          <textarea disabled={readOnly} rows={3} value={form[k] || ''} onChange={(e) => set(k, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y" /></div>
      ))}
      <div className="flex gap-4 text-sm"><span className="px-3 py-1 bg-green-50 text-green-700 rounded">Diterbitkan Sertifikat: <strong>{terbit}</strong> / {peserta.length}</span></div>
      <p className="text-sm font-semibold text-gray-700">Lampiran — Penerima Sertifikat</p>
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-600 text-white"><tr><th className="px-2 py-1.5">No</th><th className="px-2 py-1.5 text-left">Nama Asesi</th><th className="px-2 py-1.5">Terbit?</th><th className="px-2 py-1.5 text-left">Nomor Sertifikat</th></tr></thead>
          <tbody>
            {peserta.map((p, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-2 py-1.5 text-center">{i + 1}</td><td className="px-2 py-1.5">{p.nama}</td>
                <td className="px-2 py-1.5 text-center"><input type="checkbox" disabled={readOnly} checked={!!form.penerima?.[i]?.terbit} onChange={(e) => setPen(i, 'terbit', e.target.checked)} /></td>
                <td className="px-2 py-1.5"><input type="text" disabled={readOnly} value={form.penerima?.[i]?.nomor || ''} onChange={(e) => setPen(i, 'nomor', e.target.value)}
                  placeholder="Nomor sertifikat" className="w-full px-2 py-1 border border-gray-300 rounded text-xs" /></td>
              </tr>
            ))}
            {peserta.length === 0 && <tr><td colSpan={4} className="px-2 py-3 text-center text-gray-400">Belum ada peserta</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Ditetapkan di</label>
          <input type="text" disabled={readOnly} value={form.ditetapkan_di || ''} onChange={(e) => set('ditetapkan_di', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" /></div>
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Penetapan</label>
          <input type="date" disabled={readOnly} value={form.tanggal || ''} onChange={(e) => set('tanggal', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" /></div>
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Ketua LSP</label>
          <input type="text" disabled={readOnly} value={form.ketua || ''} onChange={(e) => set('ketua', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" /></div>
      </div>
      {!readOnly && <SaveBtn onClick={save} saving={saving} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// CETAK SERTIFIKAT — Permohonan Blanko Sertifikat ke BNSP (input: admin)
// ════════════════════════════════════════════════════════════════════
function FormPermohonanBlanko({ ujiId, uji, readOnly }) {
  const { form, setForm, save, saving } = useUjiForm(ujiId, 'PERMOHONAN_BLANKO', {
    nomor_surat: '', tanggal: '', tujuan: 'Kepala Badan Nasional Sertifikasi Profesi (BNSP)',
    perihal: 'Permohonan Blanko Sertifikat Kompetensi', jumlah_blanko: String((uji.peserta || []).length || ''),
    rincian: [], keterangan: '', pemohon: '', ttd_tanggal: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="space-y-4">
      <InfoUji uji={uji} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[['Nomor Surat', 'nomor_surat'], ['Tanggal Surat', 'tanggal'], ['Ditujukan Kepada', 'tujuan'], ['Perihal', 'perihal'], ['Jumlah Blanko Dimohon', 'jumlah_blanko']].map(([lbl, k]) => (
          <div key={k} className={k === 'tujuan' || k === 'perihal' ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{lbl}</label>
            <input type="text" disabled={readOnly} value={form[k] || ''} onChange={(e) => set(k, e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
          </div>
        ))}
      </div>
      <RowListEditor label="Rincian Permohonan (per Anggaran/Skema)" items={form.rincian} onChange={(v) => set('rincian', v)} readOnly={readOnly}
        addLabel="Tambah Rincian"
        cols={[
          { key: 'uraian', placeholder: 'Uraian / Skema', flex: 'flex-1' },
          { key: 'jumlah', placeholder: 'Jumlah', flex: 'w-24', type: 'number' },
          { key: 'satuan', placeholder: 'Satuan', flex: 'w-28' },
        ]} />
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Peserta (Calon Penerima)</p>
        <PesertaTabel peserta={uji.peserta} />
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
        <textarea disabled={readOnly} rows={2} value={form.keterangan || ''} onChange={(e) => set('keterangan', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Pemohon (Ketua LSP)</label>
          <input type="text" disabled={readOnly} value={form.pemohon || ''} onChange={(e) => set('pemohon', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" /></div>
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Tanggal TTD</label>
          <input type="date" disabled={readOnly} value={form.ttd_tanggal || ''} onChange={(e) => set('ttd_tanggal', e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" /></div>
      </div>
      {!readOnly && <SaveBtn onClick={save} saving={saving} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// CETAK SERTIFIKAT — Sertifikat Kompetensi (2 halaman) (input: admin)
// ════════════════════════════════════════════════════════════════════
function FormSertifikat({ ujiId, uji, readOnly }) {
  const { form, setForm, save, saving } = useUjiForm(ujiId, 'SERTIFIKAT', {
    tanggal_terbit: '', masa_berlaku: '', tempat_terbit: '', ketua: '', manajer: '',
    units: [], nomor: {},
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setNomor = (i, key, v) => setForm(f => ({ ...f, nomor: { ...f.nomor, [i]: { ...f.nomor?.[i], [key]: v } } }))
  const peserta = uji.peserta || []
  return (
    <div className="space-y-4">
      <InfoUji uji={uji} />
      <p className="text-[11px] text-gray-400">Halaman 1: identitas pemegang + foto 3×4 + TTD (Ketua LSP / Pemegang / Manajer Sertifikasi). Halaman 2: daftar unit kompetensi. Foto 3×4 diambil dari profil asesi.</p>
      <p className="text-sm font-semibold text-gray-700">Data Umum Sertifikat (Halaman 1)</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[['Tempat Terbit', 'tempat_terbit'], ['Tanggal Terbit', 'tanggal_terbit', 'date'], ['Masa Berlaku s.d.', 'masa_berlaku', 'date'], ['Ketua LSP', 'ketua'], ['Manajer Sertifikasi', 'manajer']].map(([lbl, k, type]) => (
          <div key={k}><label className="block text-xs font-medium text-gray-700 mb-1">{lbl}</label>
            <input type={type || 'text'} disabled={readOnly} value={form[k] || ''} onChange={(e) => set(k, e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" /></div>
        ))}
      </div>
      <RowListEditor label="Unit Kompetensi (Halaman 2)" items={form.units} onChange={(v) => set('units', v)} readOnly={readOnly}
        addLabel="Tambah Unit"
        cols={[
          { key: 'kode', placeholder: 'Kode Unit', flex: 'w-40' },
          { key: 'judul', placeholder: 'Judul Unit Kompetensi', flex: 'flex-1' },
        ]} />
      <p className="text-sm font-semibold text-gray-700">Penomoran Sertifikat per Pemegang</p>
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-600 text-white"><tr><th className="px-2 py-1.5">No</th><th className="px-2 py-1.5 text-left">Nama Pemegang</th><th className="px-2 py-1.5 text-left">Perusahaan</th><th className="px-2 py-1.5 text-left">Nomor Sertifikat</th></tr></thead>
          <tbody>
            {peserta.map((p, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-2 py-1.5 text-center">{i + 1}</td><td className="px-2 py-1.5">{p.nama}</td><td className="px-2 py-1.5 text-gray-600">{p.perusahaan || '-'}</td>
                <td className="px-2 py-1.5"><input type="text" disabled={readOnly} value={form.nomor?.[i]?.nomor || ''} onChange={(e) => setNomor(i, 'nomor', e.target.value)}
                  placeholder="Nomor sertifikat" className="w-full px-2 py-1 border border-gray-300 rounded text-xs" /></td>
              </tr>
            ))}
            {peserta.length === 0 && <tr><td colSpan={4} className="px-2 py-3 text-center text-gray-400">Belum ada peserta</td></tr>}
          </tbody>
        </table>
      </div>
      {!readOnly && <SaveBtn onClick={save} saving={saving} />}
    </div>
  )
}

// signAsesor: dokumen ditandatangani asesor (selain Ketua LSP sbg validator)
const FORM_COMPONENTS = {
  // Menu Uji Kompetensi
  SPT: { comp: FormSPT, icon: FileSignature },
  BERITA_ACARA: { comp: FormBeritaAcara, icon: ClipboardList, signAsesor: true },
  LAPORAN_AK05: { comp: FormLaporanAK05, icon: FileText, signAsesor: true },
  // Menu Pleno
  SPT_PLENO: { comp: FormSPTPleno, icon: FileSignature },
  NOTULEN: { comp: FormNotulenPleno, icon: NotebookPen, signAsesor: true },
  BERITA_ACARA_PLENO: { comp: FormBeritaAcaraPleno, icon: ClipboardList, signAsesor: true },
  SK_SERTIFIKAT: { comp: FormSKPleno, icon: Gavel },
  // Menu Cetak Sertifikat
  PERMOHONAN_BLANKO: { comp: FormPermohonanBlanko, icon: FileText },
  SERTIFIKAT: { comp: FormSertifikat, icon: Award },
}

const ROLE_OF = (role) => (['admin', 'superadmin'].includes(role) ? 'admin' : role === 'pimpinan' ? 'pimpinan' : role)

// ── Kartu form: handle input permission + tombol validasi ──────────────
function UjiFormCard({ meta, ujiId, uji, role }) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const entry = FORM_COMPONENTS[meta.kode_form]
  if (!entry) return null
  const Icon = entry.icon
  const Comp = entry.comp
  const myRole = ROLE_OF(role)
  const isSuper = role === 'superadmin'
  const canInput = isSuper || myRole === meta.input
  const canValidasi = isSuper || myRole === meta.validasi
  const isValidated = meta.status === 'DIVALIDASI'
  const readOnly = !canInput || isValidated

  const mutVal = useMutation({
    mutationFn: () => validasiUjiForm(ujiId, meta.kode_form),
    onSuccess: () => { toast.success(`${meta.kode_form} divalidasi`); qc.invalidateQueries({ queryKey: ['uji-forms', ujiId] }); qc.invalidateQueries({ queryKey: ['uji-form', ujiId, meta.kode_form] }) },
    onError: (e) => toast.error(e.response?.data?.detail || 'Gagal validasi'),
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50">
        <div className="flex items-center gap-3">
          <Icon size={17} className="text-blue-500" />
          <div>
            <p className="font-semibold text-gray-900 text-sm">{meta.label}</p>
            <p className="text-xs text-gray-400">Input: {meta.input} · Validasi: {meta.validasi}</p>
          </div>
          {isValidated
            ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1"><ShieldCheck size={12} /> Divalidasi</span>
            : meta.terisi ? <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock size={12} /> Draft</span> : null}
          {readOnly && !isValidated && <Lock size={13} className="text-gray-300" />}
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 pb-6 border-t border-gray-100 pt-4">
          <Comp ujiId={ujiId} uji={uji} readOnly={readOnly} />
          <EventSignature uji={uji} meta={meta} signAsesor={entry.signAsesor} />
          {/* Tombol validasi untuk role validasi */}
          {canValidasi && meta.terisi && !isValidated && (
            <button onClick={() => mutVal.mutate()} disabled={mutVal.isPending}
              className="mt-4 flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-semibold">
              <ShieldCheck size={15} /> {mutVal.isPending ? 'Memvalidasi...' : 'Validasi Form'}
            </button>
          )}
          {isValidated && (
            <p className="mt-3 text-xs text-green-600 flex items-center gap-1"><CheckCircle size={13} /> Sudah divalidasi oleh {meta.divalidasi_oleh} {meta.divalidasi_at ? `· ${new Date(meta.divalidasi_at).toLocaleString('id-ID')}` : ''}</p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * UjiFormSection — daftar dokumen untuk satu menu (uji/pleno/sertifikat).
 * Props: ujiId, uji (objek event), role, menu
 */
export default function UjiFormSection({ ujiId, uji, role, menu = 'uji' }) {
  const { data, isLoading } = useQuery({
    queryKey: ['uji-forms', ujiId, menu],
    queryFn: () => listUjiForms(ujiId, menu).then(r => r.data.data),
    retry: false,
  })
  const forms = (data || []).filter(f => FORM_COMPONENTS[f.kode_form])
  if (isLoading) return <p className="text-sm text-gray-400">Memuat dokumen...</p>
  if (forms.length === 0) return <p className="text-sm text-gray-400 italic">Belum ada dokumen untuk menu ini.</p>
  return (
    <div className="space-y-3">
      {forms.map(meta => <UjiFormCard key={meta.kode_form} meta={meta} ujiId={ujiId} uji={uji} role={role} />)}
    </div>
  )
}
