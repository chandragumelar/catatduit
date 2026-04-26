// =============================================================================
// store/computed.store.ts
// Derived values yang depend on multiple domains.
// Currency-aware: semua kalkulasi difilter berdasarkan currency toggle aktif.
// Pakai sebagai hook: const { uangBebas } = useComputed()
// =============================================================================

import { useMemo } from 'react'
import { useTransaksiStore } from './transaksi.store'
import { useWalletStore } from './wallet.store'
import { getMulticurrencyEnabled, getActiveCurrencyToggle, getSecondaryCurrency, getCurrency } from '@/storage'
import type { ComputedKeuangan } from '@/types'

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Tentukan currency aktif berdasarkan toggle state
function getActiveCurrency(): string {
  const multicurrencyEnabled = getMulticurrencyEnabled()
  if (!multicurrencyEnabled) return getCurrency()

  const toggle = getActiveCurrencyToggle()
  if (toggle === 'secondary') {
    return getSecondaryCurrency() ?? getCurrency()
  }
  return getCurrency()
}

// Helper — dipakai komponen lain yang butuh relevantWalletIds tanpa re-derive sendiri
export function getRelevantWalletIds(wallets: { id: string; currency: string }[]): Set<string> {
  const activeCurrency = getActiveCurrency()
  return new Set(wallets.filter(w => w.currency === activeCurrency).map(w => w.id))
}

export function useComputed(): ComputedKeuangan {
  const transaksi = useTransaksiStore(s => s.transaksi)
  const wallets = useWalletStore(s => s.wallets)

  return useMemo(() => {
    const month = getCurrentMonth()

    // relevantWalletIds: hanya wallet dengan currency yang match toggle aktif
    const relevantWalletIds = getRelevantWalletIds(wallets)

    // Filter transaksi bulan ini yang relevan
    const thisMonth = transaksi.filter(
      tx => tx.tanggal.startsWith(month) && relevantWalletIds.has(tx.wallet_id)
    )

    const totalMasuk = thisMonth
      .filter(tx => tx.jenis === 'masuk')
      .reduce((sum, tx) => sum + tx.nominal, 0)

    const totalKeluar = thisMonth
      .filter(tx => tx.jenis === 'keluar')
      .reduce((sum, tx) => sum + tx.nominal, 0)

    const totalNabung = thisMonth
      .filter(tx => tx.jenis === 'nabung')
      .reduce((sum, tx) => sum + tx.nominal, 0)

    // Saldo = saldo_awal + Σmasuk - Σkeluar (semua waktu, bukan hanya bulan ini)
    // Hanya wallet dengan currency aktif yang dihitung — tidak campur aduk antar currency
    const totalSaldo = wallets
      .filter(w => relevantWalletIds.has(w.id))
      .reduce((sum, wallet) => {
        const masuk = transaksi
          .filter(tx => tx.wallet_id === wallet.id && tx.jenis === 'masuk')
          .reduce((s, tx) => s + tx.nominal, 0)
        const keluar = transaksi
          .filter(tx => tx.wallet_id === wallet.id && tx.jenis === 'keluar')
          .reduce((s, tx) => s + tx.nominal, 0)
        const nabung = transaksi
          .filter(tx => tx.wallet_id === wallet.id && tx.jenis === 'nabung')
          .reduce((s, tx) => s + tx.nominal, 0)
        return sum + wallet.saldo_awal + masuk - keluar - nabung
      }, 0)

    const totalTagihan = 0 // override di useComputedWithTagihan kalau dibutuhkan

    const uangBebas = totalSaldo - totalTagihan - totalNabung

    return { totalSaldo, totalMasuk, totalKeluar, totalTagihan, totalNabung, uangBebas }
  }, [transaksi, wallets])
}
