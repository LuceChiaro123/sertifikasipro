import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
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
import ProsesAsesmen, { SignatureBlock } from '../../components/ProsesAsesmen'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import {
  ArrowLeft, ChevronDown, ChevronUp, Save, CheckCircle, Clock,
  Video, Upload, FileCheck, Award, AlertTriangle, MessageSquare,
  Shield, Calendar, User, FileSignature,
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
  // Dokumen kini dipusatkan di "Data Diri Saya" — di sini hanya tampil (read-only)
  const { data: profileData } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/auth/profile/me').then(r => r.data),
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const saved = profileData?.data || {}

  const DOC_FIELDS = [
    { key: 'foto_url', label: 'Pas Foto', icon: '🖼️' },
    { key: 'ktp_url', label: 'KTP / Kartu Identitas', icon: '🪪' },
    { key: 'ijazah_url', label: 'Ijazah / Bukti Pendidikan', icon: '📄' },
  ]
  const apiRoot = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '')
  const missing = DOC_FIELDS.some(({ key }) => !saved[key])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
        <p className="text-xs text-indigo-700">Dokumen diambil dari <strong>Data Diri Saya</strong> — upload/ganti dilakukan di sana, sekali untuk semua permohonan.</p>
        <Link to="/asesi/data-diri" className="shrink-0 text-xs font-medium text-indigo-700 underline hover:text-indigo-900">Kelola Data Diri</Link>
      </div>
      {DOC_FIELDS.map(({ key, label, icon }) => {
        const url = saved[key]
        const fullUrl = url && (url.startsWith('http') ? url : `${apiRoot}${url}`)
        return (
          <div key={key} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
            <span className="text-2xl">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">{label}</p>
              {url ? (
                <a href={fullUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-green-600 mt-0.5 inline-flex items-center gap-1 hover:underline">
                  <FileCheck size={12} /> Lihat berkas
                </a>
              ) : (
                <p className="text-xs text-amber-500 mt-0.5">Belum diupload — lengkapi di Data Diri</p>
              )}
            </div>
            {url
              ? <span className="text-xs text-green-600 inline-flex items-center gap-1"><CheckCircle size={13} /> Tersedia</span>
              : <Link to="/asesi/data-diri" className="text-xs text-indigo-600 underline">Upload di Data Diri</Link>}
          </div>
        )
      })}
      {missing && <p className="text-xs text-gray-400">Sebagian dokumen belum lengkap. Lengkapi sekali di halaman Data Diri Saya.</p>}
    </div>
  )
}

// ── Banding Form ──────────────────────────────────────────────────────
const BANDING_Q = [
  'Apakah Proses Banding telah dijelaskan kepada Anda?',
  'Apakah Anda telah mendiskusikan banding dengan asesor?',
  'Apakah Anda mau melibatkan "orang lain" membantu Anda dalam Proses Banding?',
]

