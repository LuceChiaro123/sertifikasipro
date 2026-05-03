import api from './api'

export const submitPermohonan = (data) => api.post('/permohonan', data)
export const getPermohonan = () => api.get('/permohonan')
export const getPermohonanById = (id) => api.get(`/permohonan/${id}`)
export const updateStatusPermohonan = (id, data) => api.patch(`/permohonan/${id}/status`, data)
export const assignPermohonan = (id, data) => api.patch(`/permohonan/${id}/assign`, data)
export const uploadDokumen = (id, formData) =>
  api.post(`/permohonan/${id}/dokumen`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })

// APL01
export const submitAPL01 = (id, data) => api.post(`/permohonan/${id}/apl01`, data)
export const getAPL01 = (id) => api.get(`/permohonan/${id}/apl01`)

// APL02
export const submitAPL02 = (id, data) => api.post(`/permohonan/${id}/apl02`, data)
export const getAPL02 = (id) => api.get(`/permohonan/${id}/apl02`)
export const verifyAPL02 = (id, data) => api.patch(`/permohonan/${id}/apl02/verifikasi`, data)
