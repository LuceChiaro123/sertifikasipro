import { Link, useNavigate } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { logout } from '../services/auth'
import Logo from './Logo'

export default function Navbar() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await logout() } catch {}
    clearAuth()
    navigate('/')
  }

  const dashboardLink = () => {
    if (!user) return null
    const map = {
      asesi: '/asesi',
      calon_asesi: '/asesi',
      asesor: '/asesor',
      admin: '/admin',
      pimpinan: '/pimpinan',
      superadmin: '/admin',
    }
    return map[user.role] || '/'
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center">
            <Logo variant="full" className="h-10 w-auto" />
          </Link>

          <div className="flex items-center gap-6">
            <Link to="/skema" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
              Skema Sertifikasi
            </Link>
            <Link to="/verifikasi" className="text-gray-600 hover:text-blue-600 text-sm font-medium">
              Verifikasi Sertifikat
            </Link>

            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to={dashboardLink()}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  <User size={16} />
                  {user.email}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700"
                >
                  <LogOut size={16} />
                  Keluar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-600 hover:text-blue-600"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
