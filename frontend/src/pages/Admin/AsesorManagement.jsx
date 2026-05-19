import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminAsesor, createAsesor, deleteAsesor, uploadFile } from '../../services/admin'
import { UserPlus, Trash2, ChevronDown, ChevronUp, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  email: '', password: '',
  nama_lengkap: '', nik: '', tempat_lahir: '', tanggal_lahir: '',
  jenis_kelamin: '', pendidikan: '', pekerjaan: '', telepon: '',
  nomor_reg_asesor: '', masa_berlaku: '',
  sertifikat_asesor_url: '', sertifikat_kompetensi_url: '',
  bidang_kompetensi: '',   // comma-separated
}

function FileUploadField({ label, value, onChange, accept = '.jpg,.jpeg,.png,.pdf' }) {
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadFile(file)
      onChange(res.data.data.url)
      toast.success('File berhasil diupload')
    } catch {
      toast.error('Gagal mengupload file')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <label className="cursor-pointer flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <Upload size={14} />
          {uploading ? 'Mengupload...' : 'Pilih File'}
          <input type="file" className="hidden" accept={accept} onChange={handleFile} disabled={uploading} />
        </label>
        {value && (
          <div className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
            <span className="truncate max-w-xs">{value.split('/').pop()}</span>
            <button onClick={() => onChange('')}><X size={12} /></button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminAsesorManagement() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data, isLoading } = useQuery({ queryKey: ['admin-asesor'], queryFn: getAdminAsesor })
  const list = data?.data?.data || []

  const mutCreate = useMutation({
    mutationFn: () => createAsesor({
      ...form,
      bidang_kompetensi: form.bidang_kompetensi
        ? form.bidang_kompetensi.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    }),
    onSuccess: () => {
      toast.success('Asesor berhasil ditambahkan')
      qc.invalidateQueries(['admin-asesor'])
      setForm(EMPTY_FORM)
      setShowForm(false)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Gagal menambah asesor'),
  })

  const mutDelete = useMutation({
    mutationFn: deleteAsesor,
    onSuccess: () => {
      toast.success('Asesor dihapus')
      qc.invalidateQueries(['admin-asesor'])
    },
    onError: () => toast.error('Gagal menghapus asesor'),
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Asesor</h1>
          <p className="text-sm text-gray-500 mt-1">Tambah dan kelola data asesor LSP</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <UserPlus size={16} />
          Tambah Asesor
          {showForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Form tambah asesor */}
      {showForm && (
        <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-5">Data Asesor Baru</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Akun */}
            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Akun Login</p>
            </div>
            <Field label="Email *" value={form.email} onChange={(v) => set('email', v)} type="email" placeholder="asesor@lsp.id" />
            <Field label="Password *" value={form.password} onChange={(v) => set('password', v)} type="password" placeholder="Minimal 8 karakter" />

            {/* Identitas */}
            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 mt-2">Identitas</p>
            </div>
            <Field label="Nama Lengkap *" value={form.nama_lengkap} onChange={(v) => set('nama_lengkap', v)} placeholder="Sesuai KTP" />
            <Field label="NIK" value={form.nik} onChange={(v) => set('nik', v)} placeholder="16 digit NIK" />
            <Field label="Tempat Lahir" value={form.tempat_lahir} onChange={(v) => set('tempat_lahir', v)} placeholder="Kota" />
            <Field label="Tanggal Lahir" value={form.tanggal_lahir} onChange={(v) => set('tanggal_lahir', v)} type="date" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
              <select
                value={form.jenis_kelamin}
                onChange={(e) => set('jenis_kelamin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih --</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <Field label="Pendidikan" value={form.pendidikan} onChange={(v) => set('pendidikan', v)} placeholder="S1, S2, D3, ..." />
            <Field label="Pekerjaan" value={form.pekerjaan} onChange={(v) => set('pekerjaan', v)} placeholder="Profesi saat ini" />
            <Field label="No. HP" value={form.telepon} onChange={(v) => set('telepon', v)} placeholder="08xxxxxxxxxx" />

            {/* Sertifikat Asesor */}
            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 mt-2">Sertifikat Asesor</p>
            </div>
            <Field label="Nomor Registrasi Asesor *" value={form.nomor_reg_asesor} onChange={(v) => set('nomor_reg_asesor', v)} placeholder="MET.000.001234 2023" />
            <Field label="Masa Berlaku" value={form.masa_berlaku} onChange={(v) => set('masa_berlaku', v)} type="date" />
            <div className="md:col-span-2">
              <FileUploadField
                label="Upload Sertifikat Kompetensi Asesor (PDF/JPG)"
                value={form.sertifikat_asesor_url}
                onChange={(v) => set('sertifikat_asesor_url', v)}
                accept=".jpg,.jpeg,.png,.pdf"
              />
            </div>

            {/* Kompetensi Teknis */}
            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 mt-2">Kompetensi Teknis</p>
            </div>
            <div className="md:col-span-2">
              <Field
                label="Skema Kompetensi (pisahkan dengan koma)"
                value={form.bidang_kompetensi}
                onChange={(v) => set('bidang_kompetensi', v)}
                placeholder="Junior Network Administrator, Junior Programmer"
              />
            </div>
            <div className="md:col-span-2">
              <FileUploadField
                label="Upload Sertifikat Kompetensi Teknis (PDF/JPG)"
                value={form.sertifikat_kompetensi_url}
                onChange={(v) => set('sertifikat_kompetensi_url', v)}
                accept=".jpg,.jpeg,.png,.pdf"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              onClick={() => mutCreate.mutate()}
              disabled={mutCreate.isPending || !form.email || !form.password || !form.nama_lengkap || !form.nomor_reg_asesor}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {mutCreate.isPending ? 'Menyimpan...' : 'Simpan Asesor'}
            </button>
          </div>
        </div>
      )}

      {/* Tabel asesor */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Memuat...</div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center">
            <UserPlus size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Belum ada asesor. Tambahkan asesor pertama.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Nama Asesor', 'No. Reg / Masa Berlaku', 'Kompetensi', 'Kontak', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{a.nama_lengkap}</p>
                    <p className="text-xs text-gray-400">{a.email}</p>
                    {a.pendidikan && <p className="text-xs text-gray-400">{a.pendidikan}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-blue-700">{a.nomor_reg_asesor}</p>
                    {a.masa_berlaku && <p className="text-xs text-gray-500">s/d {a.masa_berlaku}</p>}
                    {a.sertifikat_asesor_url && (
                      <a href={`http://localhost:8000${a.sertifikat_asesor_url}`} target="_blank" rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline">Lihat Sertifikat</a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(a.bidang_kompetensi || []).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {a.bidang_kompetensi.map((b, i) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{b}</span>
                        ))}
                      </div>
                    ) : <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <p>{a.telepon || '-'}</p>
                    {a.pekerjaan && <p>{a.pekerjaan}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Hapus asesor ${a.nama_lengkap}?`)) mutDelete.mutate(a.id)
                      }}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 size={15} />
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

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
