import { useQuery } from '@tanstack/react-query'
import { getAdminAsesi } from '../../services/admin'
import { Users, Search } from 'lucide-react'
import { useState } from 'react'

export default function AdminAsesi() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery({ queryKey: ['admin-asesi'], queryFn: getAdminAsesi })
  const all = data?.data?.data || []

  const filtered = all.filter((a) =>
    a.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
    a.nik.includes(search) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Asesi</h1>
        <p className="text-sm text-gray-500 mt-1">Daftar seluruh asesi yang terdaftar di LSP</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, NIK, atau email..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{search ? 'Tidak ada asesi yang cocok.' : 'Belum ada asesi terdaftar.'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Nama Lengkap', 'NIK', 'Email', 'Pekerjaan', 'Total Permohonan'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.nama_lengkap}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{a.nik}</td>
                  <td className="px-4 py-3 text-gray-600">{a.email}</td>
                  <td className="px-4 py-3 text-gray-500">{a.pekerjaan || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {a.total_permohonan} permohonan
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400">Total: {all.length} asesi</p>
    </div>
  )
}
