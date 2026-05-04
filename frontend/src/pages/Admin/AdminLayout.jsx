import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { LayoutDashboard, FileText, Users, MapPin, BookOpen } from 'lucide-react'

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/permohonan', label: 'Permohonan', icon: FileText },
  { to: '/admin/tuk', label: 'Tempat Uji (TUK)', icon: MapPin },
  { to: '/admin/asesi', label: 'Data Asesi', icon: Users },
  { to: '/admin/skema', label: 'Skema', icon: BookOpen },
]

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar links={links} />
      <main className="flex-1 p-8 bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
