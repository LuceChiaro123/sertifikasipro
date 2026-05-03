import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSkemaById } from '../../services/portal'
import LoadingSpinner from '../../components/LoadingSpinner'
import { CheckCircle, ArrowLeft, FileText } from 'lucide-react'

export default function SkemaDetail() {
  const { id } = useParams()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['skema', id],
    queryFn: () => getSkemaById(id),
    retry: false,
  })
  const skema = data?.data?.data

  if (isLoading) return <div className="max-w-4xl mx-auto px-4 py-10"><LoadingSpinner /></div>
  if (isError || !skema) return (
    <div className="max-w-4xl mx-auto px-4 py-10 text-center">
      <p className="text-gray-500">Skema tidak ditemukan.</p>
      <Link to="/skema" className="text-blue-600 hover:underline mt-4 inline-block">Kembali</Link>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link to="/skema" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
        <ArrowLeft size={16} /> Kembali ke Daftar Skema
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">{skema.kode}</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-3">{skema.nama}</h1>
          </div>
          {skema.is_ajj_approved && (
            <span className="flex items-center gap-1 text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full">
              <CheckCircle size={14} /> Disetujui untuk AJJ
            </span>
          )}
        </div>

        <p className="text-gray-600 mb-8">{skema.deskripsi}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Biaya Sertifikasi</p>
            <p className="text-2xl font-bold text-blue-700">Rp {skema.biaya?.toLocaleString('id-ID') || '-'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Masa Berlaku</p>
            <p className="text-lg font-semibold text-gray-900">3 Tahun</p>
            <p className="text-xs text-gray-400">Sesuai standar BNSP</p>
          </div>
        </div>

        {skema.persyaratan?.length > 0 && (
          <div className="mb-8">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText size={18} /> Persyaratan
            </h2>
            <ul className="space-y-2">
              {skema.persyaratan.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {skema.unit_kompetensi?.length > 0 && (
          <div className="mb-8">
            <h2 className="font-semibold text-gray-900 mb-3">Unit Kompetensi</h2>
            <div className="space-y-2">
              {skema.unit_kompetensi.map((u, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{u.kode}</span>
                  <span className="text-gray-700">{u.nama}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link
          to="/register"
          className="block w-full text-center bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Daftar & Ajukan Permohonan
        </Link>
      </div>
    </div>
  )
}
