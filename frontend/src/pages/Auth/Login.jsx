import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../../services/auth'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import Logo from '../../components/Logo'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

const roleRedirect = {
  asesi: '/asesi',
  calon_asesi: '/asesi',
  asesor: '/asesor',
  admin: '/admin',
  pimpinan: '/pimpinan',
  superadmin: '/admin',
}

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values) => {
    try {
      const res = await login(values)
      const { access_token } = res.data
      // Simpan token dulu agar request /me terautentikasi
      localStorage.setItem('access_token', access_token)
      // Ambil data user dari /me
      const meRes = await api.get('/auth/me')
      const user = meRes.data.data
      setAuth(user, access_token)
      toast.success(`Selamat datang, ${user.email}!`)
      navigate(roleRedirect[user.role] || '/')
    } catch (err) {
      localStorage.removeItem('access_token')
      toast.error(err.response?.data?.message || 'Login gagal. Periksa email dan password Anda.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex justify-center mb-2">
            <Logo variant="full" className="h-16 w-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Masuk ke Akun Anda</h1>
          <p className="text-gray-500 text-sm mt-1">Belum punya akun? <Link to="/register" className="text-blue-600 hover:underline">Daftar di sini</Link></p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="email@contoh.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
