import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { LayoutDashboard, FileText, Clock, Award, UserCog } from 'lucide-react'

const links = [
  { to: '/asesi', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/asesi/data-diri', label: 'Data Diri Saya', icon: UserCog },
  { to: '/asesi/permohonan', label: 'Permohonan Saya', icon: FileText },
  { to: '/asesi/jadwal', label: 'Jadwal Asesmen', icon: Clock },
  { to: '/asesi/sertifikat', label: 'Sertifikat Saya', icon: Award },
]

export default function AsesiLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar links={links} />
      <main className="flex-1 p-8 bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
