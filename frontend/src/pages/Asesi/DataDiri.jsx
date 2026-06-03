import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProfileMe, updateDataDiri, updateProfileDocuments, updateProfileTtd } from '../../services/auth'
import { uploadFile } from '../../services/admin'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { User, Briefcase, FolderOpen, Upload, FileCheck, Save, PenLine, IdCard, Image, GraduationCap } from 'lucide-react'

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '')
const fileUrl = (u) => (u ? (u.startsWith('http') ? u : `${API_ROOT}${u}`) : null)

// Field data pribadi & pekerjaan (= field APL-01) yang disimpan ke profil
const PRIBADI = [
  ['nama_lengkap', 'Nama Lengkap', 'text'],
  ['nik', 'NIK / No. KTP', 'text'],
  ['tempat_lahir', 'Tempat Lahir', 'text'],
  ['tanggal_lahir', 'Tanggal Lahir', 'date'],
  ['jenis_kelamin', 'Jenis Kelamin', 'select'],
  ['kebangsaan', 'Kebangsaan', 'text'],
  ['pendidikan', 'Pendidikan Terakhir', 'text'],
  ['telepon', 'No. HP / Telepon', 'tel'],
  ['telp_rumah', 'No. Telp Rumah', 'tel'],
  ['kode_pos', 'Kode Pos', 'text'],
  ['alamat', 'Alamat Rumah', 'textarea'],
]
const PEKERJAAN = [
  ['pekerjaan', 'Pekerjaan', 'text'],
  ['institusi', 'Nama Institusi / Perusahaan', 'text'],
  ['jabatan', 'Jabatan', 'text'],
  ['telp_kantor', 'No. Telp Kantor', 'tel'],
  ['fax_kantor', 'No. Fax Kantor', 'tel'],
  ['email_kantor', 'Email Kantor', 'email'],
  ['kode_pos_kantor', 'Kode Pos Kantor', 'text'],
  ['alamat_kantor', 'Alamat Kantor', 'textarea'],
]

// Berkas yang dipusatkan di sini
const BERKAS = [
  ['foto_url', 'Pas Foto 3×4', Image, '.jpg,.jpeg,.png'],
  ['ktp_url', 'KTP / Kartu Identitas', IdCard, '.jpg,.jpeg,.png,.pdf'],
  ['ijazah_url', 'Ijazah / Bukti Pendidikan', GraduationCap, '.jpg,.jpeg,.png,.pdf'],
  ['sertifikat_pelatihan_url', 'Sertifikat Pelatihan (opsional)', FileCheck, '.jpg,.jpeg,.png,.pdf'],
]

const ALL_DATA_KEYS = [...PRIBADI, ...PEKERJAAN].map(([k]) => k)

