import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getPermohonan } from '../../services/permohonan'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { ClipboardList, ArrowRight, Calendar } from 'lucide-react'

export default function AsesorPermohonanList() {
  const { data, isLoading } = useQuery({ queryKey: ['asesor-permohonan'], queryFn: getPermohonan })
  const permohonan = data?.data?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Permohonan Saya</h1>
        <p className="text-sm text-gray-500 mt-1">Daftar asesi yang ditugaskan kepada Anda</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8"><LoadingSpinner /></div>
        ) : permohonan.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Belum ada permohonan yang ditugaskan kepada Anda.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Asesi', 'Skema', 'Jadwal Asesmen', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {permohonan.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.asesi_nama || '-'}</p>
                    <p className="text-xs text-gray-400">{p.asesi_nik || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.skema_nama || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.tanggal_asesmen ? (
                      <span className="flex items-center gap-1">
                        <Calendar size={13} />
                        {new Date(p.tanggal_asesmen).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/asesor/permohonan/${p.id}`}
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
