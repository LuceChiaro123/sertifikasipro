import { create } from 'zustand'

// Restore user dari localStorage agar tidak hilang saat refresh halaman
function loadUser() {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const useAuthStore = create((set) => ({
  user: loadUser(),
  token: localStorage.getItem('access_token') || null,

  setAuth: (user, token) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token })
  },

  // Update data user saja (mis. hasil re-fetch /auth/me) tanpa mengubah token
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },

  clearAuth: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  },
}))

export default useAuthStore
