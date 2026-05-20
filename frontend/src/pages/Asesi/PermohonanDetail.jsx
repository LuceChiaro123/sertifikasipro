import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPermohonanById, submitAPL01, getAPL01, submitAPL02, getAPL02,
  getSertifikatPermohonan, getBanding, submitBanding,
} from '../../services/permohonan'
import { getKeputusan } from '../../services/admin'
import { uploadFile } from '../../services/admin'
import api from '../../services/api'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  ArrowLeft, ChevronDown, ChevronUp, Save, CheckCircle, Clock,
  Video, Upload, FileCheck, Award, AlertTriangle, MessageSquare,
  Shield, Calendar, User,
} from 'lucide-react'

const STATUS_STEPS = [
  { key: 'SUBMITTED', label: 'Diajukan' },
  { key: 'DOKUMEN_DIKAJI', label: 'Dokumen Dikaji' },
  { key: 'DIJADWALKAN', label: 'Dijadwalkan' },
  { key: 'ASESMEN_BERLANGSUNG', label: 'Asesmen' },
  { key: 'KEPUTUSAN_DIBUAT', label: 'Keputusan' },
  { key: 'SERTIFIKAT_DITERBITKAN', label: 'Sertifikat' },
  { key: 'SELESAI', label: 'Selesai' },
]

// Status yang dianggap sudah melewati langkah tertentu
const STATUS_ORDER = {
  SUBMITTED: 0, DOKUMEN_DIKAJI: 1, DIJADWALKAN: 2,
  ASESMEN_BERLANGSUNG: 3, KEPUTUSAN_DIBUAT: 4,
  SERTIFIKAT_DITERBITKAN: 5, SELESAI: 6,
  DITOLAK: -1, BANDING: 4,
}

