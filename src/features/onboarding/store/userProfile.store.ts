import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/core/constants/storage-keys'
import type { UserProfile } from '@/features/transaction/transaction.types'

interface UserProfileState {
  profile: UserProfile | null
}

interface UserProfileActions {
  setProfile: (profile: UserProfile) => void
  updateNickname: (nickname: string) => void
  updateAvatar: (style: 'bottts' | 'dylan', seed: string) => void
}

export const useUserProfileStore = create<UserProfileState & UserProfileActions>()(
  persist(
    (set) => ({
      profile: null,

      setProfile: (profile) => set({ profile }),

      updateNickname: (nickname) =>
        set((s) =>
          s.profile
            ? { profile: { ...s.profile, nickname, updatedAt: new Date().toISOString() } }
            : s
        ),

      updateAvatar: (avatarStyle, avatarSeed) =>
        set((s) =>
          s.profile
            ? { profile: { ...s.profile, avatarStyle, avatarSeed, updatedAt: new Date().toISOString() } }
            : s
        ),
    }),
    { name: STORAGE_KEYS.USER_PROFILE }
  )
)
