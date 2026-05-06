import { useQuery } from '@tanstack/react-query'
import { getStats } from '../../services/admin'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Award, Users, TrendingUp, FileCheck, BookOpen, Clock } from 'lucide-react'

const STATUS_LABEL = {
  SUBMITTED: 'Diajukan',
  DOKUMEN_DIKAJI: 'Dikaji',
  DIJADWALKAN: 'Dijadwalkan',
  ASESMEN_BERLANGSUNG: 'Asesmen',
  KEPUTUSAN_DIBUAT: 'Keputusan',
  SERTIFIKAT_DITERBITKAN: 'Sertifikat',
  SELESAI: 'Selesai',
  DITOLAK: 'Ditolak',
}

export default function PimpinanDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: getStats, retry: false })
  const stats = data?.data?.data

  const cards = [
    { label: 'Total Permohonan', value: stats?.total_permohonan ?? 0, icon: FileCheck, color: 'text-blue-600 bg-blue-50' },
    { label: 'Sertifikat Aktif', value: stats?.total_sertifikat_aktif ?? 0, icon: Award, color: 'text-green-600 bg-green-50' },
    { label: 'Asesi Terdaftar', value: stats?.total_asesi ?? 0, icon: Users, color: 'text-purple-600 bg-purple-50' },
    { label: 'Total Skema', value: stats?.total_skema ?? 0, icon: BookOpen, color: 'text-orange-600 bg-orange-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Eksekutif</h1>
        <p className="text-gray-500 text-sm mt-1">Rekapitulasi kinerja sertifikasi LSP</p>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon size={22} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tingkat kelulusan + breakdown status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tingkat kelulusan */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-blue-600" />
                <h2 className="font-semibold text-gray-900">Tingkat Kelulusan</h2>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold text-blue-600">{stats?.tingkat_kelulusan ?? 0}%</span>
                <span className="text-gray-500 text-sm mb-1">dari total permohonan selesai</span>
              </div>
              <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${stats?.tingkat_kelulusan ?? 0}%` }}
                />
              </div>
            </div>

            {/* Breakdown per status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={18} className="text-gray-500" />
                <h2 className="font-semibold text-gray-900">Permohonan per Status</h2>
              </div>
              {stats?.permohonan_by_status && Object.keys(stats.permohonan_by_status).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(stats.permohonan_by_status).map(([s, count]) => (
                    <div key={s} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{STATUS_LABEL[s] || s}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Belum ada data permohonan.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