function StepTracker({ currentStatus }) {
  const idx = STATUS_ORDER[currentStatus] ?? 0
  if (currentStatus === 'DITOLAK') {
    return (
      <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
        <AlertTriangle size={16} /> Permohonan ditolak
      </div>
    )
  }
  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-1">
      {STATUS_STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div className="flex flex-col items-center min-w-[60px]">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2
              ${i < idx ? 'bg-blue-600 border-blue-600 text-white'
                : i === idx ? 'border-blue-600 bg-white text-blue-600'
                : 'border-gray-200 bg-white text-gray-300'}`}>
              {i < idx ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span className={`text-xs mt-1 text-center leading-tight ${i <= idx ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
              {step.label}
            </span>
          </div>
          {i < STATUS_STEPS.length - 1 && (
            <div className={`h-0.5 w-8 mx-0.5 mb-5 ${i < idx ? 'bg-blue-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function Collapsible({ title, children, defaultOpen = false, badge, icon: Icon }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-blue-500" />}
          <span className="font-semibold text-gray-900">{title}</span>
          {badge && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{badge}</span>}
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      {open && <div className="px-6 pb-6 border-t border-gray-100 pt-4">{children}</div>}
    </div>
  )
}

// ── E-Sertifikat Card ─────────────────────────────────────────────────
function SertifikatCard({ permohonanId, asesiNama }) {
  const { data } = useQuery({
    queryKey: ['sertifikat', permohonanId],
    queryFn: () => getSertifikatPermohonan(permohonanId).catch(() => null),
    retry: false,
  })
  const sert = data?.data?.data
  if (!sert) return null

  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Award size={24} className="text-white" />
          </div>
          <div>
            <p className="text-blue-100 text-xs font-medium uppercase tracking-wide">Sertifikat Kompetensi</p>
            <p className="text-white font-bold text-lg">{sert.nama_skema}</p>
          </div>
        </div>
        {sert.is_active && (
          <span className="bg-green-400 text-green-900 text-xs font-bold px-3 py-1 rounded-full">AKTIF</span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <User size={14} className="text-blue-200" />
          <span className="text-blue-100 text-sm">{asesiNama || sert.nama_asesi}</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-blue-200" />
          <span className="text-white font-mono font-bold tracking-wider text-sm">{sert.nomor_sertifikat}</span>
        </div>
      </div>

      <div className="border-t border-white/20 pt-3 flex justify-between text-xs text-blue-100">
        <div>
          <p className="opacity-70">Terbit</p>
          <p className="font-semibold text-white">{new Date(sert.tanggal_terbit).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</p>
        </div>
        <div className="text-center">
          <p className="opacity-70">Skema</p>
          <p className="font-semibold text-white">{sert.kode_skema}</p>
        </div>
        <div className="text-right">
          <p className="opacity-70">Berakhir</p>
          <p className="font-semibold text-white">{new Date(sert.tanggal_berakhir).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</p>
        </div>
      </div>
    </div>
  )
}

// ── Dokumen Upload ────────────────────────────────────────────────────
function DokumenUpload() {
  const qc = useQueryClient()
  // Ambil dokumen yang SUDAH disimpan (persist saat refresh halaman)
  const { data: profileData } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/auth/profile/me').then(r => r.data),
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const saved = profileData?.data || {}

  const [docs, setDocs] = useState({ foto_url: null, ktp_url: null, ijazah_url: null })
  const [uploading, setUploading] = useState({})

  // Sync state dari data yang sudah ada di DB saat mount/data berubah
  useEffect(() => {
    if (saved) {
      setDocs({
        foto_url: saved.foto_url || null,
        ktp_url: saved.ktp_url || null,
        ijazah_url: saved.ijazah_url || null,
      })
    }
  }, [saved.foto_url, saved.ktp_url, saved.ijazah_url])

  const handleUpload = async (field, file) => {
    if (!file) return
    setUploading((u) => ({ ...u, [field]: true }))
    try {
      // 1) Upload file ke /upload
      const res = await uploadFile(file)
      const url = res.data.data.url
      // 2) Langsung simpan URL ke profile asesi (tidak perlu klik "Simpan" lagi)
      await api.patch('/auth/profile/documents', { [field]: url })
      setDocs((d) => ({ ...d, [field]: url }))
      qc.invalidateQueries({ queryKey: ['my-profile'] })
      qc.invalidateQueries({ queryKey: ['permohonan'] })
      toast.success('Dokumen berhasil disimpan')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal mengupload (maks 5MB)')
    } finally {
      setUploading((u) => ({ ...u, [field]: false }))
    }
  }

  const DOC_FIELDS = [
    { key: 'foto_url', label: 'Pas Foto (JPG/PNG)', accept: '.jpg,.jpeg,.png', icon: '🖼️' },
    { key: 'ktp_url', label: 'KTP / Kartu Identitas (JPG/PDF)', accept: '.jpg,.jpeg,.png,.pdf', icon: '🪪' },
    { key: 'ijazah_url', label: 'Ijazah / Bukti Pendidikan (PDF/JPG)', accept: '.jpg,.jpeg,.png,.pdf', icon: '📄' },
  ]

  const apiRoot = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '')

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Upload dokumen persyaratan sertifikasi. Ukuran maks. 5 MB per file.
        Dokumen tersimpan otomatis dan dapat dilihat oleh asesor & admin.
      </p>
      {DOC_FIELDS.map(({ key, label, accept, icon }) => {
        const url = docs[key]
        const fullUrl = url && (url.startsWith('http') ? url : `${apiRoot}${url}`)
        return (
          <div key={key} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
            <span className="text-2xl">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">{label}</p>
              {url ? (
                <a href={fullUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-green-600 mt-0.5 inline-flex items-center gap-1 hover:underline">
                  <FileCheck size={12} /> {url.split('/').pop()}
                </a>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5">Belum diupload</p>
              )}
            </div>
            <label className={`cursor-pointer flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 ${uploading[key] ? 'opacity-50' : ''}`}>
              <Upload size={14} />
              {uploading[key] ? 'Mengupload...' : url ? 'Ganti' : 'Upload'}
              <input
                type="file"
                className="hidden"
                accept={accept}
                onChange={(e) => handleUpload(key, e.target.files[0])}
                disabled={uploading[key]}
              />
            </label>
          </div>
        )
      })}
    </div>
  )
}

// ── Banding Form ──────────────────────────────────────────────────────
function BandingSection({ permohonanId }) {
  const qc = useQueryClient()
  const [alasan, setAlasan] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const { data: bandingData } = useQuery({
    queryKey: ['banding', permohonanId],
    queryFn: () => getBanding(permohonanId).catch(() => null),
    retry: false,
  })
  const banding = bandingData?.data?.data

  const mut = useMutation({
    mutationFn: () => submitBanding(permohonanId, { alasan }),
    onSuccess: () => {
      toast.success('Banding berhasil diajukan')
      setSubmitted(true)
      qc.invalidateQueries(['banding', permohonanId])
      qc.invalidateQueries(['permohonan', permohonanId])
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Gagal mengajukan banding'),
  })

  if (banding) {
    const statusColor = {
      PENDING: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      DITERIMA: 'bg-green-50 border-green-200 text-green-800',
      DITOLAK: 'bg-red-50 border-red-200 text-red-700',
    }[banding.status] || 'bg-gray-50 border-gray-200 text-gray-700'

    return (
      <div className={`rounded-xl p-4 border ${statusColor}`}>
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare size={16} />
          <span className="font-semibold">Banding — {banding.status}</span>
        </div>
        <p className="text-sm mb-1"><strong>Alasan:</strong> {banding.alasan}</p>
        {banding.keputusan_banding && (
          <p className="text-sm"><strong>Keputusan:</strong> {banding.keputusan_banding}</p>
        )}
        <p className="text-xs opacity-70 mt-2">
          Diajukan: {new Date(banding.diajukan_at).toLocaleString('id-ID')}
        </p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <CheckCircle size={16} /> Banding berhasil diajukan
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
        Jika Anda keberatan dengan keputusan Belum Kompeten, Anda dapat mengajukan banding.
        Banding akan ditinjau oleh Pimpinan LSP.
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Banding</label>
        <textarea
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          rows={4}
          placeholder="Jelaskan alasan Anda mengajukan banding secara lengkap..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
      <button
        onClick={() => mut.mutate()}
        disabled={!alasan.trim() || mut.isPending}
        className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-semibold"
      >
        <MessageSquare size={15} /> {mut.isPending ? 'Mengajukan...' : 'Ajukan Banding'}
      </button>
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

  const { data: keputusanData } = useQuery({
    queryKey: ['keputusan', id],
    queryFn: () => getKeputusan(id).catch(() => null),
    retry: false,
  })

  const p = data?.data?.data
  const keputusan = keputusanData?.data?.data

  if (isLoading) return <LoadingSpinner />
  if (!p) return <p className="text-gray-500">Permohonan tidak ditemukan.</p>

  const isSertifikatTerbit = p.status === 'SERTIFIKAT_DITERBITKAN' || p.status === 'SELESAI'
  const isBK = keputusan && keputusan.hasil === 'BK'
  const canBanding = isBK && (p.status === 'KEPUTUSAN_DIBUAT' || p.status === 'BANDING')

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

      {/* E-Sertifikat Card — muncul jika sudah terbit */}
      {isSertifikatTerbit && (
        <SertifikatCard permohonanId={id} asesiNama={p.asesi_nama} />
      )}

      {/* Hasil BK Banner */}
      {keputusan && keputusan.hasil === 'BK' && !isSertifikatTerbit && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-4">
          <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-800">Hasil: Belum Kompeten</p>
            {keputusan.catatan && <p className="text-sm text-red-700 mt-1">{keputusan.catatan}</p>}
            <p className="text-xs text-red-500 mt-1">
              Diputuskan: {keputusan.diputuskan_at ? new Date(keputusan.diputuskan_at).toLocaleString('id-ID') : '-'}
            </p>
          </div>
        </div>
      )}

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

      {/* Banding — hanya tampil jika BK */}
      {canBanding && (
        <Collapsible title="Ajukan Banding" icon={MessageSquare} defaultOpen={p.status === 'BANDING'}>
          <BandingSection permohonanId={id} />
        </Collapsible>
      )}

      {/* Dokumen Persyaratan */}
      <Collapsible title="Dokumen Persyaratan" defaultOpen={true} badge="Upload KTP, Foto, Ijazah">
        <DokumenUpload />
      </Collapsible>

      {/* APL01 */}
      <Collapsible title="FR-APL-01 — Permohonan Sertifikasi" icon={FileCheck}>
        <APL01Form permohonanId={id} />
      </Collapsible>

      {/* APL02 */}
      <Collapsible title="FR-APL-02 — Asesmen Mandiri" icon={FileCheck}>
        <APL02Form permohonanId={id} skemaNama={p.skema_nama} />
      </Collapsible>
    </div>
  )
}
