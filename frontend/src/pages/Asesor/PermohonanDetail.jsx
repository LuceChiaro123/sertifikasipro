import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPermohonanById, getAPL01, getAPL02, verifyAPL02 } from '../../services/permohonan'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle, Clock, Video, Save } from 'lucide-react'

export default function AsesorPermohonanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({ queryKey: ['permohonan', id], queryFn: () => getPermohonanById(id) })
  const { data: apl01Data } = useQuery({ queryKey: ['apl01', id], queryFn: () => getAPL01(id).catch(() => null), retry: false })
  const { data: apl02Data } = useQuery({ queryKey: ['apl02', id], queryFn: () => getAPL02(id).catch(() => null), retry: false })

  const [catatan, setCatatan] = useState('')

  const mutVerify = useMutation({
    mutationFn: () => verifyAPL02(id, { catatan_asesor: catatan }),
    onSuccess: () => { toast.success('APL-02 berhasil diverifikasi'); qc.invalidateQueries(['apl02', id]) },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal verifikasi'),
  })

  const p = data?.data?.data
  const apl01 = apl01Data?.data?.data
  const apl02 = apl02Data?.data?.data

  if (isLoading) return <LoadingSpinner />
  if (!p) return <p className="text-gray-500">Data tidak ditemukan.</p>

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/asesor')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{p.asesi_nama || 'Asesi'}</h1>
          <p className="text-sm text-gray-500">{p.skema_nama} · <StatusBadge status={p.status} /></p>
        </div>
      </div>

      {/* Jadwal */}
      {p.tanggal_asesmen && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 flex items-start gap-4">
          <Clock size={20} className="text-blue-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-blue-900">Jadwal Asesmen</p>
            <p className="text-sm text-blue-700 mt-1">
              {new Date(p.tanggal_asesmen).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
            </p>
            {p.tuk_nama && <p className="text-sm text-blue-600 mt-1">TUK: <strong>{p.tuk_nama}</strong></p>}
          </div>
          {p.link_video_conference && (
            <a href={p.link_video_conference} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0">
              <Video size={15} /> Mulai Asesmen
            </a>
          )}
        </div>
      )}

      {/* APL01 Review */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">FR-APL-01 — Data Asesi</h2>
        {!apl01 ? (
          <p className="text-gray-400 text-sm">APL-01 belum diisi oleh asesi.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(apl01.data_json).map(([k, v]) => (
              <div key={k}>
                <p className="text-gray-500 text-xs capitalize">{k.replace(/_/g, ' ')}</p>
                <p className="font-medium text-gray-900">{v || '-'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* APL02 Verifikasi */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">FR-APL-02 — Asesmen Mandiri</h2>
        {!apl02 ? (
          <p className="text-gray-400 text-sm">APL-02 belum diisi oleh asesi.</p>
        ) : (
          <div className="space-y-4">
            {apl02.verified_at ? (
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle size={16} /> <span className="text-sm font-medium">Sudah diverifikasi</span>
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>{['Kode Unit', 'Nama Unit', 'Hasil Mandiri', 'Bukti'].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-gray-500 font-medium text-xs">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {apl02.hasil_mandiri_json?.units?.map((u, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-4 py-2 text-xs font-mono text-gray-600">{u.kode || '-'}</td>
                      <td className="px-4 py-2 text-gray-800">{u.nama || '-'}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${u.hasil === 'K' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.hasil}</span>
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{u.bukti || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!apl02.verified_at && (
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Verifikasi (opsional)</label>
                  <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)}
                    rows={2} placeholder="Catatan untuk asesi..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <button onClick={() => mutVerify.mutate()} disabled={mutVerify.isPending}
                  className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
                  <Save size={15} /> {mutVerify.isPending ? 'Menyimpan...' : 'Verifikasi APL-02'}
                </button>
              </div>
            )}

            {apl02.catatan_asesor && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                <strong>Catatan Anda:</strong> {apl02.catatan_asesor}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
