import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Award, Users, TrendingUp, FileCheck } from 'lucide-react'

const getStatistik = () => api.get('/dashboard/statistik')

export default function PimpinanDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['statistik'], queryFn: getStatistik, retry: false })
  const stats = data?.data?.data

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Eksekutif</h1>
        <p className="text-gray-500 text-sm mt-1">Rekapitulasi kinerja sertifikasi LSP.</p>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Permohonan', value: stats?.total_permohonan ?? '-', icon: FileCheck, color: 'text-blue-600 bg-blue-50' },
            { label: 'Sertifikat Diterbitkan', value: stats?.total_sertifikat ?? '-', icon: Award, color: 'text-green-600 bg-green-50' },
            { label: 'Asesi Terdaftar', value: stats?.total_asesi ?? '-', icon: Users, color: 'text-purple-600 bg-purple-50' },
            { label: 'Tingkat Kelulusan', value: stats?.tingkat_kelulusan ? `${stats.tingkat_kelulusan}%` : '-', icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
          ].map(({ label, value, icon: Icon, color }) => (
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
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Laporan BNSP</h2>
        <p className="text-sm text-gray-500 mb-4">
          Laporan disampaikan ke BNSP 2x setahun (Juni & Desember, paling lambat tanggal 10).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => window.open('/api/v1/dashboard/rekapitulasi/export?format=pdf', '_blank')}
            className="border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            Export PDF
          </button>
          <button
            onClick={() => window.open('/api/v1/dashboard/rekapitulasi/export?format=excel', '_blank')}
            className="border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            Export Excel
          </button>
        </div>
      </div>
    </div>
  )
}
