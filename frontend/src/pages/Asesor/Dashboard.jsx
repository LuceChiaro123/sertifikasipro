import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getPermohonan } from '../../services/permohonan'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import useAuthStore from '../../store/authStore'
import { ClipboardList, ArrowRight } from 'lucide-react'

export default function AsesorDashboard() {
  const { user } = useAuthStore()
  const { data, isLoading } = useQuery({ queryKey: ['asesor-permohonan'], queryFn: getPermohonan, retry: false })
  const permohonan = data?.data?.data || []

  const tugasAktif = permohonan.filter((p) =>
    ['DIJADWALKAN', 'ASESMEN_BERLANGSUNG', 'DOKUMEN_DIKAJI'].includes(p.status)
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Asesor</h1>
        <p className="text-gray-500 text-sm mt-1">Selamat datang, {user?.email}. Berikut tugas asesmen Anda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Ditugaskan', value: permohonan.length },
          { label: 'Tugas Aktif', value: tugasAktif.length },
          { label: 'Selesai', value: permohonan.filter((p) => p.status === 'SELESAI').length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{isLoading ? '-' : value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList size={18} /> Tugas Asesmen Aktif
          </h2>
          <Link to="/asesor/permohonan" className="text-blue-600 text-sm hover:underline flex items-center gap-1">
            Lihat semua <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : tugasAktif.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Tidak ada tugas aktif saat ini.</p>
        ) : (
          <div className="space-y-3">
            {tugasAktif.map((p) => (
              <Link
                key={p.id}
                to={`/asesor/permohonan/${p.id}`}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div>
                  <p className="font-medium text-gray-900 text-sm">{p.asesi_nama || 'Asesi'}</p>
                  <p className="text-xs text-gray-400">{p.skema_nama}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={p.status} />
                  <ArrowRight size={16} className="text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
