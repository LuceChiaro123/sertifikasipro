import { NavLink, Link, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { LogOut, UserCircle } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { logout } from '../services/auth'
import Logo from './Logo'

const ROLE_LABEL = {
  asesi: 'Asesi',
  calon_asesi: 'Calon Asesi',
  asesor: 'Asesor',
  admin: 'Admin LSP',
  pimpinan: 'Pimpinan LSP',
  superadmin: 'Super Admin',
}

export default function Sidebar({ links }) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await logout() } catch { /* abaikan error logout */ }
    clearAuth()
    navigate('/login')
  }

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex-shrink-0 flex flex-col">
      <div className="px-4 py-4 border-b border-gray-100">
        <Link to="/">
          <Logo variant="full" className="h-10 w-auto" />
        </Link>
      </div>

      <nav className="p-4 space-y-1 flex-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to.split('/').length <= 2}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )
            }
          >
            {Icon && <Icon size={18} />}
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Akun aktif + tombol keluar */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <UserCircle size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate" title={user?.email}>
              {user?.email || 'Pengguna'}
            </p>
            <p className="text-xs text-gray-400">{ROLE_LABEL[user?.role] || user?.role || '-'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} /> Keluar
        </button>
      </div>
    </aside>
  )
}
