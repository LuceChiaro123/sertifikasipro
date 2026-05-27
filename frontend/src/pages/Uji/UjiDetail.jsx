import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUji, updateUji } from '../../services/uji'
import { getSkemaById } from '../../services/portal'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import LoadingSpinner from '../../components/LoadingSpinner'
import UjiFormSection from '../../components/UjiFormSection'
import toast from 'react-hot-toast'
import { ArrowLeft, Save, Users, UserCheck, Plus, Trash2, FileSignature, Gavel, Award } from 'lucide-react'

function basePath(role) {
  if (['admin', 'superadmin'].includes(role)) return '/admin'
  if (role === 'pimpinan') return '/pimpinan'
  return '/asesor'
}

export default function UjiDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const role = user?.role
  const base = basePath(role)
  const canManage = ['admin', 'superadmin', 'pimpinan'].includes(role)

  const { data, isLoading } = useQuery({ queryKey: ['uji', id], queryFn: () => getUji(id).then(r => r.data.data) })
  const uji = data

  // Daftar asesor & asesi (untuk admin/ketua mengatur peserta)
  const { data: asesorList } = useQuery({
    queryKey: ['asesor-list-uji'], queryFn: () => api.get('/auth/asesor-list').then(r => r.data.data), enabled: canManage,
  })
  const { data: asesiList } = useQuery({
    queryKey: ['asesi-list-uji'], queryFn: () => api.get('/admin/asesi').then(r => r.data.data), enabled: canManage,
  })

  const mutSave = useMutation({
    mutationFn: (payload) => updateUji(id, payload),
    onSuccess: () => { toast.success('Tersimpan'); qc.invalidateQueries({ queryKey: ['uji', id] }) },
    onError: (e) => toast.error(e.response?.data?.detail || 'Gagal menyimpan'),
  })

  // State editor peserta & asesor
  const [asesorSel, setAsesorSel] = useState([])     // [{id,nama,no_reg}]
  const [peserta, setPeserta] = useState([])         // [{asesi_id,nama,perusahaan,asesor}]
  const [newP, setNewP] = useState({ asesi_id: '', nama: '', perusahaan: '', asesor: '' })
  const [synced, setSynced] = useState(false)
  const [tab, setTab] = useState('uji')   // 'uji' | 'pleno' | 'sertifikat'

  useEffect(() => {
    if (uji && !synced) {
      setAsesorSel(uji.asesor_ids || [])
      setPeserta(uji.peserta || [])
      setSynced(true)
    }
  }, [uji, synced])

  if (isLoading) return <LoadingSpinner />
  if (!uji) return <p className="text-gray-500">Event tidak ditemukan.</p>

  const toggleAsesor = (a) => {
    setAsesorSel(prev => prev.some(x => x.id === a.id)
      ? prev.filter(x => x.id !== a.id)
      : [...prev, { id: a.id, nama: a.nama_lengkap, no_reg: a.nomor_reg_asesor }])
  }
  const addPeserta = () => {
    if (!newP.nama.trim()) { toast.error('Nama peserta wajib diisi'); return }
    setPeserta(prev => [...prev, { ...newP }])
    setNewP({ asesi_id: '', nama: '', perusahaan: '', asesor: '' })
  }
  const removePeserta = (i) => setPeserta(prev => prev.filter((_, idx) => idx !== i))
  const onPickAsesi = (asesiId) => {
    const a = (asesiList || []).find(x => x.id === asesiId)
    setNewP(p => ({ ...p, asesi_id: asesiId, nama: a ? a.nama_lengkap : p.nama }))
  }
  const saveManage = () => mutSave.mutate({ asesor_ids: asesorSel, peserta })

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`${base}/uji`)} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{uji.judul}</h1>
          <p className="text-sm text-gray-500">{uji.skema_nama || '-'} · {uji.tanggal ? new Date(uji.tanggal).toLocaleDateString('id-ID', { dateStyle: 'long' }) : 'Tanggal belum diatur'}</p>
        </div>
      </div>

      {/* Pengaturan peserta & asesor (admin/ketua) */}
      {canManage && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><UserCheck size={18} className="text-blue-600" /> Asesor Ditugaskan</h2>
          <div className="flex flex-wrap gap-2">
            {(asesorList || []).map(a => (
              <label key={a.id} className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm cursor-pointer ${asesorSel.some(x => x.id === a.id) ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                <input type="checkbox" checked={asesorSel.some(x => x.id === a.id)} onChange={() => toggleAsesor(a)} />
                {a.nama_lengkap} <span className="text-gray-400 text-xs">{a.nomor_reg_asesor}</span>
              </label>
            ))}
            {(asesorList || []).length === 0 && <p className="text-xs text-gray-400">Belum ada asesor terdaftar.</p>}
          </div>

          <h2 className="font-semibold text-gray-900 flex items-center gap-2 pt-2"><Users size={18} className="text-blue-600" /> Daftar Peserta</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100"><tr>{['No', 'Nama Asesi', 'Perusahaan', 'Asesor', ''].map(h => <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
              <tbody>
                {peserta.map((p, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2">{i + 1}</td><td className="px-3 py-2">{p.nama}</td>
                    <td className="px-3 py-2 text-gray-600">{p.perusahaan || '-'}</td><td className="px-3 py-2 text-gray-600">{p.asesor || '-'}</td>
                    <td className="px-3 py-2 text-right"><button onClick={() => removePeserta(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
                {peserta.length === 0 && <tr><td colSpan={5} className="px-3 py-3 text-center text-gray-400 text-xs">Belum ada peserta</td></tr>}
              </tbody>
            </table>
          </div>
          {/* tambah peserta */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Pilih Asesi</label>
              <select value={newP.asesi_id} onChange={(e) => onPickAsesi(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm">
                <option value="">-- manual --</option>
                {(asesiList || []).map(a => <option key={a.id} value={a.id}>{a.nama_lengkap}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Nama</label>
              <input type="text" value={newP.nama} onChange={(e) => setNewP(p => ({ ...p, nama: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Perusahaan</label>
              <input type="text" value={newP.perusahaan} onChange={(e) => setNewP(p => ({ ...p, perusahaan: e.target.value }))} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Asesor</label>
              <div className="flex gap-1">
                <select value={newP.asesor} onChange={(e) => setNewP(p => ({ ...p, asesor: e.target.value }))} className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm">
                  <option value="">-- pilih --</option>
                  {asesorSel.map((a, i) => <option key={i} value={a.nama}>{a.nama}</option>)}
                </select>
                <button onClick={addPeserta} className="px-2 bg-blue-600 text-white rounded hover:bg-blue-700"><Plus size={16} /></button>
              </div>
            </div>
          </div>
          <button onClick={saveManage} disabled={mutSave.isPending}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold">
            <Save size={15} /> {mutSave.isPending ? 'Menyimpan...' : 'Simpan Peserta & Asesor'}
          </button>
        </div>
      )}

      {/* Dokumen — tab per tahap */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex gap-1 border-b border-gray-200 mb-4">
          {[
            { key: 'uji', label: 'Uji Kompetensi', icon: FileSignature },
            { key: 'pleno', label: 'Pleno', icon: Gavel },
            { key: 'sertifikat', label: 'Cetak Sertifikat', icon: Award },
          ].map(t => {
            const Icon = t.icon
            const active = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium -mb-px border-b-2 ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <Icon size={16} /> {t.label}
              </button>
            )
          })}
        </div>

        {tab === 'uji' && (
          <>
            <p className="text-xs text-gray-400 mb-4">Alur Input → Validasi. Admin mengisi SPT; Asesor mengisi Berita Acara & Laporan; Ketua memvalidasi.</p>
            <UjiFormSection ujiId={id} uji={uji} role={role} menu="uji" />
          </>
        )}
        {tab === 'pleno' && (
          <>
            <p className="text-xs text-gray-400 mb-4">Alur Input → Validasi. Admin mengisi SPT Pleno; Asesor mengisi Notulen, Berita Acara Pleno & SK Penerbitan Sertifikat; Ketua memvalidasi.</p>
            <UjiFormSection ujiId={id} uji={uji} role={role} menu="pleno" />
          </>
        )}
        {tab === 'sertifikat' && (
          <>
            <p className="text-xs text-gray-400 mb-4">Alur Input → Validasi. Admin mengisi Permohonan Blanko (BNSP) & data Sertifikat Kompetensi; Ketua memvalidasi sebelum cetak.</p>
            <UjiFormSection ujiId={id} uji={uji} role={role} menu="sertifikat" />
          </>
        )}
      </div>
    </div>
  )
}
