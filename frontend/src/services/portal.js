import api from './api'

export const getLSP = () => api.get('/portal/lsp')
export const getSkema = () => api.get('/portal/skema')
export const getSkemaById = (id) => api.get(`/portal/skema/${id}`)
export const verifySertifikat = (nomor) => api.get(`/portal/verifikasi-sertifikat?nomor=${nomor}`)
