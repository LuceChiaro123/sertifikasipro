import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getPermohonan } from '../../services/permohonan'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Plus, ArrowRight } from 'lucide-react'

export default function PermohonanList() {
  const { data, isLoading } = useQuery({ queryKey: ['permohonan'], queryFn: getPermohonan, retry: false })
  const permohonan = data?.data?.data || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Permohonan Saya</h1>
        <Link
          to="/asesi/permohonan/baru"
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} /> Permohonan Baru
        </Link>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : permohonan.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-4">Anda belum mengajukan permohonan sertifikasi.</p>
          <Link
            to="/asesi/permohonan/baru"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus size={16} /> Ajukan Sekarang
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Skema</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Jenis</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Tanggal Ajuan</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {permohonan.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{p.skema_nama || '-'}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {p.jenis === 'uji_sertifikasi' ? 'Uji Sertifikasi' : 'Sertifikasi Ulang'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {p.tanggal_submit ? new Date(p.tanggal_submit).toLocaleDateString('id-ID') : '-'}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/asesi/permohonan/${p.id}`}
                      className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                    >
                      Detail <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
