import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTUK, createTUK, updateTUK, deleteTUK } from '../../services/tuk'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react'

const EMPTY = { nama: '', jenis: 'sewaktu', alamat: '', kepala_tuk: '' }

export default function TUKPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['tuk'], queryFn: getTUK })
  const tuks = data?.data?.data || []

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null) // TUK object being edited
  const [form, setForm] = useState(EMPTY)

  const mutCreate = useMutation({
    mutationFn: createTUK,
    onSuccess: () => { toast.success('TUK berhasil ditambahkan'); qc.invalidateQueries(['tuk']); setShowForm(false); setForm(EMPTY) },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal'),
  })

  const mutUpdate = useMutation({
    mutationFn: ({ id, data }) => updateTUK(id, data),
    onSuccess: () => { toast.success('TUK diperbarui'); qc.invalidateQueries(['tuk']); setEditing(null) },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal'),
  })

  const mutDelete = useMutation({
    mutationFn: deleteTUK,
    onSuccess: () => { toast.success('TUK dihapus'); qc.invalidateQueries(['tuk']) },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menghapus'),
  })

  const handleSave = () => {
    const missing = []
    if (!form.nama.trim()) missing.push('Nama TUK')
    if (!form.alamat.trim()) missing.push('Alamat')
    if (!form.kepala_tuk.trim()) missing.push('Kepala TUK')
    if (missing.length) return toast.error(`Lengkapi dulu: ${missing.join(', ')}`)
    if (editing) {
      mutUpdate.mutate({ id: editing.id, data: form })
    } else {
      mutCreate.mutate(form)
    }
  }
  const tukMissing = !form.nama.trim() || !form.alamat.trim() || !form.kepala_tuk.trim()

  const openEdit = (t) => {
    setEditing(t)
    setForm({ nama: t.nama, jenis: t.jenis, alamat: t.alamat || '', kepala_tuk: t.kepala_tuk || '' })
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY) }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tempat Uji Kompetensi</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola daftar TUK untuk pelaksanaan asesmen.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} /> Tambah TUK
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">{editing ? 'Edit TUK' : 'TUK Baru'}</h2>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama TUK *</label>
              <input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${!form.nama.trim() ? 'border-amber-400 focus:ring-amber-400' : 'border-gray-300 focus:ring-blue-500'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jenis TUK</label>
              <select
                value={form.jenis}
                onChange={(e) => setForm({ ...form, jenis: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sewaktu">Sewaktu</option>
                <option value="mandiri">Mandiri</option>
                <option value="tempat_kerja">Tempat Kerja</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kepala TUK *</label>
              <input
                value={form.kepala_tuk}
                onChange={(e) => setForm({ ...form, kepala_tuk: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${!form.kepala_tuk.trim() ? 'border-amber-400 focus:ring-amber-400' : 'border-gray-300 focus:ring-blue-500'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alamat *</label>
              <input
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${!form.alamat.trim() ? 'border-amber-400 focus:ring-amber-400' : 'border-gray-300 focus:ring-blue-500'}`}
              />
            </div>
          </div>
          {tukMissing && <p className="mt-3 text-xs text-amber-700">⚠ Nama, Alamat, dan Kepala TUK wajib diisi.</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={closeForm} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={mutCreate.isPending || mutUpdate.isPending || tukMissing}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={15} /> Simpan
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : tuks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          Belum ada TUK. Tambahkan TUK terlebih dahulu.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Nama TUK</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Jenis</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Kepala TUK</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Alamat</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tuks.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{t.nama}</td>
                  <td className="px-6 py-4 text-gray-500 capitalize">{t.jenis.replace(/_/g, ' ')}</td>
                  <td className="px-6 py-4 text-gray-500">{t.kepala_tuk || '-'}</td>
                  <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{t.alamat || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(t)} className="text-blue-500 hover:text-blue-700 p-1">
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => { if (confirm('Hapus TUK ini?')) mutDelete.mutate(t.id) }}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
