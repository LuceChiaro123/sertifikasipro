import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPermohonanById, getRekaman, updateKeputusanDokumen, getBanding, putusBanding, getSertifikatPermohonan, terbitkanSertifikat } from '../../services/permohonan'
import { buatKeputusan, getKeputusan } from '../../services/admin'
import { uploadFile } from '../../services/admin'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  ArrowLeft, CheckCircle, XCircle, Save, Award, User, Calendar,
  ClipboardList, FileUp, Upload, FileCheck, MessageSquare, Download,
} from 'lucide-react'

const MEDIA_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '')

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
  const { data: rekamanData } = useQuery({
    queryKey: ['rekaman', id],
    queryFn: () => getRekaman(id).catch(() => null),
    retry: false,
  })
  const { data: bandingData } = useQuery({
    queryKey: ['banding', id],
    queryFn: () => getBanding(id).catch(() => null),
    retry: false,
  })
  const { data: sertData } = useQuery({
    queryKey: ['sertifikat', id],
    queryFn: () => getSertifikatPermohonan(id).catch(() => null),
    retry: false,
  })

  const [hasil, setHasil] = useState('')
  const [catatan, setCatatan] = useState('')
  const [skUrl, setSkUrl] = useState('')
  const [baUrl, setBaUrl] = useState('')
  const [uploadingsk, setUploadingSk] = useState(false)
  const [uploadingba, setUploadingBa] = useState(false)

  const [bandingKeputusan, setBandingKeputusan] = useState('')
  const [bandingDiterima, setBandingDiterima] = useState(null)

  const p = data?.data?.data
  const keputusan = keputusanData?.data?.data
  const rekaman = rekamanData?.data?.data
  const banding = bandingData?.data?.data
  const sert = sertData?.data?.data

  const mutTerbitkan = useMutation({
    mutationFn: () => terbitkanSertifikat(id),
    onSuccess: () => {
      toast.success('e-Sertifikat berhasil diterbitkan')
      qc.invalidateQueries(['sertifikat', id])
      qc.invalidateQueries(['keputusan', id])
      qc.invalidateQueries(['permohonan', id])
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Gagal menerbitkan sertifikat'),
  })

  const mutBanding = useMutation({
    mutationFn: () => putusBanding(id, { diterima: bandingDiterima, keputusan_banding: bandingKeputusan }),
    onSuccess: () => {
      toast.success('Keputusan banding berhasil disimpan')
      qc.invalidateQueries(['banding', id])
      qc.invalidateQueries(['permohonan', id])
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Gagal memproses banding'),
  })

  const mutKeputusan = useMutation({
    mutationFn: () => buatKeputusan(id, {
      hasil,
      catatan: catatan || null,
      sk_komite_url: skUrl || null,
      berita_acara_url: baUrl || null,
    }),
    onSuccess: (res) => {
      const h = res.data?.data?.hasil
      if (h === 'K') {
        toast.success('Asesi dinyatakan KOMPETEN. Silakan terbitkan e-Sertifikat.')
      } else {
        toast.success('Keputusan BELUM KOMPETEN telah disimpan.')
      }
      qc.invalidateQueries(['permohonan', id])
      qc.invalidateQueries(['keputusan', id])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan keputusan'),
  })

  const mutDokumen = useMutation({
    mutationFn: (data) => updateKeputusanDokumen(id, data),
    onSuccess: () => toast.success('Dokumen berhasil disimpan'),
    onError: () => toast.error('Gagal menyimpan dokumen'),
  })

  const handleUploadSk = async (file) => {
    if (!file) return
    setUploadingSk(true)
    try {
      const res = await uploadFile(file)
      const url = res.data.data.url
      setSkUrl(url)
      toast.success('SK Komite berhasil diupload')
    } catch { toast.error('Gagal upload SK Komite') }
    finally { setUploadingSk(false) }
  }

  const handleUploadBa = async (file) => {
    if (!file) return
    setUploadingBa(true)
    try {
      const res = await uploadFile(file)
      const url = res.data.data.url
      setBaUrl(url)
      toast.success('Berita Acara berhasil diupload')
    } catch { toast.error('Gagal upload Berita Acara') }
    finally { setUploadingBa(false) }
  }

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

      {/* Rekomendasi Asesor */}
      {rekaman && (
        <div className={`rounded-xl border p-5 ${rekaman.rekomendasi === 'K' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList size={16} className={rekaman.rekomendasi === 'K' ? 'text-green-600' : 'text-orange-600'} />
            <p className="font-semibold text-gray-800 text-sm">Rekomendasi Asesor</p>
          </div>
          <p className={`text-xl font-bold mb-1 ${rekaman.rekomendasi === 'K' ? 'text-green-700' : 'text-orange-700'}`}>
            {rekaman.rekomendasi === 'K' ? '✓ KOMPETEN' : '✗ BELUM KOMPETEN'}
          </p>
          {rekaman.catatan_akhir && (
            <p className="text-sm text-gray-700">{rekaman.catatan_akhir}</p>
          )}
        </div>
      )}

      {/* Proses Banding */}
      {banding && (
        <div className="bg-white rounded-xl border border-orange-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-orange-500" /> Permohonan Banding
          </h2>
          <div className="mb-4 p-4 bg-orange-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Alasan Banding:</p>
            <p className="text-sm text-gray-800">{banding.alasan}</p>
            <p className="text-xs text-gray-400 mt-2">Diajukan: {new Date(banding.diajukan_at).toLocaleString('id-ID')}</p>
          </div>
          {banding.status === 'PENDING' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keputusan Banding</label>
                <textarea value={bandingKeputusan} onChange={(e) => setBandingKeputusan(e.target.value)}
                  rows={3} placeholder="Penjelasan keputusan banding..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setBandingDiterima(true); }}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition ${bandingDiterima === true ? 'bg-green-600 border-green-600 text-white' : 'border-gray-200 text-gray-600 hover:border-green-400'}`}>
                  ✓ Terima Banding (Asesmen Ulang)
                </button>
                <button onClick={() => { setBandingDiterima(false); }}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition ${bandingDiterima === false ? 'bg-red-600 border-red-600 text-white' : 'border-gray-200 text-gray-600 hover:border-red-400'}`}>
                  ✗ Tolak Banding
                </button>
              </div>
              <button onClick={() => mutBanding.mutate()}
                disabled={bandingDiterima === null || !bandingKeputusan.trim() || mutBanding.isPending}
                className="w-full bg-orange-600 text-white py-2.5 rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-semibold">
                {mutBanding.isPending ? 'Menyimpan...' : 'Simpan Keputusan Banding'}
              </button>
            </div>
          ) : (
            <div className={`p-4 rounded-lg ${banding.status === 'DITERIMA' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
              <p className="font-semibold">{banding.status === 'DITERIMA' ? 'Banding Diterima' : 'Banding Ditolak'}</p>
              <p className="text-sm mt-1">{banding.keputusan_banding}</p>
            </div>
          )}
        </div>
      )}

      {/* Form keputusan atau hasil */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award size={18} className="text-blue-600" /> Penetapan Hasil Pleno
        </h2>

        {keputusan ? (
          // Sudah ada keputusan — tampilkan hasil + upload dokumen
          <div className="space-y-4">
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
              {/* Hasil BK → sertifikat dilarang terbit */}
              {keputusan.hasil === 'BK' && (
                <p className="mt-2 text-sm text-red-700 bg-white border border-red-200 rounded-lg p-3">
                  Sertifikat <strong>tidak dapat diterbitkan</strong>.
                </p>
              )}
              {/* Penerbitan e-Sertifikat (hanya untuk hasil KOMPETEN) */}
              {keputusan.hasil === 'K' && (
                sert?.file_url ? (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-green-200 text-sm space-y-2">
                    <p className="font-semibold text-green-800 flex items-center gap-1">
                      <Award size={14} /> e-Sertifikat Diterbitkan
                    </p>
                    <p className="text-gray-700">Nomor: <span className="font-mono font-bold">{sert.nomor_sertifikat}</span></p>
                    <p className="text-gray-500">Berlaku: {sert.tanggal_terbit} s/d {sert.tanggal_berakhir}</p>
                    <a href={`${MEDIA_ROOT}${sert.file_url}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                      <Download size={14} /> Lihat / Unduh PDF
                    </a>
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-green-200 text-sm">
                    <p className="text-gray-600 mb-2">Asesi dinyatakan KOMPETEN. Terbitkan e-Sertifikat resmi (PDF) untuk asesi.</p>
                    <button onClick={() => mutTerbitkan.mutate()} disabled={mutTerbitkan.isPending}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                      <Award size={15} /> {mutTerbitkan.isPending ? 'Menerbitkan...' : 'Terbitkan e-Sertifikat'}
                    </button>
                  </div>
                )
              )}
              <p className="text-xs text-gray-400 mt-3">
                Diputuskan: {keputusan.diputuskan_at ? new Date(keputusan.diputuskan_at).toLocaleString('id-ID') : '-'}
              </p>
            </div>

            {/* Upload dokumen pleno */}
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FileUp size={15} className="text-blue-500" /> Dokumen Administrasi Pleno
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { label: 'SK Komite / Surat Keputusan', key: 'sk', url: skUrl, onUpload: handleUploadSk, loading: uploadingsk },
                  { label: 'Berita Acara Pleno', key: 'ba', url: baUrl, onUpload: handleUploadBa, loading: uploadingba },
                ].map(({ label, key, url, onUpload, loading }) => (
                  <div key={key} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">{label}</p>
                      {url
                        ? <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1"><FileCheck size={12} /> {url.split('/').pop()}</p>
                        : <p className="text-xs text-gray-400 mt-0.5">Belum diupload</p>}
                    </div>
                    <label className={`cursor-pointer flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 ${loading ? 'opacity-50' : ''}`}>
                      <Upload size={14} />
                      {loading ? 'Mengupload...' : url ? 'Ganti' : 'Upload'}
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => onUpload(e.target.files[0])} disabled={loading} />
                    </label>
                  </div>
                ))}
              </div>
              {(skUrl || baUrl) && (
                <button
                  onClick={() => mutDokumen.mutate({ sk_komite_url: skUrl || undefined, berita_acara_url: baUrl || undefined })}
                  disabled={mutDokumen.isPending}
                  className="mt-3 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={14} /> {mutDokumen.isPending ? 'Menyimpan...' : 'Simpan Dokumen'}
                </button>
              )}
            </div>
          </div>
        ) : (
          // Belum ada keputusan — tampilkan form
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Sebagai Pimpinan LSP, tetapkan hasil asesmen berdasarkan laporan asesor dan rekomendasi pleno.
            </p>

            {/* Upload dokumen (opsional sebelum keputusan) */}
            <div className="grid grid-cols-1 gap-3 p-4 bg-gray-50 rounded-xl">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dokumen Pleno (opsional)</p>
              {[
                { label: 'SK Komite', key: 'sk', url: skUrl, onUpload: handleUploadSk, loading: uploadingsk },
                { label: 'Berita Acara', key: 'ba', url: baUrl, onUpload: handleUploadBa, loading: uploadingba },
              ].map(({ label, key, url, onUpload, loading }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 flex-1">{label}:</span>
                  {url
                    ? <span className="text-xs text-green-600 flex items-center gap-1"><FileCheck size={12} /> Terupload</span>
                    : null}
                  <label className={`cursor-pointer flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs text-gray-600 hover:bg-gray-100 ${loading ? 'opacity-50' : ''}`}>
                    <Upload size={12} />
                    {loading ? 'Upload...' : url ? 'Ganti' : 'Upload'}
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => onUpload(e.target.files[0])} disabled={loading} />
                  </label>
                </div>
              ))}
            </div>

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
                Setelah keputusan KOMPETEN disimpan, tombol <strong>"Terbitkan e-Sertifikat"</strong> akan muncul untuk menerbitkan sertifikat PDF.
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
