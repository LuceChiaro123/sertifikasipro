import { useState } from 'react'
import { FileText, Image as ImageIcon, ExternalLink, X, ZoomIn } from 'lucide-react'

// /media/ disajikan oleh FastAPI di root, bukan di /api/v1 — jadi strip /api/v1.
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/api\/v1\/?$/, '')

function fileUrl(url) {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${API_ROOT}${url}`
}

function isImage(url) {
  if (!url) return false
  const ext = url.toLowerCase().split('.').pop()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
}

function DokumenItem({ label, url, icon: Icon, onPreview }) {
  const full = fileUrl(url)
  if (!full) {
    return (
      <div className="flex items-center gap-3 p-3 border border-dashed border-gray-200 rounded-lg bg-gray-50">
        <Icon size={18} className="text-gray-300" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-xs text-gray-400 mt-0.5">Belum diupload</p>
        </div>
      </div>
    )
  }

  const img = isImage(full)
  return (
    <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
      {img ? (
        <button onClick={() => onPreview(full, label)}
          className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 hover:opacity-80 transition">
          <img src={full} alt={label} className="w-full h-full object-cover" />
        </button>
      ) : (
        <div className="w-12 h-12 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
          <FileText size={20} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 truncate">{full.split('/').pop()}</p>
      </div>
      <div className="flex gap-1">
        {img && (
          <button onClick={() => onPreview(full, label)}
            className="p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-md" title="Lihat">
            <ZoomIn size={15} />
          </button>
        )}
        <a href={full} target="_blank" rel="noreferrer"
          className="p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-md" title="Buka">
          <ExternalLink size={15} />
        </a>
      </div>
    </div>
  )
}

/**
 * DokumenViewer - tampilkan dokumen asesi (foto/KTP/ijazah).
 *
 * Props:
 *   foto_url, ktp_url, ijazah_url — URL dokumen (mis. /media/xxx.png)
 *   title — opsional, judul section
 */
export default function DokumenViewer({ foto_url, ktp_url, ijazah_url, title = 'Dokumen Persyaratan Asesi' }) {
  const [preview, setPreview] = useState(null)

  const docs = [
    { label: 'Pas Foto', url: foto_url, icon: ImageIcon },
    { label: 'KTP / Kartu Identitas', url: ktp_url, icon: FileText },
    { label: 'Ijazah / Bukti Pendidikan', url: ijazah_url, icon: FileText },
  ]

  const hasAny = docs.some(d => d.url)

  return (
    <>
      <div className="space-y-3">
        {title && <p className="text-sm text-gray-500 mb-2">{title}</p>}
        {hasAny ? (
          <div className="grid grid-cols-1 gap-2">
            {docs.map((d) => (
              <DokumenItem key={d.label} {...d} onPreview={(url, label) => setPreview({ url, label })} />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm">
            <FileText size={32} className="mx-auto mb-2 text-gray-300" />
            <p>Asesi belum mengupload dokumen apapun.</p>
          </div>
        )}
      </div>

      {/* Modal preview */}
      {preview && (
        <div onClick={() => setPreview(null)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="max-w-3xl max-h-[90vh] relative">
            <button onClick={() => setPreview(null)}
              className="absolute -top-12 right-0 text-white hover:bg-white/20 p-2 rounded-lg">
              <X size={24} />
            </button>
            <p className="text-white mb-3 font-medium">{preview.label}</p>
            <img src={preview.url} alt={preview.label} className="max-w-full max-h-[80vh] rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </>
  )
}
