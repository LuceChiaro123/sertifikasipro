import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { register as registerUser } from '../../services/auth'
import Logo from '../../components/Logo'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Za-z]/, 'Password harus mengandung huruf')
    .regex(/\d/, 'Password harus mengandung angka'),
  confirm_password: z.string(),
  full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  nik: z.string().regex(/^\d{16}$/, 'NIK harus tepat 16 digit angka'),
  telepon: z.string().regex(/^0\d{8,14}$/, 'No. telepon tidak valid (mis. 081234567890)').or(z.literal('')).optional(),
  pendidikan: z.string().optional(),
  pekerjaan: z.string().optional(),
  alamat: z.string().optional(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Konfirmasi password tidak cocok',
  path: ['confirm_password'],
})

// Indikator kekuatan password
function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const map = [
    { label: '', color: '' },
    { label: 'Lemah', color: 'bg-red-500 text-red-600' },
    { label: 'Sedang', color: 'bg-yellow-500 text-yellow-600' },
    { label: 'Kuat', color: 'bg-blue-500 text-blue-600' },
    { label: 'Sangat Kuat', color: 'bg-green-500 text-green-600' },
  ]
  return { score: s, ...map[s] }
}

export default function Register() {
  const navigate = useNavigate()
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })
  const pwStrength = passwordStrength(watch('password'))

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
      const d = err.response?.data
      const fieldErr = d?.data?.errors?.[0]?.msg   // pesan validasi backend (422)
      toast.error(d?.detail || fieldErr || d?.message || 'Pendaftaran gagal. Coba lagi.')
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
                maxLength={16}
                onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16) }}
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
                {errors.telepon && <p className="text-red-500 text-xs mt-1">{errors.telepon.message}</p>}
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
                placeholder="Min. 8 karakter, ada huruf & angka"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {/* Indikator kekuatan password */}
              {watch('password') && (
                <div className="mt-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= pwStrength.score ? pwStrength.color.split(' ')[0] : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  {pwStrength.label && <p className={`text-xs mt-1 ${pwStrength.color.split(' ')[1]}`}>Kekuatan: {pwStrength.label}</p>}
                </div>
              )}
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
