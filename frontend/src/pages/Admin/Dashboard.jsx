import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getPermohonan } from '../../services/permohonan'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { FileText, Users, Clock, CheckCircle, ArrowRight } from 'lucide-react'

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['all-permohonan'], queryFn: getPermohonan, retry: false })
  const permohonan = data?.data?.data || []

  const pending = permohonan.filter((p) => p.status === 'SUBMITTED').length
  const ongoing = permohonan.filter((p) => p.status === 'ASESMEN_BERLANGSUNG').length
  const selesai = permohonan.filter((p) => p.status === 'SELESAI').length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
        <p className="text-gray-500 text-sm mt-1">Kelola permohonan sertifikasi masuk.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Permohonan', value: permohonan.length, icon: FileText, color: 'text-blue-600 bg-blue-50' },
          { label: 'Menunggu Review', value: pending, icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
          { label: 'Asesmen Aktif', value: ongoing, icon: Users, color: 'text-orange-600 bg-orange-50' },
          { label: 'Selesai', value: selesai, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{isLoading ? '-' : value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Permohonan Terbaru</h2>
          <Link to="/admin/permohonan" className="text-blue-600 text-sm hover:underline flex items-center gap-1">
            Lihat semua <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left py-2 text-gray-500 font-medium">Asesi</th>
                <th className="text-left py-2 text-gray-500 font-medium">Skema</th>
                <th className="text-left py-2 text-gray-500 font-medium">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {permohonan.slice(0, 8).map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="py-3 text-gray-900">{p.asesi_nama || '-'}</td>
                  <td className="py-3 text-gray-500">{p.skema_nama || '-'}</td>
                  <td className="py-3"><StatusBadge status={p.status} /></td>
                  <td className="py-3 text-right">
                    <Link to={`/admin/permohonan/${p.id}`} className="text-blue-600 hover:underline text-xs flex items-center justify-end gap-1">
                      Kelola <ArrowRight size={12} />
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
