import api from './api'

// Event Uji Kompetensi (kelompok)
export const listUji = () => api.get('/uji')
export const getUji = (id) => api.get(`/uji/${id}`)
export const createUji = (data) => api.post('/uji', data)
export const updateUji = (id, data) => api.patch(`/uji/${id}`, data)
export const deleteUji = (id) => api.delete(`/uji/${id}`)

// Dokumen event (Input → Validasi)
export const listUjiForms = (id, menu) => api.get(`/uji/${id}/forms`, { params: menu ? { menu } : {} })
export const getUjiForm = (id, kode) => api.get(`/uji/${id}/form/${kode}`)
export const saveUjiForm = (id, kode, data_json) => api.post(`/uji/${id}/form/${kode}`, { data_json })
export const validasiUjiForm = (id, kode) => api.post(`/uji/${id}/form/${kode}/validasi`)
