import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { LayoutDashboard, FileText, ClipboardCheck, PenLine } from 'lucide-react'

const links = [
  { to: '/asesor', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/asesor/permohonan', label: 'Permohonan Saya', icon: FileText },
  { to: '/asesor/uji', label: 'Uji Kompetensi', icon: ClipboardCheck },
  { to: '/asesor/tanda-tangan', label: 'Tanda Tangan', icon: PenLine },
]

export default function AsesorLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar links={links} />
      <main className="flex-1 p-8 bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
