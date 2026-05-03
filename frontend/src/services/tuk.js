import api from './api'

export const getTUK = () => api.get('/tuk')
export const createTUK = (data) => api.post('/tuk', data)
export const updateTUK = (id, data) => api.patch(`/tuk/${id}`, data)
export const deleteTUK = (id) => api.delete(`/tuk/${id}`)
