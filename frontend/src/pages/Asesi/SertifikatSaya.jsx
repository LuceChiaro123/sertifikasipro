import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getMySertifikats } from '../../services/permohonan'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Award, Shield, Download } from 'lucide-react'

const MEDIA_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '')

export default function SertifikatSaya() {
  const { data, isLoading } = useQuery({ queryKey: ['my-sertifikats'], queryFn: getMySertifikats, retry: false })
  const sertifikats = data?.data?.data || []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sertifikat Saya</h1>
        <p className="text-gray-500 text-sm mt-1">Sertifikat kompetensi yang telah Anda peroleh.</p>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : sertifikats.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Award size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Belum ada sertifikat.</p>
          <p className="text-gray-400 text-sm mt-1">Sertifikat terbit setelah Anda dinyatakan Kompeten dan keputusan disahkan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sertifikats.map((s) => (
            <div key={s.id} className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-5 text-white shadow-md">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-blue-200" />
                  <span className="text-blue-100 text-xs font-medium uppercase tracking-wide">Sertifikat Kompetensi</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-400 text-green-900' : 'bg-gray-400 text-gray-900'}`}>
                  {s.is_active ? 'AKTIF' : 'TIDAK AKTIF'}
                </span>
              </div>
              <p className="text-white font-bold text-base mb-1">{s.nama_skema}</p>
              <div className="flex items-center gap-2 mb-3">
                <Shield size={12} className="text-blue-200" />
                <span className="font-mono text-xs text-blue-100 tracking-wider">{s.nomor_sertifikat}</span>
              </div>
              <div className="border-t border-white/20 pt-3 flex justify-between text-xs text-blue-100">
                <div>
                  <p className="opacity-70">Terbit</p>
                  <p className="font-semibold text-white">{s.tanggal_terbit ? new Date(s.tanggal_terbit).toLocaleDateString('id-ID') : '-'}</p>
                </div>
                <div className="text-right">
                  <p className="opacity-70">Berakhir</p>
                  <p className="font-semibold text-white">{s.tanggal_berakhir ? new Date(s.tanggal_berakhir).toLocaleDateString('id-ID') : '-'}</p>
                </div>
              </div>
              {s.file_url && (
                <a href={`${MEDIA_ROOT}${s.file_url}`} target="_blank" rel="noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-medium py-2 rounded-lg">
                  <Download size={15} /> Unduh Sertifikat (PDF)
                </a>
              )}
              {s.permohonan_id && (
                <Link to={`/asesi/permohonan/${s.permohonan_id}`} className="mt-2 block text-center text-xs text-blue-200 hover:text-white underline">
                  Lihat detail permohonan →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
