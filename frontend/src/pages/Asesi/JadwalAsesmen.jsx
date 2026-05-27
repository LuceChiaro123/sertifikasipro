import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getPermohonan } from '../../services/permohonan'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Clock, Calendar, MapPin, UserCheck, Video, ArrowRight } from 'lucide-react'

export default function JadwalAsesmen() {
  const { data, isLoading } = useQuery({ queryKey: ['permohonan'], queryFn: getPermohonan, retry: false })
  const permohonan = data?.data?.data || []
  const jadwal = permohonan
    .filter((p) => p.tanggal_asesmen)
    .sort((a, b) => new Date(a.tanggal_asesmen) - new Date(b.tanggal_asesmen))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Jadwal Asesmen</h1>
        <p className="text-gray-500 text-sm mt-1">Jadwal pelaksanaan asesmen kompetensi Anda.</p>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : jadwal.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Clock size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Belum ada jadwal asesmen.</p>
          <p className="text-gray-400 text-sm mt-1">Jadwal akan muncul setelah admin menetapkan tanggal & asesor.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jadwal.map((p) => {
            const d = new Date(p.tanggal_asesmen)
            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center justify-center bg-blue-50 text-blue-700 rounded-lg w-16 h-16 shrink-0">
                      <span className="text-xl font-bold leading-none">{d.getDate()}</span>
                      <span className="text-xs uppercase">{d.toLocaleDateString('id-ID', { month: 'short' })}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{p.skema_nama || 'Skema tidak diketahui'}</p>
                      <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                        <p className="flex items-center gap-1.5"><Calendar size={12} /> {d.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })} WIB</p>
                        {p.asesor_nama && <p className="flex items-center gap-1.5"><UserCheck size={12} /> Asesor: {p.asesor_nama}</p>}
                        {p.tuk_nama && <p className="flex items-center gap-1.5"><MapPin size={12} /> {p.tuk_nama}</p>}
                        {p.link_video_conference && (
                          <a href={p.link_video_conference} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline">
                            <Video size={12} /> Link Video Conference
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusBadge status={p.status} />
                    <Link to={`/asesi/permohonan/${p.id}`} className="text-blue-600 hover:underline text-xs inline-flex items-center gap-1">
                      Detail <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
