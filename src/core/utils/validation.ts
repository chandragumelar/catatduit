import { SUPPORTED_CURRENCIES } from '@/core/constants/currencies'

export function isValidCurrencyCode(code: string): boolean {
  return SUPPORTED_CURRENCIES.some((c) => c.code === code)
}

export function isValidAmount(amount: number): boolean {
  return amount > 0 && isFinite(amount)
}

export function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0
}
