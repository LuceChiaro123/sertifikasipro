import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSkema, getLSP } from '../../services/portal'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Award, Shield, Clock, Users, ArrowRight, CheckCircle } from 'lucide-react'

export default function Home() {
  const { data: lspRes } = useQuery({ queryKey: ['lsp'], queryFn: getLSP, retry: false })
  const { data: skemaRes, isLoading } = useQuery({ queryKey: ['skema'], queryFn: getSkema, retry: false })

  const lsp = lspRes?.data?.data
  const skema = skemaRes?.data?.data || []

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-900 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <Award size={48} className="text-blue-300" />
          </div>
          <h1 className="text-4xl font-bold mb-4">
            {lsp?.nama || 'SertifikasiPro'}
          </h1>
          <p className="text-xl text-blue-200 mb-2">
            Sistem Informasi Sertifikasi Kompetensi Jarak Jauh
          </p>
          <p className="text-blue-300 mb-8 max-w-2xl mx-auto">
            Dapatkan sertifikasi kompetensi BNSP dari mana saja di seluruh Indonesia,
            tanpa perlu hadir fisik ke TUK.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-blue-700 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition"
            >
              Daftar Sekarang
            </Link>
            <Link
              to="/skema"
              className="border border-white text-white font-semibold px-8 py-3 rounded-lg hover:bg-white/10 transition"
            >
              Lihat Skema
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
            Mengapa SertifikasiPro?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: 'Terakreditasi BNSP', desc: 'Sertifikasi resmi sesuai SE.007/BNSP/V/2023 dan standar nasional.' },
              { icon: Clock, title: 'Proses Cepat & Online', desc: 'Seluruh proses dari pendaftaran hingga sertifikat dilakukan secara digital.' },
              { icon: Users, title: 'Asesor Berpengalaman', desc: 'Didampingi oleh asesor kompeten bersertifikat BNSP.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center p-6 rounded-xl border border-gray-100 hover:shadow-md transition">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4">
                  <Icon className="text-blue-600" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Skema */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Skema Sertifikasi</h2>
            <Link to="/skema" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium">
              Lihat semua <ArrowRight size={16} />
            </Link>
          </div>

          {isLoading ? (
            <LoadingSpinner />
          ) : skema.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Belum ada skema tersedia.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {skema.slice(0, 6).map((s) => (
                <Link
                  key={s.id}
                  to={`/skema/${s.id}`}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition hover:border-blue-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">{s.kode}</span>
                    {s.is_ajj_approved && (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                        <CheckCircle size={12} /> AJJ
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{s.nama}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{s.deskripsi}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-700 font-semibold text-sm">
                      Rp {s.biaya?.toLocaleString('id-ID') || '-'}
                    </span>
                    <ArrowRight size={16} className="text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-blue-700 text-white text-center">
        <h2 className="text-2xl font-bold mb-4">Siap Memulai Sertifikasi?</h2>
        <p className="text-blue-200 mb-8">Daftarkan diri Anda sekarang dan mulai perjalanan sertifikasi kompetensi.</p>
        <Link
          to="/register"
          className="bg-white text-blue-700 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 inline-flex items-center gap-2"
        >
          Mulai Sekarang <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  )
}
