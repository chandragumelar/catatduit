// =============================================================================
// features/home/HomePage.tsx
// =============================================================================

import { useState, useMemo } from 'react'
import { useToast } from '@/hooks/useToast'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeftRight,
  Settings,
  Share2,
  Check,
} from 'lucide-react'

import { useTransaksiStore } from '@/store/transaksi.store'
import { useWalletStore } from '@/store/wallet.store'
import { useComputed } from '@/store/computed.store'
import { useTransferStore } from '@/store/transfer.store'
import { ChecklistCard } from '@/components/ui/ChecklistCard'

import {
  getNama,
  getTagihan,
  getBudgets,
  getGoals,
  getKategori,
  getSupportBannerDismissedAt,
  saveSupportBannerDismissedAt,
  getCardCollapsed,
  saveCardCollapsed,
  getActiveCurrencyToggle,
  saveActiveCurrencyToggle,
} from '@/storage'
import { SUPPORT_BANNER_COOLDOWN_DAYS, KATEGORI_DEFAULT, CURRENCY_OPTIONS } from '@/constants'
import { formatRupiah, getCurrentMonthKey } from '@/lib/format'

import styles from './HomePage.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMonthLabel(): string {
  return new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

function getGreetingDate(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getGreetingPeriod(): string {
  const hour = new Date().getHours()
  if (hour < 11) return '🌤️ Selamat pagi'
  if (hour < 15) return '☀️ Selamat siang'
  if (hour < 19) return '🌇 Selamat sore'
  return '🌙 Selamat malam'
}

const MOOD_OPTIONS = ['😊', '😐', '😔', '🤑', '😤'] as const
type Mood = typeof MOOD_OPTIONS[number]

function isSupportVisible(): boolean {
  const dismissedAt = getSupportBannerDismissedAt()
  if (!dismissedAt) return true
  const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24)
  return daysSince >= SUPPORT_BANNER_COOLDOWN_DAYS
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate()
  const openTransfer = useTransferStore(s => s.open)
  const nama = getNama()
  const transaksi = useTransaksiStore(s => s.transaksi)
  const wallets = useWalletStore(s => s.wallets)
  useComputed() // keep store subscription alive

  const [supportVisible, setSupportVisible] = useState(isSupportVisible)
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(
    () => new Set(getCardCollapsed())
  )
  const { toasts, showToast } = useToast()
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [mood, setMood] = useState<Mood | null>(null)
  const [heatMode, setHeatMode] = useState<'keluar' | 'masuk' | 'semua'>('keluar')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  // ── Data derivations ───────────────────────────────────────────────────────

  const currentMonth = getCurrentMonthKey()
  const tagihan = useMemo(() => getTagihan(), [])
  const budgets = useMemo(() => getBudgets(), [])
  const kategoriMap = useMemo(() => getKategori() ?? KATEGORI_DEFAULT, [])

  const allKategori = useMemo(() => [
    ...kategoriMap.keluar,
    ...kategoriMap.masuk,
    ...kategoriMap.nabung,
  ], [kategoriMap])

  const activeWalletId = useWalletStore(s => s.activeWalletId)
  const activeWallet = wallets.find(w => w.id === activeWalletId) ?? wallets[0]
  const baseCurrency = activeWallet?.currency ?? 'IDR'

  // Currency context
  const [activeCurrencyToggle, setActiveCurrencyToggle] = useState<'base' | 'secondary'>(() => getActiveCurrencyToggle())

  const uniqueCurrencies = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const w of wallets) {
      if (!seen.has(w.currency)) {
        seen.add(w.currency)
        result.push(w.currency)
      }
    }
    return result
  }, [wallets])
  const showCurrencyToggle = uniqueCurrencies.length >= 2

  function handleCurrencyToggle(toggle: 'base' | 'secondary') {
    setActiveCurrencyToggle(toggle)
    saveActiveCurrencyToggle(toggle)
  }

  // Currency yang sedang aktif (null = single currency)
  const activeCurrency = useMemo((): string | null => {
    if (uniqueCurrencies.length < 2) return null
    return activeCurrencyToggle === 'base' ? uniqueCurrencies[0] : uniqueCurrencies[1]
  }, [uniqueCurrencies, activeCurrencyToggle])

  // goals difilter by currency aktif — harus setelah activeCurrency
  const goals = useMemo(() => {
    const all = getGoals()
    const currency = activeCurrency ?? baseCurrency
    return all.filter(g => (g.currency ?? baseCurrency) === currency)
  }, [transaksi, activeCurrency, baseCurrency])

  // Wallet yang relevan sesuai currency aktif
  const relevantWallets = useMemo(() => {
    if (activeCurrency === null) return wallets
    return wallets.filter(w => w.currency === activeCurrency)
  }, [wallets, activeCurrency])

  const relevantWalletIds = useMemo(
    () => new Set(relevantWallets.map(w => w.id)),
    [relevantWallets]
  )


  // Total saldo — hanya wallet currency yang relevan
  const totalSaldoFiltered = useMemo(() => {
    return relevantWallets.reduce((sum, wallet) => {
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
  }, [relevantWallets, transaksi])

  // Transaksi bulan ini — filter by currency kalau multicurrency enabled
  const txBulanIni = useMemo(() => {
    return transaksi.filter(tx => {
      if (!tx.tanggal.startsWith(currentMonth)) return false
      if (activeCurrency !== null && !relevantWalletIds.has(tx.wallet_id)) return false
      return true
    })
  }, [transaksi, currentMonth, activeCurrency, relevantWalletIds])

  // Tagihan bulan ini — filter by wallet currency
  const tagihanBulanIni = useMemo(() => {
    return tagihan
      .filter(t => {
        if (t.paidMonths.includes(currentMonth)) return false
        if (activeCurrency === null) return true
        const wallet = wallets.find(w => w.id === t.wallet_id)
        return wallet?.currency === activeCurrency
      })
      .reduce((s, t) => s + t.nominal, 0)
  }, [tagihan, currentMonth, activeCurrency, wallets])

  const totalNabungFiltered = useMemo(
    () => txBulanIni.filter(tx => tx.jenis === 'nabung').reduce((s, tx) => s + tx.nominal, 0),
    [txBulanIni]
  )
  const totalMasukFiltered = useMemo(
    () => txBulanIni.filter(tx => tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0),
    [txBulanIni]
  )
  const totalKeluarFiltered = useMemo(
    () => txBulanIni.filter(tx => tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0),
    [txBulanIni]
  )

  const uangBebas = totalSaldoFiltered - tagihanBulanIni - totalNabungFiltered
  const netBulanIni = totalMasukFiltered - totalKeluarFiltered

  // Cashflow detail by kategori
  const cashflowByKategori = useMemo(() => {
    const masukMap: Record<string, { nama: string; icon: string; total: number }> = {}
    const keluarMap: Record<string, { nama: string; icon: string; total: number }> = {}

    txBulanIni.forEach(tx => {
      if (tx.jenis === 'masuk') {
        const kat = kategoriMap.masuk.find(k => k.id === tx.kategori)
        if (!masukMap[tx.kategori]) masukMap[tx.kategori] = { nama: kat?.nama ?? tx.kategori, icon: kat?.icon ?? '📥', total: 0 }
        masukMap[tx.kategori].total += tx.nominal
      } else if (tx.jenis === 'keluar') {
        const kat = kategoriMap.keluar.find(k => k.id === tx.kategori)
        if (!keluarMap[tx.kategori]) keluarMap[tx.kategori] = { nama: kat?.nama ?? tx.kategori, icon: kat?.icon ?? '📤', total: 0 }
        keluarMap[tx.kategori].total += tx.nominal
      }
    })

    const masuk = Object.values(masukMap).sort((a, b) => b.total - a.total)
    const keluar = Object.values(keluarMap).sort((a, b) => b.total - a.total)
    return { masuk, keluar }
  }, [txBulanIni, kategoriMap])

  // Bar chart — semua tanggal di bulan ini, hari tanpa tx = 0
  // Heatmap data — per hari: masuk, keluar, txs
  const heatmapData = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const tanggal = `${currentMonth}-${String(day).padStart(2, '0')}`
      const dayTx = txBulanIni.filter(tx => tx.tanggal === tanggal && !tx.type)
      const masuk = dayTx.filter(tx => tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0)
      const keluar = dayTx.filter(tx => tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0)
      const nabung = dayTx.filter(tx => tx.jenis === 'nabung').reduce((s, tx) => s + tx.nominal, 0)
      const date = new Date(year, month, day)
      return { day, tanggal, masuk, keluar, nabung, txs: dayTx, dayLabel: dayNames[date.getDay()] }
    })
  }, [txBulanIni, currentMonth])

  // Budget bulan ini
  const budgetRows = useMemo(() => {
    const currBudget = budgets[activeCurrency ?? baseCurrency] ?? {}
    return Object.entries(currBudget).map(([kategoriId, limit]) => {
      const spent = txBulanIni
        .filter(tx => tx.jenis === 'keluar' && tx.kategori === kategoriId)
        .reduce((s, tx) => s + tx.nominal, 0)
      const kat = allKategori.find(k => k.id === kategoriId)
      return {
        id: kategoriId,
        nama: kat?.nama ?? kategoriId,
        icon: kat?.icon ?? '📦',
        limit,
        spent,
        pct: limit > 0 ? Math.min(spent / limit, 1) : 0,
      }
    })
  }, [budgets, activeCurrency, baseCurrency, txBulanIni, allKategori])

  // 4 transaksi terbaru — filter by currency
  const recentTx = useMemo(() => {
    return [...transaksi]
      .filter(tx => {
        if (tx.type) return false // exclude transfer
        if (activeCurrency !== null && !relevantWalletIds.has(tx.wallet_id)) return false
        return true
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 4)
  }, [transaksi, activeCurrency, relevantWalletIds])

  // ── Helpers ────────────────────────────────────────────────────────────────

  function toggleCollapse(cardId: string) {
    setCollapsedCards(prev => {
      const next = new Set(prev)
      next.has(cardId) ? next.delete(cardId) : next.add(cardId)
      saveCardCollapsed([...next])
      return next
    })
  }

  function isCollapsed(cardId: string) {
    return collapsedCards.has(cardId)
  }

  function dismissSupport() {
    saveSupportBannerDismissedAt(Date.now())
    setSupportVisible(false)
  }

  const activeCurrencySymbol = useMemo(() => {
    const code = activeCurrency ?? baseCurrency
    return CURRENCY_OPTIONS.find(c => c.code === code)?.symbol ?? 'Rp'
  }, [activeCurrency, baseCurrency])

  function fmt(n: number) {
    return formatRupiah(n, activeCurrencySymbol)
  }

  function getKategoriInfo(id: string) {
    return allKategori.find(k => k.id === id)
  }

  // ── Share Ringkasan ────────────────────────────────────────────────────────

  const bulanLabel = getMonthLabel()
  const hasNabung = totalNabungFiltered > 0

  // Total tabungan = sum semua transaksi nabung all-time (currency aktif)
  const totalTabungan = useMemo(() => {
    return transaksi
      .filter(tx => tx.jenis === 'nabung' && relevantWalletIds.has(tx.wallet_id))
      .reduce((s, tx) => s + tx.nominal, 0)
  }, [transaksi, relevantWalletIds])
  const hasTagihan = tagihanBulanIni > 0
  const hasMasuk = totalMasukFiltered > 0
  const hasKeluar = totalKeluarFiltered > 0
  const isDefisit = uangBebas < 0

  function buildShareText(): string {
    const masukStr = fmt(totalMasukFiltered)
    const keluarStr = fmt(totalKeluarFiltered)
    const nabungStr = fmt(totalNabungFiltered)
    const tagihanStr = fmt(tagihanBulanIni)
    const bebasStr = fmt(Math.abs(uangBebas))

    // Skenario 8: semua nol — tidak seharusnya dipanggil, tapi safeguard
    if (!hasMasuk && !hasKeluar && !hasNabung && !hasTagihan) {
      return `Keuangan ${bulanLabel}\n\nBelum ada catatan bulan ini.\n\nDicatat pakai CatatDuit.`
    }

    const lines: string[] = [`Keuangan ${bulanLabel}`, '']

    // Kalimat pertama: pemasukan + pengeluaran
    if (hasMasuk && hasKeluar) {
      lines.push(`Bulan ini kamu mendapat pemasukan sebesar ${masukStr} dan mengeluarkan ${keluarStr}.`)
    } else if (hasMasuk && !hasKeluar) {
      lines.push(`Bulan ini kamu mendapat pemasukan sebesar ${masukStr} tanpa ada pengeluaran yang tercatat.`)
    } else if (!hasMasuk && hasKeluar) {
      lines.push(`Bulan ini kamu mengeluarkan ${keluarStr} tanpa ada pemasukan yang tercatat.`)
    }

    // Kalimat kedua: nabung (opsional)
    if (hasNabung) {
      lines.push(`Kamu juga menyisihkan ${nabungStr} untuk ditabung.`)
    }

    lines.push('')

    // Kalimat ketiga: uang bebas
    if (isDefisit) {
      if (hasTagihan) {
        lines.push(`Setelah dipotong tagihan ${tagihanStr}, pengeluaran bulan ini melebihi saldo sebesar ${bebasStr}.`)
      } else {
        lines.push(`Pengeluaran bulan ini melebihi saldo sebesar ${bebasStr}.`)
      }
    } else {
      if (hasTagihan) {
        lines.push(`Setelah dipotong tagihan ${tagihanStr}, uang bebas yang masih bisa kamu gunakan adalah ${fmt(uangBebas)}.`)
      } else {
        lines.push(`Uang bebas yang masih bisa kamu gunakan bulan ini adalah ${fmt(uangBebas)}.`)
      }
    }

    lines.push('', 'Dicatat pakai CatatDuit.')
    return lines.join('\n')
  }

  function buildRingkasanNarasi(): string {
    if (!hasMasuk && !hasKeluar && !hasNabung) {
      return 'Belum ada catatan bulan ini. Mulai catat transaksi pertamamu — nanti di sini kamu bisa lihat cerita keuanganmu selama sebulan penuh.'
    }

    const topKeluar = cashflowByKategori.keluar[0]
    const topMasuk = cashflowByKategori.masuk[0]
    const secondKeluar = cashflowByKategori.keluar[1]

    // ── Paragraf 1: Cashflow + Budget dalam satu napas ───────────────────────
    let p1 = ''

    if (hasMasuk && hasKeluar) {
      const ratio = totalKeluarFiltered / totalMasukFiltered
      const pctLabel = `${Math.round(ratio * 100)}%`
      if (ratio < 0.5) {
        p1 = `Bulan ini pengeluaran jauh di bawah pemasukan — hanya sekitar ${pctLabel}-nya`
      } else if (ratio < 0.8) {
        p1 = `Pengeluaran bulan ini sekitar ${pctLabel} dari pemasukan, masih terkontrol`
      } else if (ratio < 1) {
        p1 = `Pengeluaran sudah menyentuh ${pctLabel} dari pemasukan — tipis`
      } else {
        p1 = `Pengeluaran bulan ini melampaui pemasukan yang tercatat`
      }
      if (topKeluar && secondKeluar) {
        p1 += `, dengan ${topKeluar.nama} dan ${secondKeluar.nama} sebagai dua pos terbesar.`
      } else if (topKeluar) {
        p1 += `, dengan ${topKeluar.nama} sebagai pos terbesar.`
      } else {
        p1 += '.'
      }
    } else if (hasMasuk && !hasKeluar) {
      p1 = `Bulan ini ada pemasukan${topMasuk ? ` dari ${topMasuk.nama}` : ''} tapi belum ada pengeluaran yang tercatat.`
    } else if (!hasMasuk && hasKeluar) {
      p1 = `Bulan ini ada pengeluaran${topKeluar ? ` di ${topKeluar.nama}` : ''} tapi belum ada pemasukan yang tercatat.`
    }

    if (budgetRows.length > 0) {
      const jebols = budgetRows.filter(r => r.pct >= 1)
      const warns = budgetRows.filter(r => r.pct >= 0.75 && r.pct < 1)
      if (jebols.length > 0) {
        const namaJebol = jebols.map(r => r.nama).join(' dan ')
        p1 += ` Budget ${namaJebol} sudah jebol${warns.length > 0 ? ', dan beberapa kategori lain juga mendekati batas' : ''} — perlu dicermati kalau bulan belum habis.`
      } else if (warns.length > 0) {
        const namaWarn = warns.map(r => r.nama).join(' dan ')
        p1 += ` ${namaWarn} sudah di atas 75% budget, jadi perlu sedikit hati-hati sampai akhir bulan.`
      } else {
        p1 += ` Semua budget masih aman.`
      }
    }

    // ── Paragraf 2: Tabungan + Uang bebas sebagai penutup ───────────────────
    let p2 = ''

    if (hasNabung || goals.length > 0) {
      const totalTarget = goals.reduce((s, g) => s + g.target, 0)
      const pctOverall = totalTarget > 0 ? totalTabungan / totalTarget : 0

      if (hasNabung && pctOverall >= 1) {
        p2 = `Luar biasa — total tabungan kamu sudah melewati keseluruhan target yang diset.`
      } else if (hasNabung && pctOverall >= 0.9) {
        p2 = `Kamu menyisihkan untuk ditabung, dan total tabungan sudah hampir mencapai keseluruhan target.`
      } else if (hasNabung) {
        p2 = `Meski begitu, kamu masih sempat menyisihkan sebagian untuk ditabung.`
      } else if (goals.length > 0) {
        p2 = `Progress tabungan tetap berjalan meski bulan ini penuh pengeluaran.`
      }
    }

    if (isDefisit) {
      const penutup = hasTagihan
        ? `Setelah tagihan diperhitungkan, uang bebas masih minus — ada baiknya cek lagi pos mana yang bisa dikurangi sampai akhir bulan.`
        : `Uang bebas saat ini masih minus, jadi perlu sedikit penyesuaian di sisa bulan ini.`
      p2 = p2 ? `${p2} ${penutup}` : penutup
    } else {
      const penutup = hasTagihan
        ? `Setelah tagihan diperhitungkan, masih ada ruang gerak — tinggal jaga supaya tidak terkikis sampai akhir bulan.`
        : `Ruang gerak masih ada, tinggal dijaga supaya tetap sesuai rencana sampai akhir bulan.`
      p2 = p2 ? `${p2} ${penutup}` : penutup
    }

    return [p1, p2].filter(Boolean).join('\n\n')
  }
  function handleShare() {
    setShowShareModal(true)
    setShareCopied(false)
  }

  async function handleCopyText() {
    try {
      await navigator.clipboard.writeText(buildShareText())
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      showToast('Gagal menyalin, coba lagi')
    }
  }

  const isShareEmpty = !hasMasuk && !hasKeluar && !hasNabung && !hasTagihan

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* Toast renderer */}
      {toasts.length > 0 && (
        <div className={styles.toastStack}>
          {toasts.map(t => (
            <div key={t.id} className={styles.toast}>{t.message}</div>
          ))}
        </div>
      )}

      {/* Greeting */}
      <div className={styles.greeting}>
        <div className={styles.greetingTop}>
          <div className={styles.greetingLeft}>
            <span className={styles.greetingPeriod}>{getGreetingPeriod()}</span>
            <span className={styles.greetingName}>Halo, {nama || 'kamu'}</span>
            <span className={styles.greetingDate}>{getGreetingDate()}</span>
          </div>
          <button
            className={styles.settingsBtn}
            onClick={() => navigate('/settings')}
            aria-label="Pengaturan"
          >
            <Settings size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className={styles.moodRow}>
          <span className={styles.moodLabel}>Mood hari ini?</span>
          <div className={styles.moodChips}>
            {MOOD_OPTIONS.map(m => (
              <button
                key={m}
                className={[styles.moodChip, mood === m ? styles.moodChipActive : ''].join(' ')}
                onClick={() => setMood(prev => prev === m ? null : m)}
                aria-pressed={mood === m}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.section}>

        {/* ChecklistCard — conditional */}
        <ChecklistCard />

        {/* Support Card — dark bold */}
        {supportVisible && (
          <div className={styles.supportCard}>
            <span className={styles.supportDeco}>☕</span>
            <button
              className={styles.supportDismiss}
              onClick={dismissSupport}
              aria-label="Tutup"
            >
              ✕
            </button>
            <div className={styles.supportTop}>
              <span className={styles.supportEyebrow}>Gratis selamanya</span>
              <div className={styles.supportHeadline}>
                Suka CatatDuit?<br />
                <span className={styles.supportHeadlineAccent}>Traktir kopi.</span>
              </div>
            </div>
            <div className={styles.supportBody}>
              <p className={styles.supportDesc}>
                Kalau aplikasi ini membantu, kamu bisa support pengembangnya dengan traktir kopi.
              </p>
              <div className={styles.supportActions}>
                <a
                  href="https://trakteer.id/win32_icang/gift"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.supportBtn} ${styles.supportBtnPrimary}`}
                >
                  Trakteer
                </a>
                <a
                  href="https://saweria.co/win32icang"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.supportBtn} ${styles.supportBtnSec}`}
                >
                  Saweria
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Currency Toggle — option C: card tile dengan sub-label */}
        {showCurrencyToggle && (
          <div className={styles.currencyToggleWrap}>
            {uniqueCurrencies.slice(0, 2).map((currency, i) => {
              const isActive = i === 0
                ? activeCurrencyToggle === 'base'
                : activeCurrencyToggle === 'secondary'
              const walletCount = wallets.filter(w => w.currency === currency).length
              return (
                <button
                  key={currency}
                  className={[styles.currencyToggleBtn, isActive ? styles.currencyToggleBtnActive : ''].join(' ')}
                  onClick={() => handleCurrencyToggle(i === 0 ? 'base' : 'secondary')}
                >
                  <span className={styles.currencyToggleCode}>{currency}</span>
                  <span className={styles.currencyToggleSub}>{walletCount} dompet</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Card Keuangan — bar proporsi + wallet breakdown */}
        <div className={styles.card}>
          <div className={styles.kasHeader}>
            <span className={styles.cardTitle}>Keuangan</span>
            <div className={styles.kasHeaderRight}>
              <button className={styles.kasAntarBtn} onClick={openTransfer}>
                <ArrowLeftRight size={13} strokeWidth={1.5} />
                Antar Dompet
              </button>
              <button
                className={styles.collapseBtn}
                onClick={() => toggleCollapse('keuangan')}
                aria-label={isCollapsed('keuangan') ? 'Buka' : 'Tutup'}
              >
                {isCollapsed('keuangan')
                  ? <ChevronDown size={16} />
                  : <ChevronUp size={16} />
                }
              </button>
            </div>
          </div>

          {!isCollapsed('keuangan') && (
            <div className={styles.kasBody}>

              {/* Bar proporsi */}
              {(() => {
                const total = totalSaldoFiltered
                const pctTagihan = total > 0 ? Math.min(tagihanBulanIni / total, 1) : 0
                const pctTabungan = total > 0 ? Math.min(totalTabungan / total, 1) : 0
                const pctBebas = Math.max(0, 1 - pctTagihan - pctTabungan)
                return (
                  <div className={styles.kasProporsi}>
                    <div className={styles.kasProporsiLabels}>
                      <span>{fmt(totalSaldoFiltered)} total saldo</span>
                      <span>100%</span>
                    </div>
                    <div className={styles.kasProporsiTrack}>
                      <div className={styles.kasProporsiSegBebas} style={{ width: `${pctBebas * 100}%` }} />
                      <div className={styles.kasProporsiSegTagihan} style={{ width: `${pctTagihan * 100}%` }} />
                      <div className={styles.kasProporsiSegTabungan} style={{ width: `${pctTabungan * 100}%` }} />
                    </div>
                    <div className={styles.kasProporsiLegend}>
                      <div className={styles.kasProporsiLegendItem}>
                        <div className={`${styles.kasProporsiDot} ${styles.kasProporsiDotBebas}`} />
                        <span>Uang bebas {Math.round(pctBebas * 100)}%</span>
                      </div>
                      <div className={styles.kasProporsiLegendItem}>
                        <div className={`${styles.kasProporsiDot} ${styles.kasProporsiDotTagihan}`} />
                        <span>Tagihan {Math.round(pctTagihan * 100)}%</span>
                      </div>
                      <div className={styles.kasProporsiLegendItem}>
                        <div className={`${styles.kasProporsiDot} ${styles.kasProporsiDotTabungan}`} />
                        <span>Tabungan {Math.round(pctTabungan * 100)}%</span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Wallet breakdown */}
              <div className={styles.kasWalletSection}>
                <span className={styles.kasWalletSectionLabel}>dari dompet</span>
                {relevantWallets.map(wallet => {
                  const masuk = transaksi.filter(tx => tx.wallet_id === wallet.id && tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0)
                  const keluar = transaksi.filter(tx => tx.wallet_id === wallet.id && tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0)
                  const nabung = transaksi.filter(tx => tx.wallet_id === wallet.id && tx.jenis === 'nabung').reduce((s, tx) => s + tx.nominal, 0)
                  const saldo = wallet.saldo_awal + masuk - keluar - nabung
                  const pct = totalSaldoFiltered > 0 ? Math.max(0, saldo / totalSaldoFiltered) : 0
                  return (
                    <div key={wallet.id} className={styles.kasWalletRow}>
                      <span className={styles.kasWalletName}>{wallet.icon} {wallet.nama}</span>
                      <div className={styles.kasWalletBarWrap}>
                        <div className={styles.kasWalletBarTrack}>
                          <div className={styles.kasWalletBarFill} style={{ width: `${pct * 100}%` }} />
                        </div>
                      </div>
                      <span className={styles.kasWalletAmt}>{fmt(saldo)}</span>
                    </div>
                  )
                })}
              </div>

              <div className={styles.kasDivider} />

              {/* Deductions */}
              <div className={styles.kasDeductRow}>
                <span className={styles.kasDeductLabel}>Tagihan bulan ini</span>
                <span className={styles.kasDeductAmtDanger}>− {fmt(tagihanBulanIni)}</span>
              </div>
              <div className={styles.kasDeductRow}>
                <span className={styles.kasDeductLabel}>Total tabungan</span>
                <span className={styles.kasDeductAmtSavings}>− {fmt(totalTabungan)}</span>
              </div>

              {/* Uang bebas */}
              <div className={styles.kasBebasBlock}>
                <div className={styles.kasBebasRow}>
                  <span className={styles.kasBebasLabel}>Uang bebas</span>
                  <span className={[
                    styles.kasBebasAmount,
                    uangBebas < 0 ? styles.kasBebasAmountDanger : ''
                  ].join(' ')}>
                    {fmt(uangBebas)}
                  </span>
                </div>
                <p className={styles.kasBebasSub}>total uang yang bisa kamu pakai untuk kebutuhan sehari-hari</p>
              </div>

            </div>
          )}
        </div>


        {/* Card Cashflow */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Cashflow — {getMonthLabel()}</span>
          </div>

          {(hasMasuk || hasKeluar) ? (
            <div className={styles.cfBody}>
              {/* Bar masuk vs keluar */}
              <div className={styles.cfBars}>
                <div className={styles.cfBarRow}>
                  <span className={styles.cfBarLabel}>Masuk</span>
                  <div className={styles.cfBarTrack}>
                    <div
                      className={styles.cfBarFillMasuk}
                      style={{ width: totalMasukFiltered >= totalKeluarFiltered ? '100%' : `${(totalMasukFiltered / totalKeluarFiltered) * 100}%` }}
                    />
                  </div>
                  <span className={styles.cfBarAmt} style={{ color: 'var(--money-in)' }}>{fmt(totalMasukFiltered)}</span>
                </div>
                <div className={styles.cfBarRow}>
                  <span className={styles.cfBarLabel}>Keluar</span>
                  <div className={styles.cfBarTrack}>
                    <div
                      className={styles.cfBarFillKeluar}
                      style={{ width: totalKeluarFiltered >= totalMasukFiltered ? '100%' : `${(totalKeluarFiltered / totalMasukFiltered) * 100}%` }}
                    />
                  </div>
                  <span className={styles.cfBarAmt} style={{ color: 'var(--money-out)' }}>{fmt(totalKeluarFiltered)}</span>
                </div>
              </div>

              {/* Net */}
              <div className={styles.cfNetRow}>
                <span className={styles.cfNetLabel}>Bersih bulan ini</span>
                <span className={[styles.cfNetAmt, netBulanIni >= 0 ? styles.cfNetPos : styles.cfNetNeg].join(' ')}>
                  {netBulanIni >= 0 ? '+' : ''}{fmt(netBulanIni)}
                </span>
              </div>

              <div className={styles.cfDivider} />

              {/* Detail pemasukan */}
              {hasMasuk && (
                <>
                  <span className={styles.cfSectionLabel}>Pemasukan</span>
                  {cashflowByKategori.masuk.map(k => (
                    <div key={k.nama} className={styles.cfDetailRow}>
                      <span className={styles.cfDetailIcon}>{k.icon}</span>
                      <span className={styles.cfDetailNama}>{k.nama}</span>
                      <span className={styles.cfDetailAmt} style={{ color: 'var(--money-in)' }}>{fmt(k.total)}</span>
                    </div>
                  ))}
                </>
              )}

              {/* Detail pengeluaran */}
              {hasKeluar && (
                <>
                  <span className={[styles.cfSectionLabel, hasMasuk ? styles.cfSectionLabelTop : ''].join(' ')}>Pengeluaran terbesar</span>
                  {cashflowByKategori.keluar.map(k => (
                    <div key={k.nama} className={styles.cfDetailRow}>
                      <span className={styles.cfDetailIcon}>{k.icon}</span>
                      <span className={styles.cfDetailNama}>{k.nama}</span>
                      <span className={styles.cfDetailAmt} style={{ color: 'var(--money-out)' }}>{fmt(k.total)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className={styles.cardEmptyState}>
              <p className={styles.cardEmptyText}>Belum ada transaksi bulan ini.</p>
            </div>
          )}
        </div>

        {/* Card Aktivitas Harian — Heatmap */}
        {(() => {
          const now = new Date()
          const year = now.getFullYear()
          const month = now.getMonth()
          const firstDayOfWeek = new Date(year, month, 1).getDay() // 0=Sun
          // Konversi ke Monday-first: Sun=6, Mon=0, Tue=1, ...
          const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
          const maxKeluar = Math.max(...heatmapData.map(d => d.keluar), 1)
          const maxMasuk = Math.max(...heatmapData.map(d => d.masuk), 1)

          function getCellClass(d: typeof heatmapData[0]) {
            if (heatMode === 'keluar') {
              if (d.keluar === 0) return styles.heatCellZero
              const p = d.keluar / maxKeluar
              if (p < 0.25) return styles.heatKo1
              if (p < 0.5) return styles.heatKo2
              if (p < 0.75) return styles.heatKo3
              return styles.heatKo4
            }
            if (heatMode === 'masuk') {
              if (d.masuk === 0) return styles.heatCellZero
              const p = d.masuk / maxMasuk
              if (p < 0.25) return styles.heatMa1
              if (p < 0.5) return styles.heatMa2
              if (p < 0.75) return styles.heatMa3
              return styles.heatMa4
            }
            const net = d.masuk - d.keluar
            if (d.masuk === 0 && d.keluar === 0) return styles.heatCellZero
            if (net > 500000) return styles.heatNetPos2
            if (net > 0) return styles.heatNetPos1
            if (net > -500000) return styles.heatNetNeg1
            return styles.heatNetNeg2
          }

          const selData = selectedDay !== null ? heatmapData[selectedDay - 1] : null

          return (
            <div className={styles.card}>
              <div className={styles.heatHeader}>
                <span className={styles.cardTitle}>Aktivitas Harian</span>
                <select
                  className={styles.heatDropdown}
                  value={heatMode}
                  onChange={e => { setHeatMode(e.target.value as typeof heatMode); setSelectedDay(null) }}
                >
                  <option value="keluar">Pengeluaran</option>
                  <option value="masuk">Pemasukan</option>
                  <option value="semua">Semua (net)</option>
                </select>
              </div>

              <div className={styles.heatBody}>
                {/* Day labels */}
                <div className={styles.heatGrid}>
                  {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => (
                    <div key={d} className={styles.heatDayLabel}>{d}</div>
                  ))}
                  {/* Empty cells for offset */}
                  {Array.from({ length: startOffset }, (_, i) => (
                    <div key={`empty-${i}`} className={styles.heatCellEmpty} />
                  ))}
                  {/* Day cells */}
                  {heatmapData.map(d => (
                    <div
                      key={d.day}
                      className={[
                        styles.heatCell,
                        getCellClass(d),
                        selectedDay === d.day ? styles.heatCellSelected : '',
                      ].join(' ')}
                      onClick={() => setSelectedDay(prev => prev === d.day ? null : d.day)}
                    >
                      {d.day}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className={styles.heatLegend}>
                  {heatMode === 'semua' ? (
                    <>
                      <span className={styles.heatLegendLabel} style={{ color: 'var(--money-out)' }}>Defisit</span>
                      {(['#D85A30', '#F5C4B3', 'var(--bg-surface-2)', '#9FE1CB', '#1D9E75'] as const).map((bg, i) => (
                        <div key={i} className={styles.heatLegendCell} style={{ background: bg }} />
                      ))}
                      <span className={styles.heatLegendLabel} style={{ color: 'var(--money-in)' }}>Surplus</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.heatLegendLabel}>Sedikit</span>
                      {(heatMode === 'keluar'
                        ? ['var(--bg-surface-2)', '#F5C4B3', '#F0997B', '#D85A30', '#993C1D']
                        : ['var(--bg-surface-2)', '#9FE1CB', '#5DCAA5', '#1D9E75', '#0F6E56']
                      ).map((bg, i) => (
                        <div key={i} className={styles.heatLegendCell} style={{ background: bg }} />
                      ))}
                      <span className={styles.heatLegendLabel}>Banyak</span>
                    </>
                  )}
                </div>

                {/* Detail strip */}
                <div className={styles.heatStrip}>
                  {selData ? (
                    <>
                      <div className={styles.heatStripTop}>
                        <span className={styles.heatStripDate}>
                          {new Date(year, month, selData.day).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </span>
                        <div className={styles.heatStripPills}>
                          {selData.masuk > 0 && <span className={styles.heatPillMasuk}>+{fmt(selData.masuk)}</span>}
                          {selData.keluar > 0 && <span className={styles.heatPillKeluar}>−{fmt(selData.keluar)}</span>}
                          {selData.masuk === 0 && selData.keluar === 0 && selData.nabung === 0 && (
                            <span className={styles.heatPillNone}>Tidak ada aktivitas</span>
                          )}
                        </div>
                      </div>
                      {selData.txs.filter(tx => !tx.type).map(tx => {
                        const kat = allKategori.find(k => k.id === tx.kategori)
                        return (
                          <div key={tx.id} className={styles.heatStripTx}>
                            <span className={styles.heatStripTxIcon}>{kat?.icon ?? '📦'}</span>
                            <span className={styles.heatStripTxNama}>{kat?.nama ?? tx.kategori}</span>
                            <span className={styles.heatStripTxAmt} style={{ color: tx.jenis === 'masuk' ? 'var(--money-in)' : 'var(--money-out)' }}>
                              {tx.jenis === 'masuk' ? '+' : '−'}{fmt(tx.nominal)}
                            </span>
                          </div>
                        )
                      })}
                    </>
                  ) : (
                    <span className={styles.heatStripEmpty}>Ketuk tanggal untuk lihat detail</span>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Card Budget — Thermometer vertikal */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Budget Bulan Ini</span>
          </div>
          {budgetRows.length === 0 ? (
            <div className={styles.cardEmptyState}>
              <span className={styles.cardEmptyText}>
                Belum ada budget. Atur limit per kategori biar pengeluaran lebih terkontrol.
              </span>
              <button
                className={styles.cardEmptyCta}
                onClick={() => navigate('/planning')}
              >
                Atur Budget
              </button>
            </div>
          ) : (
            <div className={styles.thermoWrap}>
              {budgetRows.map(row => {
                const isOver = row.pct >= 1
                const isWarn = !isOver && row.pct >= 0.75
                const fillColor = isOver ? '#E24B4A' : isWarn ? '#EF9F27' : '#639922'
                const pctColor = isOver ? '#E24B4A' : isWarn ? '#854F0B' : '#3B6D11'
                return (
                  <div key={row.id} className={styles.thermoCol}>
                    <span className={styles.thermoPct} style={{ color: pctColor }}>
                      {Math.round(Math.min(row.pct, 9.99) * 100)}%
                    </span>
                    <div className={styles.thermoTrack}>
                      <div
                        className={styles.thermoFill}
                        style={{ height: `${Math.min(row.pct, 1) * 100}%`, background: fillColor }}
                      />
                    </div>
                    <span className={styles.thermoIcon}>{row.icon}</span>
                    <span className={styles.thermoNama}>{row.nama}</span>
                    <span className={styles.thermoMeta}>
                      {fmt(row.spent)}/{fmt(row.limit)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Card Target Menabung — Stamp collection */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Target Menabung</span>
          </div>
          {goals.length === 0 ? (
            <div className={styles.cardEmptyState}>
              <span className={styles.cardEmptyText}>
                Belum ada target. Tambah tujuan menabung biar lebih terarah.
              </span>
              <button
                className={styles.cardEmptyCta}
                onClick={() => navigate('/planning')}
              >
                Tambah Target
              </button>
            </div>
          ) : (() => {
              const totalTarget = goals.reduce((s, g) => s + g.target, 0)
              const pct = totalTarget > 0 ? Math.min(totalTabungan / totalTarget, 1) : 0
              return (
                <div className={styles.stampBody}>
                  <div className={styles.stampGrid}>
                    {goals.map(g => {
                      const reached = totalTabungan >= g.target
                      return (
                        <div key={g.id} className={[styles.stamp, reached ? styles.stampDone : ''].join(' ')}>
                          <span className={styles.stampIcon}>{g.icon ?? '🎯'}</span>
                          <span className={styles.stampNama}>{g.nama}</span>
                          <span className={styles.stampTarget}>{fmt(g.target)}{reached ? ' ✓' : ''}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className={styles.stampTotal}>
                    <div>
                      <span className={styles.stampTotalLabel}>Terkumpul </span>
                      <span className={styles.stampTotalPct}>· {Math.round(pct * 100)}% dari total</span>
                    </div>
                    <span className={styles.stampTotalVal}>{fmt(totalTabungan)}</span>
                  </div>
                </div>
              )
            })()
          }
        </div>

        {/* Card Catatan Terakhir — chat bubble */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Catatan Terakhir</span>
          </div>
          {recentTx.length === 0 ? (
            <div className={styles.emptyState}>
              Belum ada catatan. Tambah transaksi pertamamu.
            </div>
          ) : (
            <div className={styles.bubbleList}>
              {recentTx.map(tx => {
                const kat = getKategoriInfo(tx.kategori)
                const isRight = tx.jenis === 'masuk' || tx.jenis === 'nabung'
                const wallet = relevantWallets.find(w => w.id === tx.wallet_id)
                const today = new Date().toISOString().slice(0, 10)
                const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
                const dateLabel = tx.tanggal === today ? 'Hari ini' : tx.tanggal === yesterday ? 'Kemarin' : tx.tanggal.slice(8) + ' ' + new Date(tx.tanggal).toLocaleDateString('id-ID', { month: 'short' })
                return (
                  <div key={tx.id} className={[styles.bubbleRow, isRight ? styles.bubbleRowRight : ''].join(' ')}>
                    <div className={[styles.bubbleAvatar, isRight ? styles.bubbleAvatarRight : styles.bubbleAvatarLeft].join(' ')}>
                      {kat?.icon ?? '📦'}
                    </div>
                    <div className={[styles.bubble, isRight ? styles.bubbleRight : styles.bubbleLeft].join(' ')}>
                      <div className={styles.bubbleTop}>
                        <span className={styles.bubbleKat}>{kat?.nama ?? tx.kategori}</span>
                        <span className={styles.bubbleAmt} style={{ color: isRight ? 'var(--money-in)' : 'var(--money-out)' }}>
                          {isRight ? '+' : '−'}{fmt(tx.nominal)}
                        </span>
                      </div>
                      <div className={styles.bubbleMeta}>
                        {tx.catatan ? `${tx.catatan} · ` : ''}{wallet?.nama ?? ''} · {dateLabel}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <button
            className={styles.ctaLink}
            onClick={() => navigate('/riwayat')}
          >
            Lihat semua catatan
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Card Ringkasan Bulan Ini — Receipt style */}
        <div className={styles.card}>
          <div className={styles.receiptBody}>
            <div className={styles.receiptTitle}>📋 Ringkasan {bulanLabel}</div>
            {hasMasuk && (
              <div className={styles.receiptRow}>
                <span className={styles.receiptLabel}>Pemasukan</span>
                <span className={styles.receiptVal} style={{ color: 'var(--money-in)' }}>+ {fmt(totalMasukFiltered)}</span>
              </div>
            )}
            {hasKeluar && (
              <div className={styles.receiptRow}>
                <span className={styles.receiptLabel}>Pengeluaran</span>
                <span className={styles.receiptVal} style={{ color: 'var(--money-out)' }}>− {fmt(totalKeluarFiltered)}</span>
              </div>
            )}
            {hasNabung && (
              <div className={styles.receiptRow}>
                <span className={styles.receiptLabel}>Ditabung</span>
                <span className={styles.receiptVal} style={{ color: 'var(--status-success)' }}>− {fmt(totalNabungFiltered)}</span>
              </div>
            )}
            {hasTagihan && (
              <div className={styles.receiptRow}>
                <span className={styles.receiptLabel}>Tagihan</span>
                <span className={styles.receiptVal} style={{ color: 'var(--money-out)' }}>− {fmt(tagihanBulanIni)}</span>
              </div>
            )}
            <div className={styles.receiptDashes} />
            <div className={styles.receiptTotalRow}>
              <span className={styles.receiptTotalLabel}>Uang bebas</span>
              <span className={styles.receiptTotalVal} style={{ color: uangBebas < 0 ? 'var(--money-out)' : 'var(--money-in)' }}>
                {fmt(uangBebas)}
              </span>
            </div>
            {!isShareEmpty && (() => {
              const narasi = buildRingkasanNarasi()
              return narasi ? (
                <div className={styles.receiptNarasi}>{narasi.split('\n\n')[0]}</div>
              ) : null
            })()}
          </div>
          {!isShareEmpty && (
            <button className={styles.receiptShareBtn} onClick={handleShare}>
              <Share2 size={14} /> Bagikan ringkasan
            </button>
          )}
        </div>

      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className={styles.shareOverlay} onClick={() => setShowShareModal(false)}>
          <div className={styles.shareModal} onClick={e => e.stopPropagation()}>
            <div className={styles.shareModalHandle} />

            {/* Konten yang enak di-screenshot */}
            <div className={styles.shareModalContent}>
              <div className={styles.shareModalTitle}>Keuangan {bulanLabel}</div>

              {hasMasuk && (
                <div className={styles.shareModalRow}>
                  <span className={styles.shareModalLabel}>Pemasukan</span>
                  <span className={[styles.shareModalAmount, styles.shareAmountIn].join(' ')}>
                    +{fmt(totalMasukFiltered)}
                  </span>
                </div>
              )}
              {hasKeluar && (
                <div className={styles.shareModalRow}>
                  <span className={styles.shareModalLabel}>Pengeluaran</span>
                  <span className={[styles.shareModalAmount, styles.shareAmountOut].join(' ')}>
                    −{fmt(totalKeluarFiltered)}
                  </span>
                </div>
              )}
              {hasNabung && (
                <div className={styles.shareModalRow}>
                  <span className={styles.shareModalLabel}>Ditabung</span>
                  <span className={[styles.shareModalAmount, styles.shareAmountSavings].join(' ')}>
                    {fmt(totalNabungFiltered)}
                  </span>
                </div>
              )}
              {tagihanBulanIni > 0 && (
                <div className={styles.shareModalRow}>
                  <span className={styles.shareModalLabel}>Tagihan</span>
                  <span className={[styles.shareModalAmount, styles.shareAmountOut].join(' ')}>
                    −{fmt(tagihanBulanIni)}
                  </span>
                </div>
              )}

              <div className={styles.shareModalDivider} />

              <div className={styles.shareModalRow}>
                <span className={styles.shareModalLabelBold}>Uang bebas</span>
                <span className={[
                  styles.shareModalAmountBold,
                  uangBebas < 0 ? styles.shareAmountOut : styles.shareAmountIn
                ].join(' ')}>
                  {fmt(uangBebas)}
                </span>
              </div>

              <div className={styles.shareModalBadge}>CatatDuit</div>
            </div>

            {/* Instruksi + actions */}
            <p className={styles.shareModalHint}>Yuk screenshot dan bagikan!</p>
            <div className={styles.shareModalActions}>
              <button
                className={styles.shareModalCopyBtn}
                onClick={handleCopyText}
              >
                {shareCopied ? <><Check size={15} /> Tersalin</> : 'Salin teks'}
              </button>
              <button
                className={styles.shareModalCloseBtn}
                onClick={() => setShowShareModal(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
