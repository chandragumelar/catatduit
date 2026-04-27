import { getCurrency } from '@/core/constants/currencies'

export function formatAmount(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
  }).format(amount)
}

export function getCurrencySymbol(currencyCode: string): string {
  return getCurrency(currencyCode)?.symbol ?? currencyCode
}
