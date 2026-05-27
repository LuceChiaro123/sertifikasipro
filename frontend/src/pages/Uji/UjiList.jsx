import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listUji, createUji } from '../../services/uji'
import { getSkema } from '../../services/portal'
import useAuthStore from '../../store/authStore'
import LoadingSpinner from '../../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { Plus, ArrowRight, ClipboardCheck, X } from 'lucide-react'

const STATUS_COLOR = {
  DRAF: 'bg-gray-100 text-gray-600',
  BERLANGSUNG: 'bg-blue-100 text-blue-700',
  SELESAI: 'bg-green-100 text-green-700',
}

function basePath(role) {
  if (['admin', 'superadmin'].includes(role)) return '/admin'
  if (role === 'pimpinan') return '/pimpinan'
  return '/asesor'
}

export default function UjiList() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const base = basePath(user?.role)
  const canCreate = ['admin', 'superadmin', 'pimpinan'].includes(user?.role)

  const { data, isLoading } = useQuery({ queryKey: ['uji-list'], queryFn: () => listUji().then(r => r.data.data) })
  const { data: skemaData } = useQuery({ queryKey: ['skema-all'], queryFn: () => getSkema().then(r => r.data.data), enabled: canCreate })
  const events = data || []
  const skemas = skemaData || []

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ judul: '', skema_id: '', tanggal: '', nomor_spt: '' })

  const mut = useMutation({
    mutationFn: () => createUji({
      judul: form.judul,
      skema_id: form.skema_id || null,
      tanggal: form.tanggal || null,
      nomor_spt: form.nomor_spt || null,
    }),
    onSuccess: (res) => {
      toast.success('Event uji kompetensi dibuat')
      qc.invalidateQueries({ queryKey: ['uji-list'] })
      setShowForm(false)
      setForm({ judul: '', skema_id: '', tanggal: '', nomor_spt: '' })
      navigate(`${base}/uji/${res.data.data.id}`)
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Gagal membuat event'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengelolaan Uji Kompetensi</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola event/kelompok uji kompetensi beserta dokumennya (SPT, Berita Acara, Laporan).</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">
            {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? 'Tutup' : 'Buat Event'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Buat Event Uji Kompetensi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Judul Event</label>
              <input type="text" value={form.judul} onChange={(e) => setForm(f => ({ ...f, judul: e.target.value }))}
                placeholder="mis. Uji Kompetensi Junior Network Administrator — Batch 1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skema</label>
              <select value={form.skema_id} onChange={(e) => setForm(f => ({ ...f, skema_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Pilih Skema --</option>
                {skemas.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pelaksanaan</label>
              <input type="datetime-local" value={form.tanggal} onChange={(e) => setForm(f => ({ ...f, tanggal: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor SPT</label>
              <input type="text" value={form.nomor_spt} onChange={(e) => setForm(f => ({ ...f, nomor_spt: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <button onClick={() => mut.mutate()} disabled={!form.judul.trim() || mut.isPending}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold">
            <Plus size={15} /> {mut.isPending ? 'Membuat...' : 'Buat Event'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? <div className="p-8"><LoadingSpinner /></div> : events.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardCheck size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Belum ada event uji kompetensi.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['Judul', 'Skema', 'Tanggal', 'Peserta', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{e.judul}</td>
                  <td className="px-4 py-3 text-gray-600">{e.skema_nama || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.tanggal ? new Date(e.tanggal).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{(e.peserta || []).length}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[e.status] || 'bg-gray-100 text-gray-600'}`}>{e.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => navigate(`${base}/uji/${e.id}`)} className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs font-medium">
                      Kelola <ArrowRight size={12} />
                    </button>
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
