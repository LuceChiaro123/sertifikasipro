import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getPermohonan } from '../../services/permohonan'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { ArrowRight, Gavel, MessageSquare } from 'lucide-react'

// Permohonan yang siap diputuskan oleh Pimpinan
const STATUS_SIAP = ['KEPUTUSAN_DIBUAT', 'ASESMEN_BERLANGSUNG']
// Banding — menunggu keputusan banding
const STATUS_BANDING = ['BANDING']

export default function PimpinanKeputusan() {
  const { data, isLoading } = useQuery({
    queryKey: ['pimpinan-permohonan'],
    queryFn: getPermohonan,
  })
  const all = data?.data?.data || []

  const siapDiputus = all.filter((p) => STATUS_SIAP.includes(p.status))
  const bandingList = all.filter((p) => STATUS_BANDING.includes(p.status))
  const sudahDiputus = all.filter((p) =>
    ['SERTIFIKAT_DITERBITKAN', 'SELESAI', 'DITOLAK'].includes(p.status)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Keputusan Sertifikasi</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pimpinan LSP berwenang menetapkan hasil asesmen (Kompeten / Belum Kompeten)
        </p>
      </div>

      {/* Menunggu keputusan */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Gavel size={17} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">Menunggu Keputusan</h2>
          {siapDiputus.length > 0 && (
            <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {siapDiputus.length}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-8"><LoadingSpinner /></div>
        ) : siapDiputus.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-500 text-sm font-medium">Tidak ada permohonan yang menunggu keputusan saat ini.</p>
            <p className="text-gray-400 text-xs mt-2 max-w-lg mx-auto">
              Halaman ini hanya menampilkan permohonan yang sudah melewati asesmen.
              Untuk melihat <strong>semua permohonan</strong> termasuk yang baru diajukan,
              buka menu <Link to="/pimpinan/semua-permohonan" className="text-blue-600 underline">Semua Permohonan</Link>.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Asesi', 'Skema', 'Asesor', 'Tgl Asesmen', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {siapDiputus.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.asesi_nama || '-'}</p>
                    <p className="text-xs text-gray-400">{p.asesi_nik}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.skema_nama || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.asesor_nama || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {p.tanggal_asesmen
                      ? new Date(p.tanggal_asesmen).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                      : '-'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/pimpinan/keputusan/${p.id}`}
                      className="inline-flex items-center gap-1 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700"
                    >
                      Buat Keputusan <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Banding */}
      {bandingList.length > 0 && (
        <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-orange-100 flex items-center gap-2">
            <MessageSquare size={17} className="text-orange-500" />
            <h2 className="font-semibold text-gray-900">Permohonan Banding</h2>
            <span className="ml-auto bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {bandingList.length}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Asesi', 'Skema', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bandingList.map((p) => (
                <tr key={p.id} className="hover:bg-orange-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.asesi_nama || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.skema_nama || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/pimpinan/keputusan/${p.id}`}
                      className="inline-flex items-center gap-1 bg-orange-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-orange-700">
                      Proses Banding <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sudah diputuskan */}
      {sudahDiputus.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Riwayat Keputusan</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Asesi', 'Skema', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sudahDiputus.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.asesi_nama || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.skema_nama || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/pimpinan/keputusan/${p.id}`}
                      className="inline-flex items-center gap-1 text-blue-600 text-xs hover:underline"
                    >
                      Lihat <ArrowRight size={12} />
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
