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

  const mutCreate = useMutation({
    mutationFn: (d) => createSkema(d),
    onSuccess: () => { toast.success('Skema berhasil ditambahkan'); qc.invalidateQueries(['skema']); resetForm() },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menyimpan'),
  })

  const mutUpdate = useMutation({
    mutationFn: (d) => updateSkema(editId, d),
    onSuccess: () => { toast.success('Skema berhasil diperbarui'); qc.invalidateQueries(['skema']); resetForm() },
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
    const payload = { ...form, biaya: parseFloat(form.biaya) || 0 }
    editId ? mutUpdate.mutate(payload) : mutCreate.mutate(payload)
  }

  const isPending = mutCreate.isPending || mutUpdate.isPending

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
