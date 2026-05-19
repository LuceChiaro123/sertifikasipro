import api from './api'

// Stats
export const getStats = () => api.get('/admin/stats')

// Asesi
export const getAdminAsesi = () => api.get('/admin/asesi')

// Asesor management
export const getAdminAsesor = () => api.get('/admin/asesor')
export const createAsesor = (data) => api.post('/admin/asesor', data)
export const updateAsesor = (id, data) => api.patch(`/admin/asesor/${id}`, data)
export const deleteAsesor = (id) => api.delete(`/admin/asesor/${id}`)

// User management
export const getAdminUsers = () => api.get('/admin/users')
export const createAdminUser = (data) => api.post('/admin/users', data)
export const toggleUserActive = (id) => api.patch(`/admin/users/${id}/toggle-active`)

// Keputusan sertifikasi (Pimpinan)
export const buatKeputusan = (id, data) => api.post(`/permohonan/${id}/keputusan`, data)
export const getKeputusan = (id) => api.get(`/permohonan/${id}/keputusan`)

// File upload
export const uploadFile = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
