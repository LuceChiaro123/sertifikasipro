import api from './api'

// Generic form store untuk proses asesmen (FR.AK.xx, FR.IA.xx)
export const listAsesmenForms = (permohonanId) =>
  api.get(`/permohonan/${permohonanId}/forms`)

export const getAsesmenForm = (permohonanId, kode) =>
  api.get(`/permohonan/${permohonanId}/form/${kode}`)

export const saveAsesmenForm = (permohonanId, kode, data_json) =>
  api.post(`/permohonan/${permohonanId}/form/${kode}`, { data_json })
