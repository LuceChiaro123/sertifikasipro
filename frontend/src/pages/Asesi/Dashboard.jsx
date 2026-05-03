import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getPermohonan } from '../../services/permohonan'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import useAuthStore from '../../store/authStore'
import { FileText, Award, Plus, ArrowRight } from 'lucide-react'

export default function AsesiDashboard() {
  const { user } = useAuthStore()
  const { data, isLoading } = useQuery({ queryKey: ['permohonan'], queryFn: getPermohonan, retry: false })
  const permohonan = data?.data?.data || []

  const active = permohonan.filter((p) => !['SELESAI', 'DITOLAK'].includes(p.status))
  const selesai = permohonan.filter((p) => p.status === 'SELESAI')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Selamat Datang, {user?.email}</h1>
        <p className="text-gray-500 text-sm mt-1">Pantau status permohonan sertifikasi Anda di sini.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Permohonan', value: permohonan.length, icon: FileText, color: 'bg-blue-50 text-blue-600' },
          { label: 'Sedang Berjalan', value: active.length, icon: ArrowRight, color: 'bg-yellow-50 text-yellow-600' },
          { label: 'Selesai', value: selesai.length, icon: Award, color: 'bg-green-50 text-green-600' },
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

      {/* Permohonan Aktif */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Permohonan Aktif</h2>
          <Link
            to="/asesi/permohonan/baru"
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} /> Permohonan Baru
          </Link>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : active.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">Belum ada permohonan aktif.</p>
            <Link
              to="/asesi/permohonan/baru"
              className="text-blue-600 hover:underline text-sm"
            >
              Ajukan permohonan pertama Anda
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((p) => (
              <Link
                key={p.id}
                to={`/asesi/permohonan/${p.id}`}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div>
                  <p className="font-medium text-gray-900 text-sm">{p.skema_nama || 'Skema tidak diketahui'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Diajukan: {new Date(p.tanggal_submit).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
