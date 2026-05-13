import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPermohonanById } from '../../services/permohonan'
import { buatKeputusan, getKeputusan } from '../../services/admin'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle, XCircle, Save, Award, User, Calendar } from 'lucide-react'

export default function PimpinanKeputusanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['permohonan', id],
    queryFn: () => getPermohonanById(id),
  })
  const { data: keputusanData } = useQuery({
    queryKey: ['keputusan', id],
    queryFn: () => getKeputusan(id).catch(() => null),
    retry: false,
  })

  const [hasil, setHasil] = useState('')
  const [catatan, setCatatan] = useState('')

  const p = data?.data?.data
  const keputusan = keputusanData?.data?.data

  const mutKeputusan = useMutation({
    mutationFn: () => buatKeputusan(id, { hasil, catatan: catatan || null }),
    onSuccess: (res) => {
      const h = res.data?.data?.hasil
      if (h === 'K') {
        toast.success('Asesi dinyatakan KOMPETEN. Sertifikat diterbitkan otomatis.')
      } else {
        toast.success('Keputusan BELUM KOMPETEN telah disimpan.')
      }
      qc.invalidateQueries(['permohonan', id])
      qc.invalidateQueries(['keputusan', id])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan keputusan'),
  })

  if (isLoading) return <LoadingSpinner />
  if (!p) return <p className="text-gray-500">Data tidak ditemukan.</p>

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/pimpinan/keputusan')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Keputusan Sertifikasi</h1>
          <p className="text-sm text-gray-500 mt-0.5">#{id.slice(0, 8)}</p>
        </div>
      </div>

      {/* Ringkasan permohonan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <User size={20} className="text-blue-600" />
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Asesi</p>
              <p className="font-semibold text-gray-900">{p.asesi_nama}</p>
              <p className="text-xs text-gray-400">NIK: {p.asesi_nik}</p>
            </div>
            <div>
              <p className="text-gray-500">Skema</p>
              <p className="font-semibold text-gray-900">{p.skema_nama}</p>
              <p className="text-xs text-gray-400">{p.skema_kode}</p>
            </div>
            <div>
              <p className="text-gray-500">Asesor</p>
              <p className="font-medium text-gray-900">{p.asesor_nama || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">TUK</p>
              <p className="font-medium text-gray-900">{p.tuk_nama || '-'}</p>
            </div>
            {p.tanggal_asesmen && (
              <div className="col-span-2 flex items-center gap-2 text-gray-600">
                <Calendar size={14} />
                <span>{new Date(p.tanggal_asesmen).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}</span>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-gray-500">Status</p>
              <div className="mt-0.5"><StatusBadge status={p.status} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Form keputusan atau hasil */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award size={18} className="text-blue-600" /> Penetapan Hasil Asesmen
        </h2>

        {keputusan ? (
          // Sudah ada keputusan — tampilkan hasil
          <div className={`rounded-xl p-5 border ${keputusan.hasil === 'K' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-3 mb-3">
              {keputusan.hasil === 'K'
                ? <CheckCircle size={24} className="text-green-600" />
                : <XCircle size={24} className="text-red-500" />}
              <p className={`text-xl font-bold ${keputusan.hasil === 'K' ? 'text-green-800' : 'text-red-700'}`}>
                {keputusan.hasil === 'K' ? 'KOMPETEN' : 'BELUM KOMPETEN'}
              </p>
            </div>
            {keputusan.catatan && (
              <p className="text-sm text-gray-700 mb-3">{keputusan.catatan}</p>
            )}
            {keputusan.sertifikat && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-green-200 text-sm space-y-1">
                <p className="font-semibold text-green-800 flex items-center gap-1">
                  <Award size={14} /> Sertifikat Diterbitkan
                </p>
                <p className="text-gray-700">
                  Nomor: <span className="font-mono font-bold">{keputusan.sertifikat.nomor_sertifikat}</span>
                </p>
                <p className="text-gray-500">
                  Berlaku: {keputusan.sertifikat.tanggal_terbit} s/d {keputusan.sertifikat.tanggal_berakhir}
                </p>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3">
              Diputuskan: {keputusan.diputuskan_at ? new Date(keputusan.diputuskan_at).toLocaleString('id-ID') : '-'}
            </p>
          </div>
        ) : (
          // Belum ada keputusan — tampilkan form
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Sebagai Pimpinan LSP, tetapkan hasil asesmen berdasarkan laporan asesor dan rekomendasi pleno.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hasil Asesmen</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setHasil('K')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition
                    ${hasil === 'K'
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-green-400 hover:bg-green-50'}`}
                >
                  <CheckCircle size={18} /> Kompeten (K)
                </button>
                <button
                  onClick={() => setHasil('BK')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition
                    ${hasil === 'BK'
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-red-400 hover:bg-red-50'}`}
                >
                  <XCircle size={18} /> Belum Kompeten (BK)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Keputusan (opsional)</label>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={3}
                placeholder="Catatan dari rapat pleno atau pertimbangan keputusan..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {hasil === 'K' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                Sertifikat akan diterbitkan otomatis setelah keputusan disimpan.
              </div>
            )}

            <button
              onClick={() => mutKeputusan.mutate()}
              disabled={!hasil || mutKeputusan.isPending}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold"
            >
              <Save size={16} /> {mutKeputusan.isPending ? 'Menyimpan...' : 'Tetapkan Keputusan'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
