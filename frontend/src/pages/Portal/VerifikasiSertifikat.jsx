import { useState } from 'react'
import { verifySertifikat } from '../../services/portal'
import { Search, CheckCircle, XCircle, Download } from 'lucide-react'

const MEDIA_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '')

export default function VerifikasiSertifikat() {
  const [nomor, setNomor] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!nomor.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await verifySertifikat(nomor.trim())
      setResult(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Sertifikat tidak ditemukan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Verifikasi Sertifikat</h1>
        <p className="text-gray-500">Masukkan nomor sertifikat untuk memverifikasi keasliannya.</p>
      </div>

      <form onSubmit={handleVerify} className="flex gap-3 mb-8">
        <input
          type="text"
          value={nomor}
          onChange={(e) => setNomor(e.target.value)}
          placeholder="Contoh: LSP-TDI-2024-001234"
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Search size={18} />
          {loading ? 'Memeriksa...' : 'Verifikasi'}
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <XCircle className="text-red-500 flex-shrink-0" size={20} />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl border border-green-300 p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="text-green-500" size={28} />
            <div>
              <p className="font-semibold text-green-700">Sertifikat Valid</p>
              <p className="text-xs text-gray-500">Sertifikat ini terdaftar di sistem SertifikasiPro</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            {[
              ['Nomor Sertifikat', result.nomor_sertifikat],
              ['Nama Pemegang', result.nama_pemegang],
              ['Skema', result.skema_nama],
              ['Tanggal Terbit', new Date(result.tanggal_terbit).toLocaleDateString('id-ID', { dateStyle: 'long' })],
              ['Tanggal Berakhir', new Date(result.tanggal_berakhir).toLocaleDateString('id-ID', { dateStyle: 'long' })],
              ['Status', result.is_active ? 'Aktif' : 'Tidak Aktif'],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900">{val}</span>
              </div>
            ))}
          </div>
          {result.file_url && (
            <a href={`${MEDIA_ROOT}${result.file_url}`} target="_blank" rel="noreferrer"
              className="mt-4 flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700">
              <Download size={16} /> Lihat Sertifikat (PDF)
            </a>
          )}
        </div>
      )}
    </div>
  )
}
