// =============================================================================
// store/computed.store.ts
// Derived values yang depend on multiple domains.
// Ini bukan store yang di-mutate — ini computed dari store lain.
// Pakai sebagai hook: const { uangBebas } = useComputed()
// =============================================================================

import { useMemo } from 'react'
import { useTransaksiStore } from './transaksi.store'
import { useWalletStore } from './wallet.store'
import type { ComputedKeuangan } from '@/types'

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function useComputed(): ComputedKeuangan {
  const transaksi = useTransaksiStore(s => s.transaksi)
  const wallets = useWalletStore(s => s.wallets)

  return useMemo(() => {
    const month = getCurrentMonth()
    const thisMonth = transaksi.filter(tx => tx.tanggal.startsWith(month))

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
    const totalSaldo = wallets.reduce((sum, wallet) => {
      const masuk = transaksi
        .filter(tx => tx.wallet_id === wallet.id && tx.jenis === 'masuk')
        .reduce((s, tx) => s + tx.nominal, 0)
      const keluar = transaksi
        .filter(tx => tx.wallet_id === wallet.id && tx.jenis === 'keluar')
        .reduce((s, tx) => s + tx.nominal, 0)
      return sum + wallet.saldo_awal + masuk - keluar
    }, 0)

    // Tagihan bulan ini — dihitung dari store tagihan, tapi tidak di-import di sini
    // untuk menghindari circular dependency. Nilai ini di-inject dari computed hook.
    const totalTagihan = 0 // override di useComputedWithTagihan kalau dibutuhkan

    const uangBebas = totalSaldo - totalTagihan - totalNabung

    return { totalSaldo, totalMasuk, totalKeluar, totalTagihan, totalNabung, uangBebas }
  }, [transaksi, wallets])
}