function BandingSection({ permohonanId, p }) {
  const qc = useQueryClient()
  const [alasan, setAlasan] = useState('')
  const [kuesioner, setKuesioner] = useState({ q0: '', q1: '', q2: '', nama_asesor: p?.asesor_nama || '' })
  const [submitted, setSubmitted] = useState(false)

  const { data: bandingData } = useQuery({
    queryKey: ['banding', permohonanId],
    queryFn: () => getBanding(permohonanId).catch(() => null),
    retry: false,
  })
  const banding = bandingData?.data?.data

  const mut = useMutation({
    mutationFn: () => submitBanding(permohonanId, { alasan, kuesioner }),
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
        Anda berhak mengajukan banding jika menilai proses asesmen tidak sesuai SOP / prinsip asesmen.
        Banding akan ditinjau oleh Pimpinan LSP.
      </div>

      {/* Kuesioner FR.AK.04 */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700">Kuesioner Pengajuan Banding</p>
        {BANDING_Q.map((q, i) => (
          <div key={i} className="flex items-center justify-between gap-3 p-2.5 border border-gray-200 rounded-lg">
            <span className="text-sm text-gray-800">{i + 1}. {q}</span>
            <div className="flex gap-2 shrink-0">
              {['Ya', 'Tidak'].map(opt => (
                <button key={opt} type="button" onClick={() => setKuesioner(k => ({ ...k, [`q${i}`]: opt }))}
                  className={`px-3 py-1 rounded text-xs font-semibold border ${kuesioner[`q${i}`] === opt
                    ? (opt === 'Ya' ? 'bg-green-100 text-green-700 border-green-400' : 'bg-red-100 text-red-700 border-red-400')
                    : 'border-gray-200 text-gray-500'}`}>{opt}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Asesor</label>
        <input type="text" value={kuesioner.nama_asesor}
          onChange={(e) => setKuesioner(k => ({ ...k, nama_asesor: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Banding</label>
        <textarea
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          rows={4}
          placeholder="Jelaskan ketidaksesuaian proses/keputusan dengan SOP atau prinsip asesmen..."
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

// ── APL01 Form (FR.APL.01 — Permohonan Sertifikasi) ────────────────────
const APL01_LABELS = {
  nama_lengkap: 'Nama Lengkap', nik: 'No. KTP/NIK/Paspor', tempat_lahir: 'Tempat Lahir',
  tanggal_lahir: 'Tanggal Lahir', jenis_kelamin: 'Jenis Kelamin', kebangsaan: 'Kebangsaan',
  kode_pos: 'Kode Pos', alamat: 'Alamat Rumah', telp_rumah: 'No. Telp Rumah',
  telepon: 'No. HP / WhatsApp', email: 'E-mail Pribadi', pendidikan: 'Kualifikasi Pendidikan',
  institusi: 'Nama Institusi / Perusahaan', jabatan: 'Jabatan', kode_pos_kantor: 'Kode Pos Kantor',
  alamat_kantor: 'Alamat Kantor', telp_kantor: 'No. Telp Kantor', fax_kantor: 'Fax Kantor',
  email_kantor: 'E-mail Kantor', tujuan_asesmen: 'Tujuan Asesmen',
  ijazah_url: 'Ijazah', sertifikat_pelatihan_url: 'Sertifikat Pelatihan',
  ttd_nama: 'Nama Pemohon (TTD)', ttd_tanggal: 'Tanggal TTD',
}
const APL01_API_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '')

function APL01Form({ permohonanId, p }) {
  const qc = useQueryClient()
  const { data: existing } = useQuery({
    queryKey: ['apl01', permohonanId],
    queryFn: () => getAPL01(permohonanId).catch(() => null),
    retry: false,
  })
  const saved = existing?.data?.data

  const [form, setForm] = useState({
    // Bagian 1 — Data Pribadi
    nama_lengkap: '', nik: '', tempat_lahir: '', tanggal_lahir: '', jenis_kelamin: 'Laki-laki',
    kebangsaan: 'Indonesia', kode_pos: '', alamat: '', telp_rumah: '', telepon: '', email: '', pendidikan: '',
    // Bagian 1 — Data Pekerjaan
    institusi: '', jabatan: '', kode_pos_kantor: '', alamat_kantor: '', telp_kantor: '', fax_kantor: '', email_kantor: '',
    // Bagian 2 — Data Sertifikasi
    tujuan_asesmen: 'Sertifikasi',
    // Bagian 3 — Bukti Kelengkapan
    ijazah_url: '', sertifikat_pelatihan_url: '',
    // Persetujuan
    ttd_nama: '', ttd_tanggal: '',
  })
  const [uploading, setUploading] = useState({})

  // Prefill data pribadi dari profil akun (sekali) bila APL-01 belum pernah disimpan
  const { user } = useAuthStore()
  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/auth/profile/me').then(r => r.data.data),
    retry: false,
  })
  const [prefilled, setPrefilled] = useState(false)
  useEffect(() => {
    if (saved || prefilled) return
    if (profile || user) {
      const pj = profile?.profil || {}   // data diri lengkap (profil_json)
      setForm((f) => ({
        ...f,
        nama_lengkap: f.nama_lengkap || profile?.nama_lengkap || pj.nama_lengkap || '',
        nik: f.nik || profile?.nik || pj.nik || '',
        tempat_lahir: f.tempat_lahir || pj.tempat_lahir || '',
        tanggal_lahir: f.tanggal_lahir || pj.tanggal_lahir || '',
        jenis_kelamin: pj.jenis_kelamin || f.jenis_kelamin,
        kebangsaan: pj.kebangsaan || f.kebangsaan,
        kode_pos: f.kode_pos || pj.kode_pos || '',
        alamat: f.alamat || profile?.alamat || pj.alamat || '',
        telp_rumah: f.telp_rumah || pj.telp_rumah || '',
        telepon: f.telepon || profile?.telepon || pj.telepon || '',
        pendidikan: f.pendidikan || profile?.pendidikan || pj.pendidikan || '',
        email: f.email || user?.email || profile?.email || '',
        // Data pekerjaan
        institusi: f.institusi || pj.institusi || '',
        jabatan: f.jabatan || pj.jabatan || profile?.pekerjaan || '',
        kode_pos_kantor: f.kode_pos_kantor || pj.kode_pos_kantor || '',
        alamat_kantor: f.alamat_kantor || pj.alamat_kantor || '',
        telp_kantor: f.telp_kantor || pj.telp_kantor || '',
        fax_kantor: f.fax_kantor || pj.fax_kantor || '',
        email_kantor: f.email_kantor || pj.email_kantor || '',
      }))
      setPrefilled(true)
    }
  }, [saved, prefilled, profile, user]) // eslint-disable-line

  const mut = useMutation({
    // sertakan pekerjaan = jabatan agar tersinkron ke profil asesi
    mutationFn: () => submitAPL01(permohonanId, { data_json: { ...form, pekerjaan: form.jabatan } }),
    onSuccess: () => { toast.success('APL-01 berhasil disimpan'); qc.invalidateQueries(['apl01', permohonanId]) },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan APL-01'),
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleUpload = async (field, file) => {
    if (!file) return
    setUploading((u) => ({ ...u, [field]: true }))
    try {
      const res = await uploadFile(file)
      set(field, res.data.data.url)
      toast.success('Berkas terupload')
    } catch {
      toast.error('Gagal upload (maks 5MB)')
    } finally {
      setUploading((u) => ({ ...u, [field]: false }))
    }
  }

  // ── Tampilan setelah tersimpan ──
  if (saved) {
    const d = saved.data_json || {}
    const fileUrl = (u) => (u ? (u.startsWith('http') ? u : `${APL01_API_ROOT}${u}`) : null)
    const Section = ({ title, keys }) => (
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {keys.filter((k) => d[k]).map((k) => (
            <div key={k} className={k === 'alamat' || k === 'alamat_kantor' ? 'col-span-2' : ''}>
              <p className="text-gray-500 text-xs">{APL01_LABELS[k] || k}</p>
              {k.endsWith('_url')
                ? <a href={fileUrl(d[k])} target="_blank" rel="noreferrer" className="text-blue-600 text-xs hover:underline">Lihat berkas</a>
                : <p className="font-medium text-gray-900">{d[k] || '-'}</p>}
            </div>
          ))}
        </div>
      </div>
    )
    return (
      <div>
        <div className="flex items-center gap-2 text-green-600 mb-4">
          <CheckCircle size={16} /> <span className="text-sm font-medium">FR-APL-01 sudah diisi</span>
        </div>
        <Section title="Data Pribadi" keys={['nama_lengkap', 'nik', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'kebangsaan', 'kode_pos', 'alamat', 'telp_rumah', 'telepon', 'email', 'pendidikan']} />
        <Section title="Data Pekerjaan" keys={['institusi', 'jabatan', 'kode_pos_kantor', 'alamat_kantor', 'telp_kantor', 'fax_kantor', 'email_kantor']} />
        <Section title="Data Sertifikasi" keys={['tujuan_asesmen']} />
        <Section title="Bukti Kelengkapan" keys={['ijazah_url', 'sertifikat_pelatihan_url']} />
        <Section title="Persetujuan" keys={['ttd_nama', 'ttd_tanggal']} />
      </div>
    )
  }

  // Field yang sudah ada di profil/Data Diri → dikunci (auto-isi, tidak input berulang)
  const pj = profile?.profil || {}
  const has = (k) => !!(profile?.[k] || pj[k])
  const lockedKeys = {
    nama_lengkap: has('nama_lengkap'), nik: has('nik'), tempat_lahir: !!pj.tempat_lahir,
    tanggal_lahir: !!pj.tanggal_lahir, kode_pos: !!pj.kode_pos, alamat: has('alamat'),
    telp_rumah: !!pj.telp_rumah, telepon: has('telepon'), pendidikan: has('pendidikan'),
    email: !!(user?.email || profile?.email),
    institusi: !!pj.institusi, jabatan: !!(pj.jabatan || profile?.pekerjaan),
    kode_pos_kantor: !!pj.kode_pos_kantor, alamat_kantor: !!pj.alamat_kantor,
    telp_kantor: !!pj.telp_kantor, fax_kantor: !!pj.fax_kantor, email_kantor: !!pj.email_kantor,
  }
  const APL01_PH = {
    nama_lengkap: 'Nama sesuai KTP', nik: '16 digit NIK', tempat_lahir: 'Kota kelahiran',
    kebangsaan: 'mis. Indonesia', kode_pos: 'Kode pos', alamat: 'Alamat domisili',
    telp_rumah: 'No. telp rumah', telepon: '08xxxxxxxxxx', email: 'email@contoh.com', pendidikan: 'mis. S1',
    institusi: 'Nama perusahaan/instansi', jabatan: 'Jabatan Anda', kode_pos_kantor: 'Kode pos kantor',
    alamat_kantor: 'Alamat kantor', telp_kantor: 'No. telp kantor', fax_kantor: 'No. fax', email_kantor: 'email kantor',
  }

  // ── helper render (fungsi biasa, BUKAN komponen — agar input tidak remount) ──
  const field = (k, { type = 'text', full = false } = {}) => {
    const locked = !!lockedKeys[k]
    return (
      <div key={k} className={full ? 'col-span-2' : ''}>
        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
          {APL01_LABELS[k]}
          {locked && <span className="text-[10px] font-normal bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">dari profil</span>}
        </label>
        <input type={type} value={form[k]} disabled={locked} placeholder={APL01_PH[k] || ''}
          onChange={(e) => set(k, e.target.value)}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${locked ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''}`} />
      </div>
    )
  }

  const upload2 = (fieldKey, label) => {
    const url = form[fieldKey]
    const full = url && (url.startsWith('http') ? url : `${APL01_API_ROOT}${url}`)
    return (
      <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
        <FileCheck size={16} className={url ? 'text-green-500' : 'text-gray-300'} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          {url
            ? <a href={full} target="_blank" rel="noreferrer" className="text-xs text-green-600 hover:underline">{url.split('/').pop()}</a>
            : <p className="text-xs text-gray-400">Belum diupload</p>}
        </div>
        <label className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 ${uploading[fieldKey] ? 'opacity-50' : ''}`}>
          <Upload size={14} /> {uploading[fieldKey] ? 'Upload...' : url ? 'Ganti' : 'Upload'}
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleUpload(fieldKey, e.target.files[0])} disabled={uploading[fieldKey]} />
        </label>
      </div>
    )
  }

  const sectionTitle = (text) => (
    <div className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold mt-2">{text}</div>
  )

  // Berkas read-only diambil dari profil/Data Diri (tidak upload ulang di sini)
  const berkasProfil = (key, label) => {
    const url = profile?.[key]
    const full = url && (url.startsWith('http') ? url : `${APL01_API_ROOT}${url}`)
    return (
      <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
        <FileCheck size={16} className={url ? 'text-green-500' : 'text-gray-300'} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          {url
            ? <a href={full} target="_blank" rel="noreferrer" className="text-xs text-green-600 hover:underline inline-flex items-center gap-1"><FileCheck size={12} /> Lihat berkas</a>
            : <p className="text-xs text-amber-500">Belum diupload — lengkapi di Data Diri</p>}
        </div>
        {url
          ? <span className="text-xs text-green-600 inline-flex items-center gap-1"><CheckCircle size={13} /> Tersedia</span>
          : <Link to="/asesi/data-diri" className="text-xs text-indigo-600 underline">Upload di Data Diri</Link>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
        <p className="text-xs text-indigo-700">Field bertanda <strong>"dari profil"</strong> terisi otomatis dari <strong>Data Diri Saya</strong> — ubah di sana bila perlu, tidak perlu ketik ulang.</p>
        <Link to="/asesi/data-diri" className="shrink-0 text-xs font-medium text-indigo-700 underline hover:text-indigo-900">Kelola Data Diri</Link>
      </div>
      {/* Bagian 1 — Data Pribadi */}
      {sectionTitle('Bagian 1 — Data Pribadi')}
      <div className="grid grid-cols-2 gap-4">
        {field('nama_lengkap')}
        {field('nik')}
        {field('tempat_lahir')}
        {field('tanggal_lahir', { type: 'date' })}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
          <select value={form.jenis_kelamin} onChange={(e) => set('jenis_kelamin', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="Laki-laki">Laki-laki</option><option value="Wanita">Wanita</option>
          </select>
        </div>
        {field('kebangsaan')}
        {field('kode_pos')}
        {field('pendidikan')}
        {field('alamat', { full: true })}
        {field('telp_rumah', { type: 'tel' })}
        {field('telepon', { type: 'tel' })}
        {field('email', { type: 'email', full: true })}
      </div>

      {/* Data Pekerjaan */}
      {sectionTitle('Data Pekerjaan Sekarang')}
      <div className="grid grid-cols-2 gap-4">
        {field('institusi', { full: true })}
        {field('jabatan')}
        {field('kode_pos_kantor')}
        {field('alamat_kantor', { full: true })}
        {field('telp_kantor', { type: 'tel' })}
        {field('fax_kantor')}
        {field('email_kantor', { type: 'email', full: true })}
      </div>

      {/* Bagian 2 — Data Sertifikasi */}
      {sectionTitle('Bagian 2 — Data Sertifikasi')}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm">
        <p><span className="text-gray-500">Skema Sertifikasi:</span> <strong>{p?.skema_nama || '-'}</strong></p>
        {p?.skema_kode && <p className="text-gray-500 text-xs mt-0.5">Nomor: {p.skema_kode}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tujuan Asesmen</label>
        <div className="flex flex-wrap gap-2">
          {['Sertifikasi', 'PKT', 'RPL', 'Lainnya'].map((opt) => (
            <button key={opt} type="button" onClick={() => set('tujuan_asesmen', opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition
                ${form.tujuan_asesmen === opt ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-blue-400'}`}>
              {opt === 'PKT' ? 'Pengakuan Kompetensi Terkini (PKT)' : opt === 'RPL' ? 'Rekognisi Pembelajaran Lampau (RPL)' : opt}
            </button>
          ))}
        </div>
      </div>

      {/* Bagian 3 — Bukti Kelengkapan (dari Data Diri) */}
      {sectionTitle('Bagian 3 — Bukti Kelengkapan Pemohon')}
      <div className="flex items-center justify-between gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
        <p className="text-xs text-indigo-700">Berkas diambil dari <strong>Data Diri Saya</strong> — upload/ganti dilakukan di sana, sekali untuk semua permohonan. Verifikasi (MS/TMS) oleh Admin LSP saat validasi.</p>
        <Link to="/asesi/data-diri" className="shrink-0 text-xs font-medium text-indigo-700 underline hover:text-indigo-900">Kelola Data Diri</Link>
      </div>
      {berkasProfil('ijazah_url', 'Ijazah min. SMA/SMK atau sederajat')}
      {berkasProfil('sertifikat_pelatihan_url', 'Sertifikat pelatihan berbasis kompetensi (jika ada)')}

      {/* Persetujuan / Tanda Tangan Pemohon */}
      {sectionTitle('Persetujuan Pemohon')}
      <div className="grid grid-cols-2 gap-4">
        {field('ttd_nama')}
        {field('ttd_tanggal', { type: 'date' })}
      </div>
      <SignatureBlock p={p} role={user?.role} showAsesor={false} />

      <button onClick={() => mut.mutate()} disabled={mut.isPending}
        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
        <Save size={15} /> {mut.isPending ? 'Menyimpan...' : 'Simpan FR-APL-01'}
      </button>
    </div>
  )
}

// ── APL02 Form (FR.APL.02 — Asesmen Mandiri, pre-defined dari skema) ────
const APL02_API_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '')

// Normalisasi unit skema → daftar elemen (jika skema belum punya elemen, unit jadi 1 elemen)
function unitToElemen(u) {
  if (Array.isArray(u.elemen) && u.elemen.length) return u.elemen
  return [{ nama: u.nama, kuk: [] }]
}

function APL02Form({ permohonanId, p }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { data: existing } = useQuery({
    queryKey: ['apl02', permohonanId],
    queryFn: () => getAPL02(permohonanId).catch(() => null),
    retry: false,
  })
  const saved = existing?.data?.data

  // Unit kompetensi pre-defined dari skema
  const { data: skema } = useQuery({
    queryKey: ['skema-detail', p?.skema_id],
    queryFn: () => api.get(`/portal/skema/${p.skema_id}`).then(r => r.data.data),
    enabled: !!p?.skema_id,
    retry: false,
  })
  const units = skema?.unit_kompetensi || []

  // penilaian: { "kode::elemenIdx": { hasil, bukti, bukti_url } }
  const [nilai, setNilai] = useState({})
  const [tgl, setTgl] = useState('')
  const [uploading, setUploading] = useState({})

  const setVal = (key, field, val) => setNilai(n => ({ ...n, [key]: { ...n[key], [field]: val } }))

  const handleUpload = async (key, file) => {
    if (!file) return
    setUploading(u => ({ ...u, [key]: true }))
    try {
      const res = await uploadFile(file)
      setVal(key, 'bukti_url', res.data.data.url)
      toast.success('Bukti terupload')
    } catch { toast.error('Gagal upload (maks 5MB)') }
    finally { setUploading(u => ({ ...u, [key]: false })) }
  }

  const mut = useMutation({
    mutationFn: () => {
      const payloadUnits = units.map(u => ({
        kode: u.kode, nama: u.nama,
        elemen: unitToElemen(u).map((el, ei) => {
          const v = nilai[`${u.kode}::${ei}`] || {}
          return { nama: el.nama, kuk: el.kuk || [], hasil: v.hasil || '', bukti: v.bukti || '', bukti_url: v.bukti_url || '' }
        }),
      }))
      return submitAPL02(permohonanId, { hasil_mandiri_json: { units: payloadUnits, tanggal_pengisian: tgl } })
    },
    onSuccess: () => { toast.success('APL-02 berhasil disimpan'); qc.invalidateQueries(['apl02', permohonanId]) },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan APL-02'),
  })

  // ── Tampilan setelah tersimpan (read-only) ──
  if (saved) {
    const j = saved.hasil_mandiri_json || {}
    const fileUrl = (u) => (u ? (u.startsWith('http') ? u : `${APL02_API_ROOT}${u}`) : null)
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle size={16} className="text-green-600" />
          <span className="text-sm font-medium text-green-600">FR-APL-02 sudah diisi</span>
          {saved.verified_at && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-2">✓ Diverifikasi asesor</span>}
        </div>
        {(j.units || []).map((u, ui) => (
          <div key={ui} className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-slate-700 text-white px-3 py-2 text-sm font-semibold flex justify-between">
              <span>Unit {ui + 1}: {u.nama}</span><span className="font-mono text-xs">{u.kode}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {/* dukung struktur lama (u.hasil) & baru (u.elemen) */}
              {(u.elemen || [{ nama: u.nama, kuk: [], hasil: u.hasil, bukti: u.bukti }]).map((el, ei) => (
                <div key={ei} className="px-3 py-2 text-sm flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-gray-800">{el.nama}</p>
                    {el.bukti && <p className="text-xs text-gray-500 mt-0.5">Bukti: {el.bukti}</p>}
                    {el.bukti_url && <a href={fileUrl(el.bukti_url)} target="_blank" rel="noreferrer" className="text-xs text-green-600 hover:underline">Lihat berkas bukti</a>}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold shrink-0 ${el.hasil === 'K' ? 'bg-green-100 text-green-700' : el.hasil === 'BK' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{el.hasil || '-'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {saved.catatan_asesor && (
          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            <strong>Catatan Asesor:</strong> {saved.catatan_asesor}
          </div>
        )}
        <SignatureBlock p={p} role={user?.role} />
      </div>
    )
  }

  if (units.length === 0) {
    return <p className="text-sm text-gray-400 italic">Skema belum memiliki daftar unit kompetensi. Hubungi admin LSP.</p>
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
        Beri penilaian mandiri (<strong>K</strong> = Kompeten / <strong>BK</strong> = Belum) untuk tiap elemen kompetensi,
        dan tuliskan/unggah bukti yang relevan.
      </div>

      {units.map((u, ui) => (
        <div key={u.kode || ui} className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-slate-700 text-white px-3 py-2 text-sm font-semibold flex justify-between items-center">
            <span>Unit Kompetensi {ui + 1}: {u.nama}</span>
            <span className="font-mono text-xs opacity-90">{u.kode}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {unitToElemen(u).map((el, ei) => {
              const key = `${u.kode}::${ei}`
              const v = nilai[key] || {}
              const full = v.bukti_url && (v.bukti_url.startsWith('http') ? v.bukti_url : `${APL02_API_ROOT}${v.bukti_url}`)
              return (
                <div key={ei} className="p-3">
                  <p className="text-sm font-semibold text-emerald-800 mb-1">Elemen {ei + 1}: {el.nama}</p>
                  {el.kuk?.length > 0 && (
                    <ul className="list-disc pl-5 mb-2 space-y-0.5">
                      {el.kuk.map((k, ki) => <li key={ki} className="text-xs text-gray-500">{k}</li>)}
                    </ul>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500">Penilaian:</span>
                    {['K', 'BK'].map(opt => (
                      <button key={opt} type="button" onClick={() => setVal(key, 'hasil', opt)}
                        className={`px-3 py-1 rounded text-xs font-bold border ${v.hasil === opt
                          ? (opt === 'K' ? 'bg-green-100 text-green-700 border-green-400' : 'bg-red-100 text-red-700 border-red-400')
                          : 'border-gray-200 text-gray-500'}`}>{opt}</button>
                    ))}
                    <input type="text" value={v.bukti || ''} placeholder="Nama/keterangan bukti"
                      onChange={(e) => setVal(key, 'bukti', e.target.value)}
                      className="flex-1 min-w-[140px] px-2 py-1 border border-gray-300 rounded text-xs" />
                    <label className={`cursor-pointer flex items-center gap-1 px-2 py-1 border rounded text-xs text-gray-600 hover:bg-gray-50 ${uploading[key] ? 'opacity-50' : ''}`}>
                      <Upload size={12} /> {uploading[key] ? '...' : full ? 'Ganti' : 'Upload'}
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleUpload(key, e.target.files[0])} disabled={uploading[key]} />
                    </label>
                    {full && <a href={full} target="_blank" rel="noreferrer" className="text-xs text-green-600 hover:underline"><FileCheck size={12} className="inline" /></a>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pengisian</label>
        <input type="date" value={tgl} onChange={(e) => setTgl(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
      </div>

      <SignatureBlock p={p} role={user?.role} />

      <button onClick={() => mut.mutate()} disabled={mut.isPending}
        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
        <Save size={15} /> {mut.isPending ? 'Menyimpan...' : 'Simpan FR-APL-02'}
      </button>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────
export default function PermohonanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

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
  // Form proses asesmen tampil mulai asesmen berlangsung
  const showProsesAsesmen = ['ASESMEN_BERLANGSUNG', 'KEPUTUSAN_DIBUAT', 'SERTIFIKAT_DITERBITKAN', 'SELESAI', 'BANDING'].includes(p.status)

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
        <Collapsible title="Ajukan Banding (FR.AK.04)" icon={MessageSquare} defaultOpen={p.status === 'BANDING'}>
          <BandingSection permohonanId={id} p={p} />
        </Collapsible>
      )}

      {/* Dokumen Persyaratan */}
      <Collapsible title="Dokumen Persyaratan" defaultOpen={true} badge="Upload KTP, Foto, Ijazah">
        <DokumenUpload />
      </Collapsible>

      {/* APL01 */}
      <Collapsible title="FR-APL-01 — Permohonan Sertifikasi" icon={FileCheck}>
        <APL01Form permohonanId={id} p={p} />
      </Collapsible>

      {/* APL02 */}
      <Collapsible title="FR-APL-02 — Asesmen Mandiri" icon={FileCheck}>
        <APL02Form permohonanId={id} p={p} />
      </Collapsible>

      {/* Form Proses Asesmen (BNSP) — yang diisi asesi */}
      {showProsesAsesmen && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <FileSignature size={18} className="text-blue-600" /> Form Proses Asesmen (BNSP)
          </h2>
          <p className="text-xs text-gray-400 mb-4">Form yang Anda isi selama/ setelah sesi asesmen. Form milik asesor hanya dapat dilihat (hanya-baca).</p>
          <ProsesAsesmen permohonanId={id} p={p} role={user?.role} />
        </div>
      )}
    </div>
  )
}
