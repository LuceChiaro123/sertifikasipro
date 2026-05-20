import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getPermohonan, updateStatusPermohonan } from '../../services/permohonan'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowRight, AlertCircle, Info } from 'lucide-react'

const STATUS_OPTIONS = [
  'SUBMITTED', 'DOKUMEN_DIKAJI', 'DIJADWALKAN',
  'ASESMEN_BERLANGSUNG', 'KEPUTUSAN_DIBUAT', 'SERTIFIKAT_DITERBITKAN', 'SELESAI', 'DITOLAK',
]

export default function AdminPermohonanList() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('')
  const { data, isLoading } = useQuery({ queryKey: ['all-permohonan'], queryFn: getPermohonan, retry: false })
  const permohonan = data?.data?.data || []

  const mutation = useMutation({
    mutationFn: ({ id, status }) => updateStatusPermohonan(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-permohonan'] })
      toast.success('Status diperbarui.')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal memperbarui status.'),
  })

  const filtered = filter ? permohonan.filter((p) => p.status === filter) : permohonan

  const submittedCount = permohonan.filter((p) => p.status === 'SUBMITTED').length
  const dokumenDikajiCount = permohonan.filter((p) => p.status === 'DOKUMEN_DIKAJI').length

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Kelola Permohonan</h1>

      {/* Banner aksi yang perlu admin lakukan */}
      {(submittedCount > 0 || dokumenDikajiCount > 0) && (
        <div className="mb-6 space-y-2">
          {submittedCount > 0 && (
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <AlertCircle size={18} className="text-orange-500 mt-0.5 shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-orange-800">
                  {submittedCount} permohonan baru menunggu validasi dokumen
                </p>
                <p className="text-orange-700 mt-0.5 text-xs">
                  Buka detail permohonan → <strong>Setujui Dokumen</strong> agar bisa lanjut ke tahap penjadwalan.
                </p>
              </div>
            </div>
          )}
          {dokumenDikajiCount > 0 && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-blue-800">
                  {dokumenDikajiCount} permohonan siap dijadwalkan
                </p>
                <p className="text-blue-700 mt-0.5 text-xs">
                  Buka detail → <strong>Tugaskan Asesor + TUK + Jadwal</strong>. Setelah disimpan, asesor akan dapat melihat permohonannya.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${!filter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'}`}
        >
          Semua ({permohonan.length})
        </button>
        {STATUS_OPTIONS.map((s) => {
          const count = permohonan.filter((p) => p.status === s).length
          if (count === 0) return null
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'}`}
            >
              {s} ({count})
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Asesi</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Skema</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Jenis</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Update Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{p.asesi_nama || '-'}</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{p.skema_nama || '-'}</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {p.jenis === 'uji_sertifikasi' ? 'Uji' : 'Ulang'}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4">
                    <select
                      defaultValue={p.status}
                      onChange={(e) => mutation.mutate({ id: p.id, status: e.target.value })}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/admin/permohonan/${p.id}`}
                      className="text-blue-600 hover:underline inline-flex items-center gap-1 text-xs"
                    >
                      Detail <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-10">Tidak ada permohonan.</p>
          )}
        </div>
      )}
    </div>
  )
}
