import { useState } from 'react'
import type { Clock } from '@/core/clock/Clock'
import { RealClock } from '@/core/clock/RealClock'
import { useOnboardingStore } from './onboarding.store'
import { useUserProfileStore } from './userProfile.store'
import { useWallet } from '@/features/transaction/useWallet'
import { useCategoryStore } from '@/features/transaction/category.store'
import { useNudgeStore } from '@/stores/nudge.store'
import { isNonEmptyString } from '@/core/utils/validation'

export type OnboardingStep = 'intro' | 'nickname' | 'setup-wallet' | 'set-balance' | 'done'

interface WalletDraft {
  tempId: string
  name: string
  currencyCode: string
  initialBalance: number
}

export function useOnboarding(clock: Clock = new RealClock()) {
  const [step, setStep] = useState<OnboardingStep>('intro')
  const [nickname, setNickname] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [walletDrafts, setWalletDrafts] = useState<WalletDraft[]>([
    { tempId: 'draft-1', name: 'Dompet Utama', currencyCode: 'IDR', initialBalance: 0 },
  ])
  const [walletErrors, setWalletErrors] = useState<Record<string, string>>({})

  const { complete } = useOnboardingStore()
  const { setProfile } = useUserProfileStore()
  const { create: createWallet } = useWallet(clock)
  const { initDefaultCategories } = useCategoryStore()
  const { dismiss: dismissNudge } = useNudgeStore()

  // ── Step navigation ──────────────────────────────────────

  const goNext = () => {
    if (step === 'intro') setStep('nickname')
    else if (step === 'nickname') {
      if (!validateNickname()) return
      setStep('setup-wallet')
    } else if (step === 'setup-wallet') {
      if (!validateWallets()) return
      setStep('set-balance')
    } else if (step === 'set-balance') {
      submitOnboarding()
    }
  }

  const goBack = () => {
    if (step === 'nickname') setStep('intro')
    else if (step === 'setup-wallet') setStep('nickname')
    else if (step === 'set-balance') setStep('setup-wallet')
  }

  // ── Nickname ─────────────────────────────────────────────

  const validateNickname = (): boolean => {
    if (!isNonEmptyString(nickname)) {
      setNicknameError('Nama panggilan tidak boleh kosong')
      return false
    }
    if (nickname.trim().length > 30) {
      setNicknameError('Nama panggilan maksimal 30 karakter')
      return false
    }
    setNicknameError('')
    return true
  }

  // ── Wallet drafts ─────────────────────────────────────────

  const addWalletDraft = () => {
    const currencies = new Set(walletDrafts.map((w) => w.currencyCode))
    if (walletDrafts.length >= 10) return
    setWalletDrafts((prev) => [
      ...prev,
      {
        tempId: `draft-${Date.now()}`,
        name: '',
        currencyCode: currencies.size < 2 ? 'IDR' : [...currencies][0],
        initialBalance: 0,
      },
    ])
  }

  const removeWalletDraft = (tempId: string) => {
    if (walletDrafts.length <= 1) return
    setWalletDrafts((prev) => prev.filter((w) => w.tempId !== tempId))
    setWalletErrors((prev) => {
      const next = { ...prev }
      delete next[tempId]
      return next
    })
  }

  const updateWalletDraft = (tempId: string, updates: Partial<Omit<WalletDraft, 'tempId'>>) => {
    setWalletDrafts((prev) =>
      prev.map((w) => (w.tempId === tempId ? { ...w, ...updates } : w))
    )
  }

  const validateWallets = (): boolean => {
    const errors: Record<string, string> = {}
    const names = new Set<string>()
    const currencies = new Set<string>()

    walletDrafts.forEach((w) => {
      if (!isNonEmptyString(w.name)) {
        errors[w.tempId] = 'Nama dompet tidak boleh kosong'
      } else if (names.has(w.name.trim().toLowerCase())) {
        errors[w.tempId] = 'Nama dompet sudah dipakai'
      } else {
        names.add(w.name.trim().toLowerCase())
      }
      currencies.add(w.currencyCode)
    })

    if (currencies.size > 2) {
      walletDrafts.forEach((w) => {
        if (!errors[w.tempId]) errors[w.tempId] = 'Maksimal 2 jenis mata uang'
      })
    }

    setWalletErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ── Submit ────────────────────────────────────────────────

  const submitOnboarding = () => {
    const now = clock.now().toISOString()

    // Create user profile
    setProfile({
      id: crypto.randomUUID(),
      nickname: nickname.trim(),
      avatarStyle: 'bottts',
      avatarSeed: nickname.trim(),
      createdAt: now,
      updatedAt: now,
    })

    // Create wallets
    walletDrafts.forEach((draft) => {
      createWallet({
        name: draft.name.trim(),
        currencyCode: draft.currencyCode,
        initialBalance: draft.initialBalance,
      })
    })

    // Init default categories
    initDefaultCategories(now)

    // Mark onboarding done
    complete(now)

    setStep('done')
  }

  const getActiveCurrencies = (): string[] => {
    return [...new Set(walletDrafts.map((w) => w.currencyCode))]
  }

  const canAddMoreCurrencies = (): boolean => {
    return new Set(walletDrafts.map((w) => w.currencyCode)).size < 2
  }

  return {
    step,
    nickname,
    setNickname,
    nicknameError,
    walletDrafts,
    walletErrors,
    addWalletDraft,
    removeWalletDraft,
    updateWalletDraft,
    getActiveCurrencies,
    canAddMoreCurrencies,
    goNext,
    goBack,
  }
}
