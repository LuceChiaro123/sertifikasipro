import api from './api'

export const getSkema = () => api.get('/skema')
export const createSkema = (data) => api.post('/skema', data)
export const updateSkema = (id, data) => api.patch(`/skema/${id}`, data)
export const deleteSkema = (id) => api.delete(`/skema/${id}`)