export default function DataDiri() {
  const qc = useQueryClient()
  const { data: profile, isLoading } = useQuery({ queryKey: ['my-profile'], queryFn: () => getProfileMe().then(r => r.data.data) })

  const [form, setForm] = useState({})
  const [synced, setSynced] = useState(false)
  const [uploading, setUploading] = useState({})

  // Hidrasi form dari profil (kolom inti + profil_json)
  useEffect(() => {
    if (profile && !synced) {
      const p = profile.profil || {}
      setForm({
        nama_lengkap: profile.nama_lengkap || p.nama_lengkap || '',
        nik: profile.nik || p.nik || '',
        alamat: profile.alamat || p.alamat || '',
        telepon: profile.telepon || p.telepon || '',
        pendidikan: profile.pendidikan || p.pendidikan || '',
        pekerjaan: profile.pekerjaan || p.pekerjaan || '',
        tempat_lahir: p.tempat_lahir || '', tanggal_lahir: p.tanggal_lahir || '',
        jenis_kelamin: p.jenis_kelamin || 'Laki-laki', kebangsaan: p.kebangsaan || 'Indonesia',
        kode_pos: p.kode_pos || '', telp_rumah: p.telp_rumah || '',
        institusi: p.institusi || '', jabatan: p.jabatan || '', kode_pos_kantor: p.kode_pos_kantor || '',
        alamat_kantor: p.alamat_kantor || '', telp_kantor: p.telp_kantor || '', fax_kantor: p.fax_kantor || '', email_kantor: p.email_kantor || '',
      })
      setSynced(true)
    }
  }, [profile, synced])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Validasi
  const errs = {}
  if (form.nik && !/^\d{16}$/.test(form.nik)) errs.nik = 'NIK harus tepat 16 digit angka'
  if (form.telepon && !/^0\d{8,14}$/.test(form.telepon)) errs.telepon = 'No. telepon tidak valid (mis. 081234567890)'
  if (form.telp_rumah && !/^0\d{6,14}$/.test(form.telp_rumah)) errs.telp_rumah = 'No. telepon tidak valid'
  const hasErr = Object.keys(errs).length > 0

  const mutData = useMutation({
    mutationFn: () => updateDataDiri(form),
    onSuccess: () => { toast.success('Data diri tersimpan'); qc.invalidateQueries({ queryKey: ['my-profile'] }) },
    onError: (e) => toast.error(e.response?.data?.detail || 'Gagal menyimpan'),
  })

  const handleUpload = async (field, file) => {
    if (!file) return
    setUploading(u => ({ ...u, [field]: true }))
    try {
      const res = await uploadFile(file)
      const url = res.data.data.url
      if (field === 'ttd_url') await updateProfileTtd(url)
      else await updateProfileDocuments({ [field]: url })
      qc.invalidateQueries({ queryKey: ['my-profile'] })
      toast.success('Berkas tersimpan')
    } catch { toast.error('Gagal upload (maks 5MB)') }
    finally { setUploading(u => ({ ...u, [field]: false })) }
  }

  if (isLoading) return <LoadingSpinner />
  if (!profile || profile.tipe !== 'asesi') return <p className="text-gray-500">Profil asesi tidak ditemukan.</p>

  // Indikator kelengkapan
  const filledData = ALL_DATA_KEYS.filter(k => (form[k] || '').toString().trim()).length
  const filledDocs = ['foto_url', 'ktp_url', 'ijazah_url'].filter(k => profile[k]).length + (profile.ttd_url ? 1 : 0)
  const totalReq = ALL_DATA_KEYS.length + 4
  const pct = Math.round(((filledData + filledDocs) / totalReq) * 100)

  const fieldInput = (k, label, type) => {
    if (type === 'textarea') return (
      <div key={k} className="sm:col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
        <textarea rows={2} value={form[k] || ''} onChange={(e) => set(k, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
    )
    if (type === 'select') return (
      <div key={k}><label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
        <select value={form[k] || ''} onChange={(e) => set(k, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="Laki-laki">Laki-laki</option><option value="Wanita">Wanita</option></select></div>
    )
    const isNik = k === 'nik'
    const err = errs[k]
    return (
      <div key={k}><label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
        <input type={type} value={form[k] || ''}
          maxLength={isNik ? 16 : undefined}
          inputMode={isNik ? 'numeric' : undefined}
          onChange={(e) => set(k, isNik ? e.target.value.replace(/\D/g, '').slice(0, 16) : e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${err ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-500'}`} />
        {err && <p className="text-red-500 text-xs mt-1">{err}</p>}
      </div>
    )
  }

  const uploadRow = (field, label, Icon, accept) => {
    const url = profile[field]
    const full = fileUrl(url)
    return (
      <div key={field} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
        <Icon size={18} className={url ? 'text-green-500' : 'text-gray-300'} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          {full ? <a href={full} target="_blank" rel="noreferrer" className="text-xs text-green-600 hover:underline inline-flex items-center gap-1"><FileCheck size={12} /> Lihat berkas</a>
            : <p className="text-xs text-gray-400">Belum diupload</p>}
        </div>
        <label className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 ${uploading[field] ? 'opacity-50' : ''}`}>
          <Upload size={14} /> {uploading[field] ? '...' : url ? 'Ganti' : 'Upload'}
          <input type="file" className="hidden" accept={accept} onChange={(e) => handleUpload(field, e.target.files[0])} disabled={uploading[field]} />
        </label>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Diri Saya</h1>
        <p className="text-sm text-gray-500 mt-1">Isi sekali di sini. Semua form (APL-01, dll.) otomatis mengambil data & berkas dari halaman ini — tidak perlu mengetik ulang.</p>
      </div>

      {/* Indikator kelengkapan */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Kelengkapan Profil</p>
          <span className={`text-sm font-bold ${pct === 100 ? 'text-green-600' : 'text-blue-600'}`}>{pct}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* A. Data Pribadi */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><User size={18} className="text-blue-600" /> Data Pribadi</h2>
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm">
          <span className="text-gray-500">Email akun</span>: <span className="font-medium text-gray-900">{profile.email || '-'}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{PRIBADI.map(([k, l, t]) => fieldInput(k, l, t))}</div>
      </div>

      {/* B. Data Pekerjaan */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Briefcase size={18} className="text-blue-600" /> Data Pekerjaan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{PEKERJAAN.map(([k, l, t]) => fieldInput(k, l, t))}</div>
      </div>

      <button onClick={() => { if (hasErr) { toast.error('Periksa kembali data yang belum valid'); return } mutData.mutate() }}
        disabled={mutData.isPending || hasErr}
        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold">
        <Save size={15} /> {mutData.isPending ? 'Menyimpan...' : 'Simpan Data Diri'}
      </button>

      {/* C. Berkas & Tanda Tangan */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><FolderOpen size={18} className="text-blue-600" /> Berkas & Tanda Tangan</h2>
        <p className="text-xs text-gray-400">Upload sekali. Dipakai otomatis di semua form & dokumen.</p>
        <div className="space-y-2">
          {BERKAS.map(([k, l, I, acc]) => uploadRow(k, l, I, acc))}
          {/* TTD */}
          <div className="flex items-center gap-3 p-3 border border-indigo-200 bg-indigo-50 rounded-lg">
            <div className="w-20 h-12 bg-white border border-indigo-200 rounded flex items-center justify-center overflow-hidden shrink-0">
              {fileUrl(profile.ttd_url) ? <img src={fileUrl(profile.ttd_url)} alt="TTD" className="max-w-full max-h-full object-contain" /> : <PenLine size={18} className="text-indigo-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-indigo-900">Tanda Tangan Digital</p>
              <p className="text-xs text-indigo-700">{profile.ttd_url ? 'Tersimpan — dipakai semua form.' : 'Upload gambar TTD (PNG/JPG).'}</p>
            </div>
            <label className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 ${uploading.ttd_url ? 'opacity-50' : ''}`}>
              <Upload size={14} /> {uploading.ttd_url ? '...' : profile.ttd_url ? 'Ganti' : 'Upload TTD'}
              <input type="file" className="hidden" accept=".png,.jpg,.jpeg" onChange={(e) => handleUpload('ttd_url', e.target.files[0])} disabled={uploading.ttd_url} />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
