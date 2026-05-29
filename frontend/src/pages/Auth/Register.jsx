import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { register as registerUser } from '../../services/auth'
import Logo from '../../components/Logo'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirm_password: z.string(),
  full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  nik: z.string().min(8, 'NIK/No. KTP minimal 8 digit'),
  telepon: z.string().optional(),
  pendidikan: z.string().optional(),
  pekerjaan: z.string().optional(),
  alamat: z.string().optional(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Konfirmasi password tidak cocok',
  path: ['confirm_password'],
})

export default function Register() {
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values) => {
    try {
      await registerUser({
        email: values.email,
        password: values.password,
        full_name: values.full_name,
        nik: values.nik,
        telepon: values.telepon || null,
        pendidikan: values.pendidikan || null,
        pekerjaan: values.pekerjaan || null,
        alamat: values.alamat || null,
      })
      toast.success('Pendaftaran berhasil! Silakan masuk.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Pendaftaran gagal. Coba lagi.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex justify-center mb-2">
            <Logo variant="full" className="h-16 w-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Buat Akun Baru</h1>
          <p className="text-gray-500 text-sm mt-1">Sudah punya akun? <Link to="/login" className="text-blue-600 hover:underline">Masuk di sini</Link></p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
              <input
                {...register('full_name')}
                type="text"
                placeholder="Nama sesuai KTP"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIK / No. KTP</label>
              <input
                {...register('nik')}
                type="text"
                inputMode="numeric"
                placeholder="16 digit sesuai KTP"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {errors.nik && <p className="text-red-500 text-xs mt-1">{errors.nik.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
                <input
                  {...register('telepon')}
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pendidikan</label>
                <input
                  {...register('pendidikan')}
                  type="text"
                  placeholder="mis. S1 / SMA"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pekerjaan</label>
              <input
                {...register('pekerjaan')}
                type="text"
                placeholder="mis. Network Engineer"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
              <textarea
                {...register('alamat')}
                rows={2}
                placeholder="Alamat sesuai domisili"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
            </div>

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
                placeholder="Minimal 8 karakter"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password</label>
              <input
                {...register('confirm_password')}
                type="password"
                placeholder="Ulangi password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>}
            </div>

            <p className="text-xs text-gray-400">
              Dengan mendaftar, Anda menyetujui syarat dan ketentuan sertifikasi LSP.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Mendaftarkan...' : 'Buat Akun'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
