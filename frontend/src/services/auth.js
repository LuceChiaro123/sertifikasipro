import api from './api'

export const login = (data) => api.post('/auth/login', data)
export const register = (data) => api.post('/auth/register', data)
export const logout = () => api.post('/auth/logout')
export const refreshToken = () => api.post('/auth/refresh')
export const getMe = () => api.get('/auth/me')

// Profil / Data Diri asesi (sumber tunggal untuk semua form)
export const getProfileMe = () => api.get('/auth/profile/me')
export const updateDataDiri = (data) => api.patch('/auth/profile/data-diri', data)
export const updateProfileDocuments = (data) => api.patch('/auth/profile/documents', data)
export const updateProfileTtd = (ttd_url) => api.post('/auth/profile/ttd', { ttd_url })
