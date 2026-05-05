import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UsuarioPublico } from '@marketplace/shared'

interface AuthState {
  token: string | null
  usuario: UsuarioPublico | null
  setAuth: (token: string, usuario: UsuarioPublico) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      usuario: null,
      setAuth: (token, usuario) => set({ token, usuario }),
      logout: () => set({ token: null, usuario: null }),
    }),
    { name: 'marketplace-auth' }
  )
)
