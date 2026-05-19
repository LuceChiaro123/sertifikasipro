import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminUsers, createAdminUser, toggleUserActive } from '../../services/admin'
import { UserPlus, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES = ['calon_asesi', 'asesi', 'asesor', 'admin', 'pimpinan', 'superadmin']

const ROLE_LABELS = {
  calon_asesi: 'Calon Asesi',
  asesi: 'Asesi',
  asesor: 'Asesor',
  admin: 'Admin',
  pimpinan: 'Pimpinan',
  superadmin: 'Super Admin',
}

const ROLE_COLORS = {
  calon_asesi: 'bg-gray-100 text-gray-600',
  asesi: 'bg-blue-100 text-blue-700',
  asesor: 'bg-purple-100 text-purple-700',
  admin: 'bg-orange-100 text-orange-700',
  pimpinan: 'bg-green-100 text-green-700',
  superadmin: 'bg-red-100 text-red-700',
}

export default function UserManagement() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', role: 'asesi' })

  const { data, isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: getAdminUsers })
  const list = data?.data?.data || []

  const mutCreate = useMutation({
    mutationFn: () => createAdminUser(form),
    onSuccess: () => {
      toast.success('User berhasil dibuat')
      qc.invalidateQueries(['admin-users'])
      setForm({ email: '', password: '', role: 'asesi' })
      setShowForm(false)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal membuat user'),
  })

  const mutToggle = useMutation({
    mutationFn: toggleUserActive,
    onSuccess: () => {
      toast.success('Status user diperbarui')
      qc.invalidateQueries(['admin-users'])
    },
    onError: () => toast.error('Gagal memperbarui status'),
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen User</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola akun (role dan status aktif)</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <UserPlus size={16} /> Tambah User
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Tambah User</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@contoh.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => { setShowForm(false); setForm({ email: '', password: '', role: 'asesi' }) }}
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              onClick={() => mutCreate.mutate()}
              disabled={mutCreate.isPending || !form.email || !form.password}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {mutCreate.isPending ? 'Membuat...' : 'Buat User'}
            </button>
          </div>
        </div>
      )}

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Memuat...</div>
        ) : list.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Belum ada user.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Email', 'Role', 'Status', 'Dibuat', 'Aksi'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => mutToggle.mutate(u.id)}
                      title={u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      className={`p-1 rounded ${u.is_active ? 'text-green-500 hover:text-red-500' : 'text-gray-400 hover:text-green-500'}`}
                    >
                      {u.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-400">Total: {list.length} user</p>
    </div>
  )
}
