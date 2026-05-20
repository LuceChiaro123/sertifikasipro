import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { getPermohonan } from '../../services/permohonan'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { ArrowRight, FileText, Filter, Search } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'SUBMITTED', label: 'Diajukan' },
  { value: 'DOKUMEN_DIKAJI', label: 'Dokumen Dikaji' },
  { value: 'DIJADWALKAN', label: 'Dijadwalkan' },
  { value: 'ASESMEN_BERLANGSUNG', label: 'Asesmen Berlangsung' },
  { value: 'KEPUTUSAN_DIBUAT', label: 'Keputusan Dibuat' },
  { value: 'SERTIFIKAT_DITERBITKAN', label: 'Sertifikat Diterbitkan' },
  { value: 'SELESAI', label: 'Selesai' },
  { value: 'BANDING', label: 'Banding' },
  { value: 'DITOLAK', label: 'Ditolak' },
]

export default function PimpinanSemuaPermohonan() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pimpinan-all-permohonan'],
    queryFn: getPermohonan,
    staleTime: 0,
  })
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')

  const all = data?.data?.data || []
  const filtered = all.filter((p) => {
    const matchStatus = !filter || p.status === filter
    const matchSearch = !search ||
      (p.asesi_nama || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.skema_nama || '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Semua Permohonan</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitoring seluruh permohonan sertifikasi di LSP (semua status).
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 items-center">
        <div className="flex items-center gap-2 text-gray-400">
          <Filter size={16} />
          <span className="text-sm">Filter:</span>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama asesi atau skema..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-xs text-gray-400">
          {filtered.length} / {all.length} permohonan
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8"><LoadingSpinner /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Tidak ada permohonan yang cocok dengan filter.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Asesi', 'Skema', 'Asesor', 'Tgl Submit', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.asesi_nama || '-'}</p>
                    <p className="text-xs text-gray-400">{p.asesi_nik}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.skema_nama || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.asesor_nama || <span className="italic text-gray-400">belum ditugaskan</span>}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {p.tanggal_submit ? new Date(p.tanggal_submit).toLocaleDateString('id-ID') : '-'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/pimpinan/keputusan/${p.id}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs font-medium"
                    >
                      Detail <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
