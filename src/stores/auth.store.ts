import { create } from 'zustand'

type AuthState = 'guest' | 'logged_in'

interface AuthStoreState {
  authState: AuthState
  userEmail: string | null
}

interface AuthStoreActions {
  setLoggedIn: (email: string) => void
  setGuest: () => void
}

export const useAuthStore = create<AuthStoreState & AuthStoreActions>()((set) => ({
  authState: 'guest',
  userEmail: null,

  setLoggedIn: (email) => set({ authState: 'logged_in', userEmail: email }),
  setGuest: () => set({ authState: 'guest', userEmail: null }),
}))
