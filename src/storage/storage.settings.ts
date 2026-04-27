// =============================================================================
// storage/storage.settings.ts
// =============================================================================

import type { CurrencyToggle } from '@/types'
import { STORAGE_KEYS } from '@/constants'
import { getData, setData } from './storage.base'

export function getNama(): string {
  return getData<string>(STORAGE_KEYS.NAMA, '')
}

export function saveNama(nama: string): boolean {
  return setData(STORAGE_KEYS.NAMA, nama)
}

export function getOnboardingDone(): boolean {
  return getData<boolean>(STORAGE_KEYS.ONBOARDING, false)
}

export function setOnboardingDone(): boolean {
  return setData(STORAGE_KEYS.ONBOARDING, true)
}

export function getCurrency(): string {
  return getData<string>(STORAGE_KEYS.CURRENCY, 'IDR')
}

export function saveCurrency(code: string): boolean {
  return setData(STORAGE_KEYS.CURRENCY, code)
}

export function getMulticurrencyEnabled(): boolean {
  return getData<boolean>(STORAGE_KEYS.MULTICURRENCY_ENABLED, false)
}

export function getSecondaryCurrency(): string | null {
  return getData<string | null>(STORAGE_KEYS.SECONDARY_CURRENCY, null)
}

export function getActiveCurrencyToggle(): CurrencyToggle {
  return getData<CurrencyToggle>(STORAGE_KEYS.ACTIVE_CURRENCY_TOGGLE, 'base')
}

export function saveActiveCurrencyToggle(toggle: CurrencyToggle): boolean {
  return setData(STORAGE_KEYS.ACTIVE_CURRENCY_TOGGLE, toggle)
}

export function getCardCollapsed(): string[] {
  return getData<string[]>(STORAGE_KEYS.CARD_COLLAPSED, [])
}

export function saveCardCollapsed(ids: string[]): boolean {
  return setData(STORAGE_KEYS.CARD_COLLAPSED, ids)
}

export function getSupportBannerDismissedAt(): number {
  return getData<number>(STORAGE_KEYS.SUPPORT_BANNER, 0)
}

export function saveSupportBannerDismissedAt(ts: number): boolean {
  return setData(STORAGE_KEYS.SUPPORT_BANNER, ts)
}

// ── Checklist post-onboarding ─────────────────────────────────────────────────
// Keys: array of string item IDs yang sudah done atau di-dismiss

export function getChecklistDone(): string[] {
  return getData<string[]>(STORAGE_KEYS.CHECKLIST_DISMISSED, [])
}

export function saveChecklistDone(ids: string[]): boolean {
  return setData(STORAGE_KEYS.CHECKLIST_DISMISSED, ids)
}
