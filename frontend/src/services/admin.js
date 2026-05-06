import api from './api'

export const getStats = () => api.get('/admin/stats')
export const getAdminAsesi = () => api.get('/admin/asesi')
export const buatKeputusan = (id, data) => api.post(`/permohonan/${id}/keputusan`, data)
export const getKeputusan = (id) => api.get(`/permohonan/${id}/keputusan`)
