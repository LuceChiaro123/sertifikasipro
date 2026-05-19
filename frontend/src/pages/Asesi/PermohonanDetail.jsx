import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPermohonanById, submitAPL01, getAPL01, submitAPL02, getAPL02 } from '../../services/permohonan'
import { uploadFile } from '../../services/admin'
import api from '../../services/api'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { ArrowLeft, ChevronDown, ChevronUp, Save, CheckCircle, Clock, Video, Upload, FileCheck } from 'lucide-react'

const STATUS_STEPS = [
  { key: 'SUBMITTED', label: 'Diajukan' },
  { key: 'DOKUMEN_DIKAJI', label: 'Dokumen Dikaji' },
  { key: 'DIJADWALKAN', label: 'Dijadwalkan' },
  { key: 'ASESMEN_BERLANGSUNG', label: 'Asesmen' },
  { key: 'KEPUTUSAN_DIBUAT', label: 'Keputusan' },
  { key: 'SELESAI', label: 'Selesai' },
]

function StepTracker({ currentStatus }) {
  const idx = STATUS_STEPS.findIndex((s) => s.key === currentStatus)
  return (
    <div className="flex items-start gap-0 overflow-x-auto">
      {STATUS_STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2
              ${i < idx ? 'bg-blue-600 border-blue-600 text-white'
                : i === idx ? 'border-blue-600 bg-white text-blue-600'
                : 'border-gray-200 bg-white text-gray-300'}`}>
              {i < idx ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span className={`text-xs mt-1 whitespace-nowrap ${i <= idx ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              {step.label}
            </span>
          </div>
          {i < STATUS_STEPS.length - 1 && (
            <div className={`h-0.5 w-10 mx-1 mb-4 ${i < idx ? 'bg-blue-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function Collapsible({ title, children, defaultOpen = false, badge }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{title}</span>
          {badge && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{badge}</span>}
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      {open && <div className="px-6 pb-6 border-t border-gray-100 pt-4">{children}</div>}
    </div>
  )
}

// ── Dokumen Upload ────────────────────────────────────────────────────
function DokumenUpload() {
  const [docs, setDocs] = useState({ foto_url: null, ktp_url: null, ijazah_url: null })
  const [uploading, setUploading] = useState({})
  const [saved, setSaved] = useState(false)

  const handleUpload = async (field, file) => {
    if (!file) return
    setUploading((u) => ({ ...u, [field]: true }))
    try {
      const res = await uploadFile(file)
      const url = res.data.data.url
      setDocs((d) => ({ ...d, [field]: url }))
      toast.success('File berhasil diupload')
    } catch {
      toast.error('Gagal mengupload file. Maks 5MB.')
    } finally {
      setUploading((u) => ({ ...u, [field]: false }))
    }
  }

  const handleSave = async () => {
    try {
      await api.patch('/auth/profile/documents', docs)
      toast.success('Dokumen berhasil disimpan ke profil')
      setSaved(true)
    } catch {
      toast.error('Gagal menyimpan dokumen')
    }
  }

  const DOC_FIELDS = [
    { key: 'foto_url', label: 'Pas Foto (JPG/PNG)', accept: '.jpg,.jpeg,.png', icon: '🖼️' },
    { key: 'ktp_url', label: 'KTP / Kartu Identitas (JPG/PDF)', accept: '.jpg,.jpeg,.png,.pdf', icon: '🪪' },
    { key: 'ijazah_url', label: 'Ijazah / Bukti Pendidikan (PDF/JPG)', accept: '.jpg,.jpeg,.png,.pdf', icon: '📄' },
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Upload dokumen persyaratan sertifikasi. Ukuran maks. 5 MB per file.</p>
      {DOC_FIELDS.map(({ key, label, accept, icon }) => (
        <div key={key} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
          <span className="text-2xl">{icon}</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">{label}</p>
            {docs[key]
              ? <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1"><FileCheck size={12} /> {docs[key].split('/').pop()}</p>
              : <p className="text-xs text-gray-400 mt-0.5">Belum diupload</p>}
          </div>
          <label className={`cursor-pointer flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 ${uploading[key] ? 'opacity-50' : ''}`}>
            <Upload size={14} />
            {uploading[key] ? 'Mengupload...' : docs[key] ? 'Ganti' : 'Upload'}
            <input
              type="file"
              className="hidden"
              accept={accept}
              onChange={(e) => handleUpload(key, e.target.files[0])}
              disabled={uploading[key]}
            />
          </label>
        </div>
      ))}
      {Object.values(docs).some(Boolean) && !saved && (
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
        >
          <Save size={15} /> Simpan Dokumen
        </button>
      )}
      {saved && (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle size={16} /> Dokumen tersimpan ke profil Anda
        </div>
      )}
    </div>
  )
}

// ── APL01 Form ────────────────────────────────────────────────────────
function APL01Form({ permohonanId }) {
  const qc = useQueryClient()
  const { data: existing } = useQuery({
    queryKey: ['apl01', permohonanId],
    queryFn: () => getAPL01(permohonanId).catch(() => null),
    retry: false,
  })
  const saved = existing?.data?.data

  const [form, setForm] = useState({
    nama_lengkap: '', nik: '', tempat_lahir: '', tanggal_lahir: '',
    jenis_kelamin: 'L', pendidikan: '', pekerjaan: '', alamat: '',
    telepon: '', email: '', tujuan_sertifikasi: 'sertifikasi_baru',
  })

  const mut = useMutation({
    mutationFn: () => submitAPL01(permohonanId, { data_json: form }),
    onSuccess: () => { toast.success('APL-01 berhasil disimpan'); qc.invalidateQueries(['apl01', permohonanId]) },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan APL-01'),
  })

  if (saved) {
    const d = saved.data_json
    return (
      <div>
        <div className="flex items-center gap-2 text-green-600 mb-4">
          <CheckCircle size={16} /> <span className="text-sm font-medium">APL-01 sudah diisi</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {Object.entries(d).map(([k, v]) => (
            <div key={k}>
              <p className="text-gray-500 capitalize text-xs">{k.replace(/_/g, ' ')}</p>
              <p className="font-medium text-gray-900">{v || '-'}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const fields = [
    ['nama_lengkap', 'Nama Lengkap', 'text'],
    ['nik', 'NIK', 'text'],
    ['tempat_lahir', 'Tempat Lahir', 'text'],
    ['tanggal_lahir', 'Tanggal Lahir', 'date'],
    ['pendidikan', 'Pendidikan Terakhir', 'text'],
    ['pekerjaan', 'Pekerjaan / Jabatan', 'text'],
    ['telepon', 'No. Telepon', 'tel'],
    ['email', 'Email', 'email'],
    ['alamat', 'Alamat Lengkap', 'text'],
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {fields.map(([key, label, type]) => (
          <div key={key} className={key === 'alamat' ? 'col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
          <select value={form.jenis_kelamin} onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="L">Laki-laki</option><option value="P">Perempuan</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tujuan Sertifikasi</label>
          <select value={form.tujuan_sertifikasi} onChange={(e) => setForm({ ...form, tujuan_sertifikasi: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="sertifikasi_baru">Sertifikasi Baru</option>
            <option value="sertifikasi_ulang">Sertifikasi Ulang</option>
            <option value="penyesuaian">Penyesuaian</option>
          </select>
        </div>
      </div>
      <button onClick={() => mut.mutate()} disabled={mut.isPending}
        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
        <Save size={15} /> {mut.isPending ? 'Menyimpan...' : 'Simpan APL-01'}
      </button>
    </div>
  )
}

// ── APL02 Form ────────────────────────────────────────────────────────
function APL02Form({ permohonanId, skemaNama }) {
  const qc = useQueryClient()
  const { data: existing } = useQuery({
    queryKey: ['apl02', permohonanId],
    queryFn: () => getAPL02(permohonanId).catch(() => null),
    retry: false,
  })
  const saved = existing?.data?.data

  const [unitList, setUnitList] = useState([
    { kode: '', nama: '', hasil: 'K', bukti: '' }
  ])

  const mut = useMutation({
    mutationFn: () => submitAPL02(permohonanId, { hasil_mandiri_json: { units: unitList } }),
    onSuccess: () => { toast.success('APL-02 berhasil disimpan'); qc.invalidateQueries(['apl02', permohonanId]) },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan APL-02'),
  })

  const updateUnit = (i, field, val) => {
    const u = [...unitList]; u[i] = { ...u[i], [field]: val }; setUnitList(u)
  }

  if (saved) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle size={16} className="text-green-600" />
          <span className="text-sm font-medium text-green-600">APL-02 sudah diisi</span>
          {saved.verified_at && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-2">✓ Diverifikasi asesor</span>}
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>{['Kode Unit', 'Nama Unit', 'Hasil Mandiri', 'Bukti'].map((h) => (
                <th key={h} className="text-left px-4 py-2 text-gray-500 font-medium text-xs">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {saved.hasil_mandiri_json?.units?.map((u, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-xs font-mono text-gray-600">{u.kode || '-'}</td>
                  <td className="px-4 py-2 text-gray-800">{u.nama || '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${u.hasil === 'K' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.hasil}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{u.bukti || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {saved.catatan_asesor && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            <strong>Catatan Asesor:</strong> {saved.catatan_asesor}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Isi penilaian mandiri untuk setiap unit kompetensi skema <strong>{skemaNama}</strong>.</p>
      <div className="space-y-2">
        {unitList.map((u, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center p-3 bg-gray-50 rounded-lg">
            <input placeholder="Kode Unit" value={u.kode} onChange={(e) => updateUnit(i, 'kode', e.target.value)}
              className="col-span-2 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <input placeholder="Nama Unit Kompetensi" value={u.nama} onChange={(e) => updateUnit(i, 'nama', e.target.value)}
              className="col-span-5 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <select value={u.hasil} onChange={(e) => updateUnit(i, 'hasil', e.target.value)}
              className="col-span-2 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="K">K — Kompeten</option>
              <option value="BK">BK — Belum</option>
            </select>
            <input placeholder="Bukti kompetensi" value={u.bukti} onChange={(e) => updateUnit(i, 'bukti', e.target.value)}
              className="col-span-2 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
            {unitList.length > 1 && (
              <button onClick={() => setUnitList(unitList.filter((_, idx) => idx !== i))}
                className="col-span-1 text-red-400 hover:text-red-600 text-center text-xs">✕</button>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-3 items-center">
        <button onClick={() => setUnitList([...unitList, { kode: '', nama: '', hasil: 'K', bukti: '' }])}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Tambah Unit</button>
        <button onClick={() => mut.mutate()} disabled={mut.isPending}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
          <Save size={15} /> {mut.isPending ? 'Menyimpan...' : 'Simpan APL-02'}
        </button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────
export default function PermohonanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['permohonan', id],
    queryFn: () => getPermohonanById(id),
    retry: false,
  })
  const p = data?.data?.data

  if (isLoading) return <LoadingSpinner />
  if (!p) return <p className="text-gray-500">Permohonan tidak ditemukan.</p>

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/asesi/permohonan')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{p.skema_nama || 'Detail Permohonan'}</h1>
          <p className="text-sm text-gray-500 flex items-center gap-2">{p.skema_kode} · <StatusBadge status={p.status} /></p>
        </div>
      </div>

      {/* Progress tracker */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <StepTracker currentStatus={p.status} />
      </div>

      {/* Jadwal asesmen */}
      {p.tanggal_asesmen && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 flex items-start gap-4">
          <Clock size={20} className="text-blue-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-blue-900">Jadwal Asesmen</p>
            <p className="text-sm text-blue-700 mt-1">
              {new Date(p.tanggal_asesmen).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
            </p>
            {p.asesor_nama && <p className="text-sm text-blue-600 mt-1">Asesor: <strong>{p.asesor_nama}</strong></p>}
            {p.tuk_nama && <p className="text-sm text-blue-600">TUK: <strong>{p.tuk_nama}</strong></p>}
          </div>
          {p.link_video_conference && (
            <a href={p.link_video_conference} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0">
              <Video size={15} /> Bergabung
            </a>
          )}
        </div>
      )}

      {/* Catatan admin */}
      {p.catatan_admin && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          <strong>Catatan Admin:</strong> {p.catatan_admin}
        </div>
      )}

      {/* Dokumen Persyaratan */}
      <Collapsible title="Dokumen Persyaratan" defaultOpen={true} badge="Upload KTP, Foto, Ijazah">
        <DokumenUpload />
      </Collapsible>

      {/* APL01 */}
      <Collapsible title="FR-APL-01 — Permohonan Sertifikasi">
        <APL01Form permohonanId={id} />
      </Collapsible>

      {/* APL02 */}
      <Collapsible title="FR-APL-02 — Asesmen Mandiri">
        <APL02Form permohonanId={id} skemaNama={p.skema_nama} />
      </Collapsible>
    </div>
  )
}
