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

// ── Priority Banner — tagihan copy builder ────────────────────────────────────

export interface TagihanWarning {
  nama: string
  status: 'overdue' | 'today' | 'tomorrow'
}

function formatNamaList(items: string[]): string {
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} dan ${items[1]}`
  // 3+ — maks 2 nama + N lainnya
  return `${items[0]}, ${items[1]}, dan ${items.length - 2} tagihan lainnya`
}

export function buildTagihanBannerMessage(warnings: TagihanWarning[]): string | null {
  if (warnings.length === 0) return null

  const overdue  = warnings.filter(w => w.status === 'overdue').map(w => w.nama)
  const today    = warnings.filter(w => w.status === 'today').map(w => w.nama)
  const tomorrow = warnings.filter(w => w.status === 'tomorrow').map(w => w.nama)

  const parts: string[] = []

  if (overdue.length > 0) {
    parts.push(`${formatNamaList(overdue)} belum dibayar dan sudah lewat jatuh tempo`)
  }
  if (today.length > 0) {
    parts.push(`${formatNamaList(today)} jatuh tempo hari ini`)
  }
  if (tomorrow.length > 0) {
    parts.push(`${formatNamaList(tomorrow)} jatuh tempo besok`)
  }

  if (parts.length === 1) return parts[0] + '.'
  if (parts.length === 2) return `${parts[0]}, dan ${parts[1]}.`
  // 3 parts: overdue + today + tomorrow
  return `${parts[0]}, ${parts[1]}, dan ${parts[2]}.`
}

export function getTagihanWarnings(
  tagihan: Array<{ nama: string; tanggal: number; paidMonths: string[]; isRecurring: boolean }>,
  currentMonth: string
): TagihanWarning[] {
  const today = new Date().getDate()
  const warnings: TagihanWarning[] = []

  for (const t of tagihan) {
    if (t.paidMonths.includes(currentMonth)) continue // sudah dibayar
    const diff = t.tanggal - today
    if (diff < 0) warnings.push({ nama: t.nama, status: 'overdue' })
    else if (diff === 0) warnings.push({ nama: t.nama, status: 'today' })
    else if (diff === 1) warnings.push({ nama: t.nama, status: 'tomorrow' })
  }

  // Sort: overdue dulu, lalu today, lalu tomorrow
  const order = { overdue: 0, today: 1, tomorrow: 2 }
  return warnings.sort((a, b) => order[a.status] - order[b.status])
}
