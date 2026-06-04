import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSkema, createSkema, updateSkema, deleteSkema } from '../../services/skema'
import { Plus, Pencil, Trash2, X, Save, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

const emptyForm = { kode: '', nama: '', biaya: '', unit_kompetensi: [], persyaratan: [] }

export default function AdminSkema() {
  const qc = useQueryClient()
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({ queryKey: ['skema'], queryFn: getSkema })
  const skemas = data?.data?.data || []

  const invalidateSkema = () => {
    qc.invalidateQueries(['skema'])           // tabel admin
    qc.invalidateQueries(['skema-detail'])    // dipakai APL-02
    qc.invalidateQueries(['skema-units'])     // dipakai AK.02 / MAPA.02
    qc.invalidateQueries(['skema-all'])       // dropdown buat event/permohonan
  }
  const mutCreate = useMutation({
    mutationFn: (d) => createSkema(d),
    onSuccess: () => { toast.success('Skema berhasil ditambahkan'); invalidateSkema(); resetForm() },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan'),
  })

  const mutUpdate = useMutation({
    mutationFn: (d) => updateSkema(editId, d),
    onSuccess: () => { toast.success('Skema berhasil diperbarui'); invalidateSkema(); resetForm() },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal memperbarui'),
  })

  const mutDelete = useMutation({
    mutationFn: (id) => deleteSkema(id),
    onSuccess: () => { toast.success('Skema dihapus'); qc.invalidateQueries(['skema']) },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menghapus'),
  })

  const resetForm = () => { setForm(emptyForm); setEditId(null); setShowForm(false) }

  const startEdit = (s) => {
    setForm({ kode: s.kode, nama: s.nama, biaya: s.biaya, unit_kompetensi: s.unit_kompetensi, persyaratan: s.persyaratan })
    setEditId(s.id)
    setShowForm(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Bersihkan baris kosong sebelum simpan
    const persyaratan = (form.persyaratan || []).map(s => (s || '').trim()).filter(Boolean)
    const unit_kompetensi = (form.unit_kompetensi || [])
      .filter(u => (u.kode || '').trim() || (u.nama || '').trim())
      .map(u => ({
        kode: (u.kode || '').trim(),
        nama: (u.nama || '').trim(),
        elemen: (u.elemen || []).filter(e => (e.nama || '').trim()).map(e => ({
          nama: (e.nama || '').trim(),
          kuk: (e.kuk || []).map(k => (k || '').trim()).filter(Boolean),
        })),
      }))
    const payload = { ...form, biaya: parseFloat(form.biaya) || 0, persyaratan, unit_kompetensi }
    editId ? mutUpdate.mutate(payload) : mutCreate.mutate(payload)
  }

  const isPending = mutCreate.isPending || mutUpdate.isPending

  // ── Editor Persyaratan ──
  const persyaratan = form.persyaratan || []
  const setReq = (next) => setForm(f => ({ ...f, persyaratan: next }))
  const addReq = () => setReq([...persyaratan, ''])
  const updReq = (i, v) => setReq(persyaratan.map((x, idx) => (idx === i ? v : x)))
  const delReq = (i) => setReq(persyaratan.filter((_, idx) => idx !== i))

  // ── Editor Unit Kompetensi (kode, nama, elemen, KUK) ──
  const units = form.unit_kompetensi || []
  const setUnits = (next) => setForm(f => ({ ...f, unit_kompetensi: next }))
  const addUnit = () => setUnits([...units, { kode: '', nama: '', elemen: [] }])
  const updUnit = (ui, patch) => setUnits(units.map((u, idx) => (idx === ui ? { ...u, ...patch } : u)))
  const delUnit = (ui) => setUnits(units.filter((_, idx) => idx !== ui))
  const setElems = (ui, elems) => updUnit(ui, { elemen: elems })
  const addElem = (ui) => setElems(ui, [...(units[ui].elemen || []), { nama: '', kuk: [] }])
  const updElem = (ui, ei, patch) => setElems(ui, (units[ui].elemen || []).map((e, idx) => (idx === ei ? { ...e, ...patch } : e)))
  const delElem = (ui, ei) => setElems(ui, (units[ui].elemen || []).filter((_, idx) => idx !== ei))
  const setKuks = (ui, ei, kuks) => updElem(ui, ei, { kuk: kuks })
  const addKuk = (ui, ei) => setKuks(ui, ei, [...((units[ui].elemen[ei] || {}).kuk || []), ''])
  const updKuk = (ui, ei, ki, v) => setKuks(ui, ei, ((units[ui].elemen[ei] || {}).kuk || []).map((x, idx) => (idx === ki ? v : x)))
  const delKuk = (ui, ei, ki) => setKuks(ui, ei, ((units[ui].elemen[ei] || {}).kuk || []).filter((_, idx) => idx !== ki))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Skema Sertifikasi</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola skema sertifikasi LSP</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus size={16} /> Tambah Skema
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">{editId ? 'Edit Skema' : 'Tambah Skema Baru'}</h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kode Skema</label>
                <input
                  value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })}
                  required placeholder="contoh: SKM-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Biaya (Rp)</label>
                <input
                  type="number" value={form.biaya} onChange={(e) => setForm({ ...form, biaya: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Skema</label>
              <input
                value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })}
                required placeholder="Nama skema sertifikasi"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Persyaratan Dasar Peserta */}
            <div className="border-t border-gray-100 pt-4">
              <label className="block text-sm font-semibold text-gray-800 mb-2">Persyaratan Dasar Peserta</label>
              <div className="space-y-2">
                {persyaratan.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                    <input value={p} onChange={(e) => updReq(i, e.target.value)} placeholder="mis. Pendidikan minimal SMK Jurusan TKJ atau setara"
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="button" onClick={() => delReq(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                ))}
                {persyaratan.length === 0 && <p className="text-xs text-gray-400">Belum ada persyaratan.</p>}
              </div>
              <button type="button" onClick={addReq} className="mt-2 flex items-center gap-1 text-blue-600 text-xs font-medium hover:underline">
                <Plus size={13} /> Tambah Persyaratan
              </button>
            </div>

            {/* Unit Kompetensi */}
            <div className="border-t border-gray-100 pt-4">
              <label className="block text-sm font-semibold text-gray-800 mb-2">Unit Kompetensi</label>
              <div className="space-y-3">
                {units.map((u, ui) => (
                  <div key={ui} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
                    <div className="flex gap-2 items-center">
                      <span className="text-xs font-semibold text-gray-500 w-12">Unit {ui + 1}</span>
                      <input value={u.kode || ''} onChange={(e) => updUnit(ui, { kode: e.target.value })} placeholder="Kode Unit (mis. J.611000.001.01)"
                        className="w-56 px-2 py-1.5 border border-gray-300 rounded text-sm font-mono" />
                      <input value={u.nama || ''} onChange={(e) => updUnit(ui, { nama: e.target.value })} placeholder="Nama / Judul Unit"
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm" />
                      <button type="button" onClick={() => delUnit(ui)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                    </div>
                    {/* Elemen + KUK */}
                    <div className="pl-12 space-y-2">
                      {(u.elemen || []).map((el, ei) => (
                        <div key={ei} className="border-l-2 border-blue-100 pl-3 space-y-1.5">
                          <div className="flex gap-2 items-center">
                            <input value={el.nama || ''} onChange={(e) => updElem(ui, ei, { nama: e.target.value })} placeholder={`Elemen ${ei + 1}`}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-medium" />
                            <button type="button" onClick={() => delElem(ui, ei)} className="text-red-300 hover:text-red-500"><Trash2 size={13} /></button>
                          </div>
                          <div className="pl-3 space-y-1">
                            {(el.kuk || []).map((k, ki) => (
                              <div key={ki} className="flex gap-2 items-center">
                                <span className="text-[10px] text-gray-300">KUK</span>
                                <input value={k} onChange={(e) => updKuk(ui, ei, ki, e.target.value)} placeholder="Kriteria Unjuk Kerja"
                                  className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs" />
                                <button type="button" onClick={() => delKuk(ui, ei, ki)} className="text-red-300 hover:text-red-500"><Trash2 size={11} /></button>
                              </div>
                            ))}
                            <button type="button" onClick={() => addKuk(ui, ei)} className="flex items-center gap-1 text-blue-500 text-[11px] hover:underline"><Plus size={11} /> KUK</button>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => addElem(ui)} className="flex items-center gap-1 text-blue-500 text-xs hover:underline"><Plus size={12} /> Tambah Elemen</button>
                    </div>
                  </div>
                ))}
                {units.length === 0 && <p className="text-xs text-gray-400">Belum ada unit kompetensi.</p>}
              </div>
              <button type="button" onClick={addUnit} className="mt-2 flex items-center gap-1 text-blue-600 text-xs font-medium hover:underline">
                <Plus size={13} /> Tambah Unit Kompetensi
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit" disabled={isPending}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                <Save size={15} /> {isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button type="button" onClick={resetForm} className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Memuat...</div>
        ) : skemas.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Belum ada skema sertifikasi.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Kode', 'Nama Skema', 'Biaya', 'Aksi'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {skemas.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.kode}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.nama}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.biaya > 0 ? `Rp ${Number(s.biaya).toLocaleString('id-ID')}` : 'Gratis'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(s)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => { if (confirm('Hapus skema ini?')) mutDelete.mutate(s.id) }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Hapus">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
