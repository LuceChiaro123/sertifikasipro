const statusMap = {
  DRAF: { label: 'Draf', color: 'bg-gray-100 text-gray-700' },
  SUBMITTED: { label: 'Diajukan', color: 'bg-blue-100 text-blue-700' },
  DOKUMEN_DIKAJI: { label: 'Dokumen Dikaji', color: 'bg-yellow-100 text-yellow-700' },
  DIJADWALKAN: { label: 'Dijadwalkan', color: 'bg-purple-100 text-purple-700' },
  ASESMEN_BERLANGSUNG: { label: 'Asesmen Berlangsung', color: 'bg-orange-100 text-orange-700' },
  KEPUTUSAN_DIBUAT: { label: 'Keputusan Dibuat', color: 'bg-indigo-100 text-indigo-700' },
  SERTIFIKAT_DITERBITKAN: { label: 'Sertifikat Diterbitkan', color: 'bg-green-100 text-green-700' },
  SELESAI: { label: 'Selesai', color: 'bg-green-200 text-green-800' },
  DITOLAK: { label: 'Ditolak', color: 'bg-red-100 text-red-700' },
  BANDING: { label: 'Banding', color: 'bg-pink-100 text-pink-700' },
}

export default function StatusBadge({ status }) {
  const s = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
  )
}
