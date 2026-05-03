import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSkema } from '../../services/portal'
import { submitPermohonan } from '../../services/permohonan'
import toast from 'react-hot-toast'

const schema = z.object({
  skema_id: z.string().min(1, 'Pilih skema sertifikasi'),
  jenis: z.enum(['uji_sertifikasi', 'sertifikasi_ulang']),
})

export default function PermohonanBaru() {
  const navigate = useNavigate()
  const { data } = useQuery({ queryKey: ['skema'], queryFn: getSkema, retry: false })
  const skema = data?.data?.data || []

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { jenis: 'uji_sertifikasi' },
  })

  const onSubmit = async (values) => {
    try {
      const res = await submitPermohonan(values)
      const id = res.data.data.id
      toast.success('Permohonan berhasil diajukan!')
      navigate(`/asesi/permohonan/${id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengajukan permohonan.')
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Permohonan Baru</h1>
      <p className="text-gray-500 text-sm mb-8">Pilih skema sertifikasi yang ingin Anda ikuti.</p>

      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Skema Sertifikasi</label>
            <select
              {...register('skema_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">-- Pilih Skema --</option>
              {skema.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.kode}] {s.nama} — Rp {s.biaya?.toLocaleString('id-ID')}
                </option>
              ))}
            </select>
            {errors.skema_id && <p className="text-red-500 text-xs mt-1">{errors.skema_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Sertifikasi</label>
            <div className="space-y-2">
              {[
                { value: 'uji_sertifikasi', label: 'Uji Sertifikasi', desc: 'Untuk pertama kali mengajukan sertifikasi' },
                { value: 'sertifikasi_ulang', label: 'Sertifikasi Ulang', desc: 'Perpanjangan sertifikat yang sudah/akan habis masa berlakunya' },
              ].map(({ value, label, desc }) => (
                <label key={value} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300">
                  <input
                    {...register('jenis')}
                    type="radio"
                    value={value}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
            {errors.jenis && <p className="text-red-500 text-xs mt-1">{errors.jenis.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/asesi')}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold"
            >
              {isSubmitting ? 'Mengajukan...' : 'Ajukan Permohonan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
