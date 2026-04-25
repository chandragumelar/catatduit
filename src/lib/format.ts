// =============================================================================
// lib/format.ts
// Utility murni — no side effects, no imports dari store/storage.
// =============================================================================

export function formatRupiah(nominal: number, currencySymbol = 'Rp'): string {
  return `${currencySymbol} ${nominal.toLocaleString('id-ID')}`
}

export function formatTanggal(tanggal: string): string {
  const date = new Date(tanggal)
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function getCurrentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}
