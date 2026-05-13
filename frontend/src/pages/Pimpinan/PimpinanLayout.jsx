import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { LayoutDashboard, FileCheck } from 'lucide-react'

const links = [
  { to: '/pimpinan', label: 'Dashboard Eksekutif', icon: LayoutDashboard },
  { to: '/pimpinan/keputusan', label: 'Keputusan Sertifikasi', icon: FileCheck },
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
