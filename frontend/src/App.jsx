import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/Portal/Home'
import SkemaList from './pages/Portal/SkemaList'
import SkemaDetail from './pages/Portal/SkemaDetail'
import VerifikasiSertifikat from './pages/Portal/VerifikasiSertifikat'

import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'

import AsesiLayout from './pages/Asesi/AsesiLayout'
import AsesiDashboard from './pages/Asesi/Dashboard'
import PermohonanList from './pages/Asesi/PermohonanList'
import PermohonanBaru from './pages/Asesi/PermohonanBaru'
import PermohonanDetail from './pages/Asesi/PermohonanDetail'

import AdminLayout from './pages/Admin/AdminLayout'
import AdminDashboard from './pages/Admin/Dashboard'
import AdminPermohonanList from './pages/Admin/PermohonanList'
import AdminPermohonanDetail from './pages/Admin/PermohonanDetail'
import TUKPage from './pages/Admin/TUK'
import AdminSkema from './pages/Admin/Skema'
import AdminAsesi from './pages/Admin/Asesi'
import AdminAsesorManagement from './pages/Admin/AsesorManagement'
import AdminUserManagement from './pages/Admin/UserManagement'

import AsesorLayout from './pages/Asesor/AsesorLayout'
import AsesorDashboard from './pages/Asesor/Dashboard'
import AsesorPermohonanList from './pages/Asesor/PermohonanList'
import AsesorPermohonanDetail from './pages/Asesor/PermohonanDetail'

import PimpinanLayout from './pages/Pimpinan/PimpinanLayout'
import PimpinanDashboard from './pages/Pimpinan/Dashboard'
import PimpinanKeputusan from './pages/Pimpinan/Keputusan'
import PimpinanKeputusanDetail from './pages/Pimpinan/KeputusanDetail'

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })

const ASESI_ROLES = ['asesi', 'calon_asesi']
const ASESOR_ROLES = ['asesor']
const ADMIN_ROLES = ['admin', 'superadmin']
const PIMPINAN_ROLES = ['pimpinan', 'superadmin']

function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="bg-gray-800 text-gray-400 text-center text-xs py-4">
        © 2024 SertifikasiPro — Sistem Informasi Sertifikasi Kompetensi Jarak Jauh
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          {/* Public */}
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/skema" element={<PublicLayout><SkemaList /></PublicLayout>} />
          <Route path="/skema/:id" element={<PublicLayout><SkemaDetail /></PublicLayout>} />
          <Route path="/verifikasi" element={<PublicLayout><VerifikasiSertifikat /></PublicLayout>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Asesi */}
          <Route path="/asesi" element={
            <ProtectedRoute roles={ASESI_ROLES}><AsesiLayout /></ProtectedRoute>
          }>
            <Route index element={<AsesiDashboard />} />
            <Route path="permohonan" element={<PermohonanList />} />
            <Route path="permohonan/baru" element={<PermohonanBaru />} />
            <Route path="permohonan/:id" element={<PermohonanDetail />} />
          </Route>

          {/* Asesor */}
          <Route path="/asesor" element={
            <ProtectedRoute roles={ASESOR_ROLES}><AsesorLayout /></ProtectedRoute>
          }>
            <Route index element={<AsesorDashboard />} />
            <Route path="permohonan" element={<AsesorPermohonanList />} />
            <Route path="permohonan/:id" element={<AsesorPermohonanDetail />} />
          </Route>

          {/* Admin */}
          <Route path="/admin" element={
            <ProtectedRoute roles={ADMIN_ROLES}><AdminLayout /></ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="permohonan" element={<AdminPermohonanList />} />
            <Route path="permohonan/:id" element={<AdminPermohonanDetail />} />
            <Route path="tuk" element={<TUKPage />} />
            <Route path="skema" element={<AdminSkema />} />
            <Route path="asesi" element={<AdminAsesi />} />
            <Route path="asesor" element={<AdminAsesorManagement />} />
            <Route path="users" element={<AdminUserManagement />} />
          </Route>

          {/* Pimpinan */}
          <Route path="/pimpinan" element={
            <ProtectedRoute roles={PIMPINAN_ROLES}><PimpinanLayout /></ProtectedRoute>
          }>
            <Route index element={<PimpinanDashboard />} />
            <Route path="keputusan" element={<PimpinanKeputusan />} />
            <Route path="keputusan/:id" element={<PimpinanKeputusanDetail />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={
            <PublicLayout>
              <div className="text-center py-24">
                <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
                <p className="text-gray-500">Halaman tidak ditemukan.</p>
              </div>
            </PublicLayout>
          } />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
