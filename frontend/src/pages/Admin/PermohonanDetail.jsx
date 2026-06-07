import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPermohonanById, assignPermohonan, getAPL01 } from '../../services/permohonan'
import { getTUK } from '../../services/tuk'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import DokumenViewer from '../../components/DokumenViewer'
import toast from 'react-hot-toast'
import { ArrowLeft, Save, Calendar, CheckCircle, XCircle, FileSearch, IdCard, FileText } from 'lucide-react'
import api from '../../services/api'

const APL01_LABELS = {
  nama_lengkap: 'Nama Lengkap', nik: 'NIK', tempat_lahir: 'Tempat Lahir', tanggal_lahir: 'Tanggal Lahir',
  jenis_kelamin: 'Jenis Kelamin', kebangsaan: 'Kebangsaan', kode_pos: 'Kode Pos', alamat: 'Alamat Rumah',
  telp_rumah: 'Telp Rumah', telepon: 'Telepon', email: 'Email', pendidikan: 'Pendidikan',
  institusi: 'Institusi', jabatan: 'Jabatan', kode_pos_kantor: 'Kode Pos Kantor', alamat_kantor: 'Alamat Kantor',
  telp_kantor: 'Telp Kantor', fax_kantor: 'Fax Kantor', email_kantor: 'Email Kantor',
  tujuan_asesmen: 'Tujuan Asesmen', ttd_nama: 'TTD Nama', ttd_tanggal: 'TTD Tanggal',
}

export default function AdminPermohonanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['permohonan', id],
    queryFn: () => getPermohonanById(id),
  })
  const { data: tukData } = useQuery({ queryKey: ['tuk'], queryFn: getTUK })
  const { data: asesorData } = useQuery({
    queryKey: ['asesor-list'],
    queryFn: () => api.get('/auth/asesor-list'),
  })
  const { data: apl01Data } = useQuery({
    queryKey: ['apl01', id],
    queryFn: () => getAPL01(id).catch(() => null),
    retry: false,
  })

  const p = data?.data?.data
  const tuks = tukData?.data?.data || []
  const asesors = asesorData?.data?.data || []
  const apl01 = apl01Data?.data?.data

  const [catatanValidasi, setCatatanValidasi] = useState('')
  const [asesorId, setAsesorId] = useState('')
  const [tukId, setTukId] = useState('')
  const [tanggal, setTanggal] = useState('')
  const [linkVC, setLinkVC] = useState('')

  // Validasi dokumen: setuju atau kembalikan ke asesi
  const mutValidasi = useMutation({
    mutationFn: (disetujui) =>
      api.post(`/permohonan/${id}/validasi-dokumen`, {
        disetujui,
        catatan: catatanValidasi || null,
      }),
    onSuccess: (_, disetujui) => {
      toast.success(disetujui ? 'Dokumen disetujui, permohonan dilanjutkan.' : 'Permohonan dikembalikan ke asesi.')
      qc.invalidateQueries(['permohonan', id])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal memvalidasi'),
  })

  // Penjadwalan asesmen
  const mutAssign = useMutation({
    mutationFn: () =>
      assignPermohonan(id, {
        asesor_id: asesorId || null,
        tuk_id: tukId || null,
        tanggal_asesmen: tanggal || null,
        link_video_conference: linkVC || null,
      }),
    onSuccess: () => {
      toast.success('Penjadwalan disimpan')
      qc.invalidateQueries(['permohonan', id])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan penjadwalan'),
  })

  if (isLoading) return <LoadingSpinner />
  if (!p) return <p className="text-gray-500">Data tidak ditemukan.</p>

  const sudahDivalidasi = !['SUBMITTED'].includes(p.status)
  const bisaDijadwalkan = ['DOKUMEN_DIKAJI', 'DIJADWALKAN'].includes(p.status)

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/permohonan')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Permohonan</h1>
          <p className="text-sm text-gray-500">#{id.slice(0, 8)}</p>
        </div>
      </div>

      {/* Info permohonan */}
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
            ['Link VC', p.link_video_conference
              ? <a key="vc" href={p.link_video_conference} className="text-blue-600 underline" target="_blank" rel="noreferrer">{p.link_video_conference}</a>
              : '-'],
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

      {/* FR-APL-01 — Data Asesi */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <FileText size={18} className="text-blue-600" /> FR-APL-01 — Data Asesi
        </h2>
        <p className="text-xs text-gray-400 mb-4">Formulir permohonan sertifikasi yang diisi asesi (otomatis dari Data Diri).</p>
        {!apl01 ? (
          <p className="text-sm text-gray-400 italic">FR-APL-01 belum diisi oleh asesi.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(apl01.data_json || {})
              .filter(([k, v]) => v && !k.endsWith('_url'))
              .map(([k, v]) => (
                <div key={k} className={k === 'alamat' || k === 'alamat_kantor' ? 'col-span-2' : ''}>
                  <p className="text-gray-500 text-xs">{APL01_LABELS[k] || k.replace(/_/g, ' ')}</p>
                  <p className="font-medium text-gray-900">{String(v)}</p>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Dokumen Persyaratan Asesi (preview) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <IdCard size={18} className="text-blue-600" /> Dokumen Persyaratan Asesi
        </h2>
        <p className="text-xs text-gray-400 mb-4">Periksa kelengkapan & keaslian dokumen sebelum validasi</p>
        <DokumenViewer
          foto_url={p.asesi_foto_url}
          ktp_url={p.asesi_ktp_url}
          ijazah_url={p.asesi_ijazah_url}
          title={null}
        />
      </div>

      {/* Validasi Dokumen Syarat */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <FileSearch size={18} /> Validasi Dokumen Syarat
        </h2>
        <p className="text-xs text-gray-400 mb-4">Setelah memeriksa dokumen di atas, setujui atau kembalikan permohonan</p>

        {sudahDivalidasi ? (
          <div className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium
            ${p.status === 'DITOLAK'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-green-50 border-green-200 text-green-700'}`}>
            {p.status === 'DITOLAK'
              ? <XCircle size={18} />
              : <CheckCircle size={18} />}
            {p.status === 'DITOLAK'
              ? 'Dokumen dikembalikan ke asesi'
              : 'Dokumen telah disetujui — permohonan dilanjutkan'}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catatan (opsional — wajib diisi jika tidak disetujui)
              </label>
              <textarea
                value={catatanValidasi}
                onChange={(e) => setCatatanValidasi(e.target.value)}
                rows={2}
                placeholder="Contoh: KTP tidak terbaca, mohon unggah ulang."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => mutValidasi.mutate(true)}
                disabled={mutValidasi.isPending}
                className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
              >
                <CheckCircle size={15} /> Setujui Dokumen
              </button>
              <button
                onClick={() => {
                  if (!catatanValidasi.trim()) {
                    toast.error('Isi catatan alasan penolakan terlebih dahulu.')
                    return
                  }
                  mutValidasi.mutate(false)
                }}
                disabled={mutValidasi.isPending}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
              >
                <XCircle size={15} /> Kembalikan ke Asesi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Penjadwalan Asesmen */}
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${!bisaDijadwalkan ? 'opacity-50 pointer-events-none' : ''}`}>
        <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Calendar size={18} /> Penjadwalan Asesmen
        </h2>
        {!bisaDijadwalkan && (
          <p className="text-xs text-gray-400 mb-4">Tersedia setelah dokumen disetujui.</p>
        )}
        <div className="grid grid-cols-2 gap-4 mt-4">
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
          className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          <Save size={15} /> {mutAssign.isPending ? 'Menyimpan...' : 'Simpan Penjadwalan'}
        </button>
      </div>
    </div>
  )
}
