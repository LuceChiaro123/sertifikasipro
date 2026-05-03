import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { LayoutDashboard, FileText, ClipboardList, CheckSquare } from 'lucide-react'

const links = [
  { to: '/asesor', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/asesor/permohonan', label: 'Permohonan Saya', icon: FileText },
  { to: '/asesor/rencana', label: 'Rencana Asesmen', icon: ClipboardList },
  { to: '/asesor/rekaman', label: 'Rekaman Asesmen', icon: CheckSquare },
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
