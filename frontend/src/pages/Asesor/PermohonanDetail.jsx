import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPermohonanById, getAPL01, getAPL02, verifyAPL02,
  submitRekaman, getRekaman, mulaiAsesmen,
} from '../../services/permohonan'
import StatusBadge from '../../components/StatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import DokumenViewer from '../../components/DokumenViewer'
import ProsesAsesmen from '../../components/ProsesAsesmen'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import {
  ArrowLeft, CheckCircle, Clock, Video, Save,
  PlayCircle, ClipboardList, ChevronDown, ChevronUp, FileText, IdCard, FileSignature,
} from 'lucide-react'

function Collapsible({ title, children, defaultOpen = false, icon: Icon }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-blue-500" />}
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      {open && <div className="px-6 pb-6 border-t border-gray-100 pt-4">{children}</div>}
    </div>
  )
}

// ── Rekaman Asesmen Form ──────────────────────────────────────────────
function RekamanForm({ permohonanId, permohonanStatus }) {
  const qc = useQueryClient()
  const [rekomendasi, setRekomendasi] = useState('')
  const [catatan, setCatatan] = useState('')

  const { data: rekamanData } = useQuery({
    queryKey: ['rekaman', permohonanId],
    queryFn: () => getRekaman(permohonanId).catch(() => null),
    retry: false,
  })
  const rekaman = rekamanData?.data?.data

  const mut = useMutation({
    mutationFn: () => submitRekaman(permohonanId, { rekomendasi, catatan_akhir: catatan || null }),
    onSuccess: () => {
      toast.success('Rekaman asesmen berhasil disimpan')
      qc.invalidateQueries(['rekaman', permohonanId])
      qc.invalidateQueries(['permohonan', permohonanId])
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Gagal menyimpan rekaman'),
  })

  if (rekaman) {
    return (
      <div className={`rounded-xl p-5 border ${rekaman.rekomendasi === 'K' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle size={20} className={rekaman.rekomendasi === 'K' ? 'text-green-600' : 'text-red-500'} />
          <p className={`font-bold text-lg ${rekaman.rekomendasi === 'K' ? 'text-green-800' : 'text-red-700'}`}>
            Rekomendasi: {rekaman.rekomendasi === 'K' ? 'KOMPETEN' : 'BELUM KOMPETEN'}
          </p>
        </div>
        {rekaman.catatan_akhir && (
          <p className="text-sm text-gray-700 mb-2">{rekaman.catatan_akhir}</p>
        )}
        <p className="text-xs text-gray-400">
          Disubmit: {rekaman.submitted_at ? new Date(rekaman.submitted_at).toLocaleString('id-ID') : '-'}
        </p>
      </div>
    )
  }

  if (!['ASESMEN_BERLANGSUNG', 'DIJADWALKAN'].includes(permohonanStatus)) {
    return (
      <p className="text-sm text-gray-400 italic">
        Rekaman asesmen dapat diisi saat asesmen berlangsung.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        Berikan rekomendasi hasil asesmen berdasarkan verifikasi APL-02 dan pelaksanaan asesmen.
        Rekomendasi ini akan menjadi acuan Pimpinan LSP dalam penetapan keputusan akhir.
      </p>

      {/* Rekomendasi */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Rekomendasi Hasil Asesmen</label>
        <div className="flex gap-3">
          <button
            onClick={() => setRekomendasi('K')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition
              ${rekomendasi === 'K'
                ? 'bg-green-600 border-green-600 text-white'
                : 'border-gray-200 text-gray-600 hover:border-green-400 hover:bg-green-50'}`}
          >
            <CheckCircle size={18} /> Kompeten (K)
          </button>
          <button
            onClick={() => setRekomendasi('BK')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition
              ${rekomendasi === 'BK'
                ? 'bg-red-600 border-red-600 text-white'
                : 'border-gray-200 text-gray-600 hover:border-red-400 hover:bg-red-50'}`}
          >
            <ClipboardList size={18} /> Belum Kompeten (BK)
          </button>
        </div>
      </div>

      {/* Catatan */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Akhir Asesor (FR.AK)</label>
        <textarea
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          rows={4}
          placeholder="Catatan hasil asesmen, temuan selama proses, dan pertimbangan rekomendasi..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {rekomendasi === 'K' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Rekomendasi Kompeten akan diteruskan ke Pimpinan LSP untuk penetapan keputusan final.
        </div>
      )}

      <button
        onClick={() => mut.mutate()}
        disabled={!rekomendasi || mut.isPending}
        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold"
      >
        <Save size={15} /> {mut.isPending ? 'Menyimpan...' : 'Simpan Rekaman Asesmen'}
      </button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────
export default function AsesorPermohonanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery({ queryKey: ['permohonan', id], queryFn: () => getPermohonanById(id) })
  const { data: apl01Data } = useQuery({ queryKey: ['apl01', id], queryFn: () => getAPL01(id).catch(() => null), retry: false })
  const { data: apl02Data } = useQuery({ queryKey: ['apl02', id], queryFn: () => getAPL02(id).catch(() => null), retry: false })

  const [catatan, setCatatan] = useState('')

  const mutVerify = useMutation({
    mutationFn: () => verifyAPL02(id, { catatan_asesor: catatan }),
    onSuccess: () => { toast.success('APL-02 berhasil diverifikasi'); qc.invalidateQueries(['apl02', id]) },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal verifikasi'),
  })

  const mutMulai = useMutation({
    mutationFn: () => mulaiAsesmen(id),
    onSuccess: () => { toast.success('Status diperbarui: Asesmen Berlangsung'); qc.invalidateQueries(['permohonan', id]) },
    onError: (e) => toast.error(e.response?.data?.detail || 'Gagal memulai asesmen'),
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
          <div className="flex flex-col gap-2 shrink-0">
            {p.link_video_conference && (
              <a href={p.link_video_conference} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                <Video size={15} /> Mulai Asesmen
              </a>
            )}
            {p.status === 'DIJADWALKAN' && (
              <button
                onClick={() => mutMulai.mutate()}
                disabled={mutMulai.isPending}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                <PlayCircle size={15} /> {mutMulai.isPending ? 'Memulai...' : 'Tandai Berlangsung'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dokumen Persyaratan Asesi */}
      <Collapsible title="Dokumen Persyaratan Asesi" icon={IdCard} defaultOpen={true}>
        <DokumenViewer
          foto_url={p.asesi_foto_url}
          ktp_url={p.asesi_ktp_url}
          ijazah_url={p.asesi_ijazah_url}
          title="Klik dokumen untuk preview atau buka di tab baru"
        />
      </Collapsible>

      {/* APL01 Review */}
      <Collapsible title="FR-APL-01 — Data Asesi" icon={FileText} defaultOpen={true}>
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
      </Collapsible>

      {/* APL02 Verifikasi */}
      <Collapsible title="FR-APL-02 — Asesmen Mandiri" icon={ClipboardList} defaultOpen={true}>
        {!apl02 ? (
          <p className="text-gray-400 text-sm">APL-02 belum diisi oleh asesi.</p>
        ) : (
          <div className="space-y-4">
            {apl02.verified_at ? (
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle size={16} /> <span className="text-sm font-medium">Sudah diverifikasi</span>
              </div>
            ) : null}

            <div className="space-y-3">
              {(apl02.hasil_mandiri_json?.units || []).map((u, ui) => (
                <div key={ui} className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-slate-700 text-white px-3 py-2 text-sm font-semibold flex justify-between">
                    <span>Unit {ui + 1}: {u.nama || '-'}</span>
                    <span className="font-mono text-xs">{u.kode || ''}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {/* dukung struktur lama (u.hasil) & baru (u.elemen) */}
                    {(u.elemen || [{ nama: u.nama, hasil: u.hasil, bukti: u.bukti }]).map((el, ei) => (
                      <div key={ei} className="px-3 py-2 text-sm flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-gray-800">{el.nama || '-'}</p>
                          {el.bukti && <p className="text-xs text-gray-500 mt-0.5">Bukti: {el.bukti}</p>}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold shrink-0 ${el.hasil === 'K' ? 'bg-green-100 text-green-700' : el.hasil === 'BK' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{el.hasil || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
      </Collapsible>

      {/* Rekaman Asesmen — Rekomendasi Asesor (ringkas, jadi acuan keputusan pimpinan) */}
      <Collapsible title="Rekomendasi Asesmen (acuan keputusan pimpinan)" icon={ClipboardList} defaultOpen={['ASESMEN_BERLANGSUNG', 'KEPUTUSAN_DIBUAT'].includes(p.status)}>
        <RekamanForm permohonanId={id} permohonanStatus={p.status} />
      </Collapsible>

      {/* Form Proses Asesmen (BNSP) */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <FileSignature size={18} className="text-blue-600" /> Form Proses Asesmen (BNSP)
        </h2>
        <p className="text-xs text-gray-400 mb-4">Form yang diisi selama pelaksanaan asesmen sesuai buku kerja BNSP.</p>
        <ProsesAsesmen permohonanId={id} p={p} role={user?.role} />
      </div>
    </div>
  )
}
