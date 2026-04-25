// =============================================================================
// features/riwayat/RiwayatPage.tsx
// =============================================================================

import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, ArrowLeft } from 'lucide-react'

import { useTransaksiStore } from '@/store/transaksi.store'
import { useWalletStore } from '@/store/wallet.store'
import { getKategori, getMulticurrencyEnabled, getActiveCurrencyToggle } from '@/storage'
import { KATEGORI_DEFAULT } from '@/constants'
import { formatRupiah, getCurrentMonthKey } from '@/lib/format'

import styles from './RiwayatPage.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7) // "YYYY-MM"
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  })
}

function formatDateHeader(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function RiwayatPage() {
  const navigate = useNavigate()
  const transaksi = useTransaksiStore(s => s.transaksi)
  const wallets = useWalletStore(s => s.wallets)
  const activeWalletId = useWalletStore(s => s.activeWalletId)

  const [search, setSearch] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey())
  const chipListRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // ── Currency filter (sama seperti HomePage) ────────────────────────────────

  const activeWallet = wallets.find(w => w.id === activeWalletId) ?? wallets[0]
  const baseCurrency = activeWallet?.currency ?? 'IDR'
  const multicurrencyEnabled = useMemo(() => getMulticurrencyEnabled(), [])
  const activeCurrencyToggle = useMemo(() => getActiveCurrencyToggle(), [])

  const activeCurrency = useMemo((): string | null => {
    if (!multicurrencyEnabled) return null
    if (activeCurrencyToggle === 'base') return baseCurrency
    const secondary = wallets.find(w => w.currency !== baseCurrency)
    return secondary?.currency ?? baseCurrency
  }, [multicurrencyEnabled, activeCurrencyToggle, baseCurrency, wallets])

  const relevantWalletIds = useMemo(() => {
    if (activeCurrency === null) return null // null = semua wallet
    return new Set(wallets.filter(w => w.currency === activeCurrency).map(w => w.id))
  }, [wallets, activeCurrency])

  // ── Kategori map ───────────────────────────────────────────────────────────

  const kategoriMap = useMemo(() => getKategori() ?? KATEGORI_DEFAULT, [])
  const allKategori = useMemo(() => [
    ...kategoriMap.keluar,
    ...kategoriMap.masuk,
    ...kategoriMap.nabung,
  ], [kategoriMap])

  function getKategoriInfo(id: string) {
    return allKategori.find(k => k.id === id)
  }

  // ── Transaksi yang relevan (exclude transfer, filter currency) ─────────────

  const relevantTx = useMemo(() => {
    return transaksi.filter(tx => {
      if (tx.type) return false // exclude transfer
      if (relevantWalletIds !== null && !relevantWalletIds.has(tx.wallet_id)) return false
      return true
    })
  }, [transaksi, relevantWalletIds])

  // ── Daftar bulan yang tersedia ─────────────────────────────────────────────

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>()
    monthSet.add(getCurrentMonthKey()) // selalu include bulan ini
    relevantTx.forEach(tx => monthSet.add(getMonthKey(tx.tanggal)))
    return [...monthSet].sort((a, b) => b.localeCompare(a)) // terbaru dulu
  }, [relevantTx])

  // Pastikan selectedMonth valid
  useEffect(() => {
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0] ?? getCurrentMonthKey())
    }
  }, [availableMonths, selectedMonth])

  // Scroll chip aktif ke tengah saat bulan berubah
  useEffect(() => {
    const container = chipListRef.current
    if (!container) return
    const activeChip = container.querySelector('[data-active="true"]') as HTMLElement
    if (activeChip) {
      activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [selectedMonth])

  // ── Filter & search ────────────────────────────────────────────────────────

  const filteredTx = useMemo(() => {
    const q = search.trim().toLowerCase()
    return relevantTx
      .filter(tx => getMonthKey(tx.tanggal) === selectedMonth)
      .filter(tx => {
        if (!q) return true
        return tx.catatan.toLowerCase().includes(q)
      })
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [relevantTx, selectedMonth, search])

  // ── Group by tanggal ───────────────────────────────────────────────────────

  const groupedTx = useMemo(() => {
    const map = new Map<string, typeof filteredTx>()
    filteredTx.forEach(tx => {
      const key = tx.tanggal
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(tx)
    })
    // sort tanggal terbaru dulu
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [filteredTx])

  // ── Summary bulan ini ──────────────────────────────────────────────────────

  const summary = useMemo(() => {
    const masuk = filteredTx.filter(tx => tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0)
    const keluar = filteredTx.filter(tx => tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0)
    return { masuk, keluar }
  }, [filteredTx])

  // ── Render ─────────────────────────────────────────────────────────────────

  function fmt(n: number) { return formatRupiah(n) }

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => navigate(-1)}
          aria-label="Kembali"
        >
          <ArrowLeft size={18} strokeWidth={1.5} />
          <span className={styles.backBtnLabel}>Kembali</span>
        </button>
        <span className={styles.headerTitle}>Semua Catatan</span>
      </div>

      {/* Search bar */}
      <div className={styles.searchWrap}>
        <Search size={16} className={styles.searchIcon} />
        <input
          ref={searchRef}
          type="text"
          className={styles.searchInput}
          placeholder="Cari catatan..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button
            className={styles.searchClear}
            onClick={() => { setSearch(''); searchRef.current?.focus() }}
            aria-label="Hapus pencarian"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Month chips */}
      <div className={styles.chipList} ref={chipListRef}>
        {availableMonths.map(month => (
          <button
            key={month}
            data-active={month === selectedMonth}
            className={[
              styles.chip,
              month === selectedMonth ? styles.chipActive : ''
            ].join(' ')}
            onClick={() => setSelectedMonth(month)}
          >
            {formatMonthLabel(month)}
          </button>
        ))}
      </div>

      {/* Summary strip */}
      {!search && (
        <div className={styles.summaryStrip}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Masuk</span>
            <span className={[styles.summaryAmount, styles.summaryIn].join(' ')}>
              +{fmt(summary.masuk)}
            </span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>Keluar</span>
            <span className={[styles.summaryAmount, styles.summaryOut].join(' ')}>
              −{fmt(summary.keluar)}
            </span>
          </div>
        </div>
      )}

      {/* Transaction list */}
      <div className={styles.listWrap}>
        {groupedTx.length === 0 ? (
          <div className={styles.emptyState}>
            {search
              ? `Tidak ada catatan "${search}"`
              : 'Belum ada transaksi di bulan ini.'
            }
          </div>
        ) : (
          groupedTx.map(([tanggal, txList]) => (
            <div key={tanggal} className={styles.group}>
              <div className={styles.dateHeader}>
                {formatDateHeader(tanggal)}
              </div>
              {txList.map(tx => {
                const kat = getKategoriInfo(tx.kategori)
                const isKeluar = tx.jenis === 'keluar'
                const isMasuk = tx.jenis === 'masuk'
                const wallet = wallets.find(w => w.id === tx.wallet_id)
                return (
                  <div key={tx.id} className={styles.txItem}>
                    <div className={styles.txIcon}>
                      {kat?.icon ?? '📦'}
                    </div>
                    <div className={styles.txInfo}>
                      <div className={styles.txKategori}>
                        {kat?.nama ?? tx.kategori}
                      </div>
                      <div className={styles.txMeta}>
                        {tx.catatan && (
                          <span className={styles.txCatatan}>{tx.catatan}</span>
                        )}
                        {wallet && (
                          <span className={styles.txWallet}>
                            {wallet.icon} {wallet.nama}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={styles.txRight}>
                      <div className={[
                        styles.txNominal,
                        isKeluar ? styles.txNominalKeluar :
                        isMasuk  ? styles.txNominalMasuk  :
                                   styles.txNominalNabung,
                      ].join(' ')}>
                        {isKeluar ? '−' : isMasuk ? '+' : ''}{fmt(tx.nominal)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

    </div>
  )
}
