import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getPermohonan } from '../../services/permohonan'
import { getMySertifikats } from '../../services/permohonan'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import useAuthStore from '../../store/authStore'
import { FileText, Award, Plus, ArrowRight, Shield, CheckCircle, Calendar } from 'lucide-react'

export default function AsesiDashboard() {
  const { user } = useAuthStore()
  const { data, isLoading } = useQuery({ queryKey: ['permohonan'], queryFn: getPermohonan, retry: false })
  const { data: sertData } = useQuery({ queryKey: ['my-sertifikats'], queryFn: getMySertifikats, retry: false })

  const permohonan = data?.data?.data || []
  const sertifikats = sertData?.data?.data || []

  const active = permohonan.filter((p) => !['SELESAI', 'DITOLAK'].includes(p.status))
  const selesai = permohonan.filter((p) => p.status === 'SELESAI' || p.status === 'SERTIFIKAT_DITERBITKAN')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Selamat Datang, {user?.email?.split('@')[0]}</h1>
        <p className="text-gray-500 text-sm mt-1">Pantau status permohonan dan sertifikat kompetensi Anda.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Permohonan', value: permohonan.length, icon: FileText, color: 'bg-blue-50 text-blue-600' },
          { label: 'Sedang Berjalan', value: active.length, icon: ArrowRight, color: 'bg-yellow-50 text-yellow-600' },
          { label: 'Sertifikat Aktif', value: sertifikats.filter(s => s.is_active).length, icon: Award, color: 'bg-green-50 text-green-600' },
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

      {/* Sertifikat Aktif */}
      {sertifikats.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Award size={18} className="text-blue-600" /> Sertifikat Kompetensi Saya
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sertifikats.map((s) => (
              <div key={s.id}
                className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-5 text-white shadow-md">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Award size={18} className="text-blue-200" />
                    <span className="text-blue-100 text-xs font-medium uppercase tracking-wide">Sertifikat Kompetensi</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-400 text-green-900' : 'bg-gray-400 text-gray-900'}`}>
                    {s.is_active ? 'AKTIF' : 'TIDAK AKTIF'}
                  </span>
                </div>
                <p className="text-white font-bold text-base mb-1">{s.nama_skema}</p>
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={12} className="text-blue-200" />
                  <span className="font-mono text-xs text-blue-100 tracking-wider">{s.nomor_sertifikat}</span>
                </div>
                <div className="border-t border-white/20 pt-3 flex justify-between text-xs text-blue-100">
                  <div>
                    <p className="opacity-70">Terbit</p>
                    <p className="font-semibold text-white">{new Date(s.tanggal_terbit).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className="text-right">
                    <p className="opacity-70">Berakhir</p>
                    <p className="font-semibold text-white">{new Date(s.tanggal_berakhir).toLocaleDateString('id-ID')}</p>
                  </div>
                </div>
                {s.permohonan_id && (
                  <Link to={`/asesi/permohonan/${s.permohonan_id}`}
                    className="mt-3 block text-center text-xs text-blue-200 hover:text-white underline">
                    Lihat detail permohonan →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Calendar size={11} />
                    Diajukan: {new Date(p.tanggal_submit).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Riwayat selesai */}
      {selesai.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500" /> Riwayat Selesai
          </h2>
          <div className="space-y-2">
            {selesai.map((p) => (
              <Link key={p.id} to={`/asesi/permohonan/${p.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-sm">
                <span className="font-medium text-gray-800">{p.skema_nama}</span>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
