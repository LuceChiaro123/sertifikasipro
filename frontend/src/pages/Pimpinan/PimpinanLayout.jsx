import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { LayoutDashboard, FileCheck, FileText, ClipboardCheck, PenLine } from 'lucide-react'

const links = [
  { to: '/pimpinan', label: 'Dashboard Eksekutif', icon: LayoutDashboard },
  { to: '/pimpinan/keputusan', label: 'Keputusan Sertifikasi', icon: FileCheck },
  { to: '/pimpinan/uji', label: 'Uji Kompetensi', icon: ClipboardCheck },
  { to: '/pimpinan/semua-permohonan', label: 'Semua Permohonan', icon: FileText },
  { to: '/pimpinan/tanda-tangan', label: 'Tanda Tangan', icon: PenLine },
]

export default function PimpinanLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar links={links} />
      <main className="flex-1 p-8 bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
