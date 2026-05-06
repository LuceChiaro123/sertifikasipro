import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPermohonanById, updateStatusPermohonan, assignPermohonan } from '../../services/permohonan'
import { buatKeputusan, getKeputusan } from '../../services/admin'
import { getTUK } from '../../services/tuk'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { ArrowLeft, Save, UserCheck, Calendar, CheckCircle, XCircle, Award } from 'lucide-react'
import api from '../../services/api'

const STATUS_OPTIONS = [
  'SUBMITTED', 'DOKUMEN_DIKAJI', 'DIJADWALKAN',
  'ASESMEN_BERLANGSUNG', 'KEPUTUSAN_DIBUAT',
  'SERTIFIKAT_DITERBITKAN', 'SELESAI', 'DITOLAK',
]

export default function AdminPermohonanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['permohonan', id],
    queryFn: () => getPermohonanById(id),
  })
  const { data: tukData } = useQuery({ queryKey: ['tuk'], queryFn: getTUK })
  const { data: asesorData } = useQuery({ queryKey: ['asesor-list'], queryFn: () => api.get('/auth/asesor-list') })

  const p = data?.data?.data
  const tuks = tukData?.data?.data || []
  const asesors = asesorData?.data?.data || []

  const [status, setStatus] = useState('')
  const [catatan, setCatatan] = useState('')
  const [asesorId, setAsesorId] = useState('')
  const [tukId, setTukId] = useState('')
  const [tanggal, setTanggal] = useState('')
  const [linkVC, setLinkVC] = useState('')
  const [hasilKeputusan, setHasilKeputusan] = useState('')
  const [catatanKeputusan, setCatatanKeputusan] = useState('')

  const { data: keputusanData } = useQuery({
    queryKey: ['keputusan', id],
    queryFn: () => getKeputusan(id).catch(() => null),
    retry: false,
  })
  const keputusan = keputusanData?.data?.data

  const mutKeputusan = useMutation({
    mutationFn: () => buatKeputusan(id, { hasil: hasilKeputusan, catatan: catatanKeputusan }),
    onSuccess: (res) => {
      const hasil = res.data?.data?.hasil
      toast.success(hasil === 'K' ? 'Asesi dinyatakan Kompeten! Sertifikat diterbitkan.' : 'Keputusan Belum Kompeten disimpan.')
      qc.invalidateQueries(['permohonan', id])
      qc.invalidateQueries(['keputusan', id])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan keputusan'),
  })

  const mutStatus = useMutation({
    mutationFn: () => updateStatusPermohonan(id, { status, catatan_admin: catatan }),
    onSuccess: () => { toast.success('Status diperbarui'); qc.invalidateQueries(['permohonan', id]) },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal update status'),
  })

  const mutAssign = useMutation({
    mutationFn: () => assignPermohonan(id, {
      asesor_id: asesorId || null,
      tuk_id: tukId || null,
      tanggal_asesmen: tanggal || null,
      link_video_conference: linkVC || null,
    }),
    onSuccess: () => { toast.success('Penjadwalan disimpan'); qc.invalidateQueries(['permohonan', id]) },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan penjadwalan'),
  })

  if (isLoading) return <LoadingSpinner />
  if (!p) return <p className="text-gray-500">Data tidak ditemukan.</p>

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/permohonan')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Permohonan</h1>
          <p className="text-sm text-gray-500">#{id.slice(0, 8)}</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Informasi Permohonan</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            ['Asesi', p.asesi_nama],
            ['NIK', p.asesi_nik],
            ['Skema', `[${p.skema_kode}] ${p.skema_nama}`],
            ['Jenis', p.jenis === 'uji_sertifikasi' ? 'Uji Sertifikasi' : 'Sertifikasi Ulang'],
            ['Status', <StatusBadge key="s" status={p.status} />],
            ['Tgl Submit', p.tanggal_submit ? new Date(p.tanggal_submit).toLocaleString('id-ID') : '-'],
            ['Asesor', p.asesor_nama || '-'],
            ['TUK', p.tuk_nama || '-'],
            ['Tgl Asesmen', p.tanggal_asesmen ? new Date(p.tanggal_asesmen).toLocaleString('id-ID') : '-'],
            ['Link VC', p.link_video_conference ? <a key="vc" href={p.link_video_conference} className="text-blue-600 underline" target="_blank" rel="noreferrer">{p.link_video_conference}</a> : '-'],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-gray-500">{label}</p>
              <p className="font-medium text-gray-900 mt-0.5">{val}</p>
            </div>
          ))}
        </div>
        {p.catatan_admin && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
            <strong>Catatan Admin:</strong> {p.catatan_admin}
          </div>
        )}
      </div>

      {/* Update Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserCheck size={18} /> Update Status
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Baru</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Pilih Status --</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={2}
              placeholder="Catatan untuk asesi..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <button
            onClick={() => mutStatus.mutate()}
            disabled={!status || mutStatus.isPending}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            <Save size={15} /> {mutStatus.isPending ? 'Menyimpan...' : 'Simpan Status'}
          </button>
        </div>
      </div>

      {/* Keputusan Sertifikasi */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award size={18} /> Keputusan Sertifikasi
        </h2>

        {keputusan ? (
          <div className={`rounded-xl p-5 flex items-start gap-4 ${keputusan.hasil === 'K' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {keputusan.hasil === 'K'
              ? <CheckCircle size={22} className="text-green-600 shrink-0 mt-0.5" />
              : <XCircle size={22} className="text-red-500 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className={`font-bold text-lg ${keputusan.hasil === 'K' ? 'text-green-800' : 'text-red-700'}`}>
                {keputusan.hasil === 'K' ? 'KOMPETEN' : 'BELUM KOMPETEN'}
              </p>
              {keputusan.catatan && <p className="text-sm mt-1 text-gray-700">{keputusan.catatan}</p>}
              {keputusan.sertifikat && (
                <div className="mt-3 text-sm">
                  <p className="text-green-700 font-medium">Nomor Sertifikat: <span className="font-mono">{keputusan.sertifikat.nomor_sertifikat}</span></p>
                  <p className="text-green-600">Berlaku: {keputusan.sertifikat.tanggal_terbit} s/d {keputusan.sertifikat.tanggal_berakhir}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Buat keputusan hasil asesmen untuk permohonan ini.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasil Asesmen</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setHasilKeputusan('K')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition ${hasilKeputusan === 'K' ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  <CheckCircle size={16} /> Kompeten (K)
                </button>
                <button
                  onClick={() => setHasilKeputusan('BK')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition ${hasilKeputusan === 'BK' ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  <XCircle size={16} /> Belum Kompeten (BK)
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
              <textarea
                value={catatanKeputusan}
                onChange={(e) => setCatatanKeputusan(e.target.value)}
                rows={2} placeholder="Catatan hasil asesmen..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <button
              onClick={() => mutKeputusan.mutate()}
              disabled={!hasilKeputusan || mutKeputusan.isPending}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              <Save size={15} /> {mutKeputusan.isPending ? 'Menyimpan...' : 'Simpan Keputusan'}
            </button>
          </div>
        )}
      </div>

      {/* Penjadwalan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar size={18} /> Penjadwalan Asesmen
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asesor</label>
            <select
              value={asesorId}
              onChange={(e) => setAsesorId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Pilih Asesor --</option>
              {asesors.map((a) => (
                <option key={a.id} value={a.id}>{a.nama_lengkap} ({a.nomor_reg_asesor})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TUK</label>
            <select
              value={tukId}
              onChange={(e) => setTukId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Pilih TUK --</option>
              {tuks.map((t) => (
                <option key={t.id} value={t.id}>{t.nama}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Asesmen</label>
            <input
              type="datetime-local"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link Video Conference</label>
            <input
              type="url"
              value={linkVC}
              onChange={(e) => setLinkVC(e.target.value)}
              placeholder="https://zoom.us/j/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={() => mutAssign.mutate()}
          disabled={mutAssign.isPending}
          className="mt-4 flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
        >
          <Save size={15} /> {mutAssign.isPending ? 'Menyimpan...' : 'Simpan Penjadwalan'}
        </button>
      </div>
    </div>
  )
}
