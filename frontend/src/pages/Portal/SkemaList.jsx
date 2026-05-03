import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSkema } from '../../services/portal'
import LoadingSpinner from '../../components/LoadingSpinner'
import { ArrowRight, CheckCircle, Search } from 'lucide-react'
import { useState } from 'react'

export default function SkemaList() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery({ queryKey: ['skema'], queryFn: getSkema, retry: false })
  const skema = data?.data?.data || []

  const filtered = skema.filter(
    (s) =>
      s.nama?.toLowerCase().includes(search.toLowerCase()) ||
      s.kode?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Skema Sertifikasi</h1>
      <p className="text-gray-500 mb-8">Pilih skema sertifikasi kompetensi yang sesuai dengan bidang Anda.</p>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Cari skema atau kode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-500 py-16">Tidak ada skema ditemukan.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((s) => (
            <Link
              key={s.id}
              to={`/skema/${s.id}`}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition hover:border-blue-300"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">{s.kode}</span>
                {s.is_ajj_approved && (
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                    <CheckCircle size={12} /> AJJ
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{s.nama}</h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-3">{s.deskripsi}</p>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-blue-700 font-semibold text-sm">
                  Rp {s.biaya?.toLocaleString('id-ID') || '-'}
                </span>
                <ArrowRight size={16} className="text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
