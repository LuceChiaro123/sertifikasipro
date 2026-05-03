import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { LayoutDashboard, BarChart2, FileCheck, Award } from 'lucide-react'

const links = [
  { to: '/pimpinan', label: 'Dashboard Eksekutif', icon: LayoutDashboard },
  { to: '/pimpinan/keputusan', label: 'Keputusan Sertifikasi', icon: FileCheck },
  { to: '/pimpinan/sertifikat', label: 'Database Sertifikat', icon: Award },
  { to: '/pimpinan/laporan', label: 'Laporan BNSP', icon: BarChart2 },
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
