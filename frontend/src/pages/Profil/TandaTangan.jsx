import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProfileMe, updateProfileTtd } from '../../services/auth'
import { uploadFile } from '../../services/admin'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { PenLine, Upload, ShieldCheck } from 'lucide-react'

const MEDIA_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '')
const fileUrl = (u) => (u ? (u.startsWith('http') ? u : `${MEDIA_ROOT}${u}`) : null)

export default function TandaTangan() {
  const qc = useQueryClient()
  const { data: profile, isLoading } = useQuery({ queryKey: ['my-profile'], queryFn: () => getProfileMe().then(r => r.data.data) })
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadFile(file)
      await updateProfileTtd(res.data.data.url)
      qc.invalidateQueries({ queryKey: ['my-profile'] })
      qc.invalidateQueries({ queryKey: ['permohonan'] })
      qc.invalidateQueries({ queryKey: ['uji-list'] })
      qc.invalidateQueries({ queryKey: ['uji'] })   // segarkan detail event (TTD Ketua)
      toast.success('Tanda tangan tersimpan — otomatis dipakai di semua dokumen')
    } catch {
      toast.error('Gagal upload tanda tangan (gambar PNG/JPG, maks 5MB)')
    } finally { setUploading(false) }
  }

  if (isLoading) return <LoadingSpinner />
  const ttd = fileUrl(profile?.ttd_url)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tanda Tangan Digital</h1>
        <p className="text-sm text-gray-500 mt-1">Upload sekali. Tanda tangan Anda otomatis dipakai pada dokumen yang Anda tanda tangani (Berita Acara, Laporan, SPT, validasi, dll.).</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
          <ShieldCheck size={16} className="text-indigo-500" />
          <span>{profile?.nama_lengkap || profile?.email || 'Akun Anda'}{profile?.nomor_reg_asesor ? ` · ${profile.nomor_reg_asesor}` : ''}</span>
        </div>

        <div className="flex items-center gap-5">
          <div className="w-40 h-24 bg-slate-50 border border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
            {ttd
              ? <img src={ttd} alt="Tanda tangan" className="max-w-full max-h-full object-contain" />
              : <PenLine size={26} className="text-gray-300" />}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${ttd ? 'text-green-600' : 'text-gray-500'}`}>
              {ttd ? 'Tanda tangan tersimpan' : 'Belum ada tanda tangan'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Format gambar (PNG/JPG), maks 5MB. Sebaiknya latar transparan/putih.</p>
            <label className={`mt-3 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
              <Upload size={15} /> {uploading ? 'Mengupload...' : ttd ? 'Ganti Tanda Tangan' : 'Upload Tanda Tangan'}
              <input type="file" className="hidden" accept=".png,.jpg,.jpeg" onChange={(e) => handleUpload(e.target.files[0])} disabled={uploading} />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
