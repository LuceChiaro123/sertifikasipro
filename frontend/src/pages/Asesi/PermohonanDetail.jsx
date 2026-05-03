import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPermohonanById } from '../../services/permohonan'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { FileText, Calendar, User } from 'lucide-react'

const steps = [
  'DRAF', 'SUBMITTED', 'DOKUMEN_DIKAJI', 'DIJADWALKAN',
  'ASESMEN_BERLANGSUNG', 'KEPUTUSAN_DIBUAT', 'SERTIFIKAT_DITERBITKAN', 'SELESAI',
]

export default function PermohonanDetail() {
  const { id } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['permohonan', id],
    queryFn: () => getPermohonanById(id),
    retry: false,
  })
  const p = data?.data?.data

  if (isLoading) return <LoadingSpinner />
  if (!p) return <p className="text-gray-500">Permohonan tidak ditemukan.</p>

  const currentStep = steps.indexOf(p.status)

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Detail Permohonan</h1>
        <StatusBadge status={p.status} />
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Progress Sertifikasi</h2>
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            {steps.slice(0, 6).map((s, i) => (
              <div key={s} className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            {['Draf', 'Diajukan', 'Dikaji', 'Dijadwalkan', 'Asesmen', 'Keputusan'].map((label, i) => (
              <div key={label} className="flex-1 text-center">
                <p className={`text-xs mt-1 ${i <= currentStep ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Informasi Permohonan</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            ['Skema', p.skema_nama || '-'],
            ['Jenis', p.jenis === 'uji_sertifikasi' ? 'Uji Sertifikasi' : 'Sertifikasi Ulang'],
            ['Tanggal Ajuan', p.tanggal_submit ? new Date(p.tanggal_submit).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'],
            ['Jadwal Asesmen', p.tanggal_asesmen ? new Date(p.tanggal_asesmen).toLocaleDateString('id-ID', { dateStyle: 'long' }) : 'Belum dijadwalkan'],
            ['Asesor', p.asesor_nama || 'Belum ditentukan'],
            ['Catatan Admin', p.catatan_admin || '-'],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-gray-500 text-xs mb-0.5">{label}</p>
              <p className="text-gray-900 font-medium">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions berdasarkan status */}
      {p.status === 'SUBMITTED' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <p className="text-sm text-yellow-800 font-medium mb-1">Menunggu Verifikasi Dokumen</p>
          <p className="text-xs text-yellow-700">Admin sedang mengkaji kelengkapan dokumen Anda. Anda akan mendapat notifikasi email jika ada update.</p>
        </div>
      )}
      {p.status === 'DRAF' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-sm text-blue-800 font-medium mb-2">Lengkapi Permohonan Anda</p>
          <p className="text-xs text-blue-700 mb-3">Upload dokumen persyaratan dan isi formulir FR-APL-01 untuk melanjutkan.</p>
          <button className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
            Isi FR-APL-01
          </button>
        </div>
      )}
    </div>
  )
}
