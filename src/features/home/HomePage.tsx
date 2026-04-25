// =============================================================================
// features/home/HomePage.tsx
// =============================================================================

import { useState, useMemo } from 'react'
import { useToast } from '@/hooks/useToast'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  X,
  ArrowRight,
  ArrowLeftRight,
  Settings,
  Share2,
  Check,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

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
  getMulticurrencyEnabled,
  getActiveCurrencyToggle,
} from '@/storage'
import { SUPPORT_BANNER_COOLDOWN_DAYS, KATEGORI_DEFAULT } from '@/constants'
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

  // ── Data derivations ───────────────────────────────────────────────────────

  const currentMonth = getCurrentMonthKey()
  const tagihan = useMemo(() => getTagihan(), [])
  const budgets = useMemo(() => getBudgets(), [])
  const goals = useMemo(() => getGoals(), [])
  const kategoriMap = useMemo(() => getKategori() ?? KATEGORI_DEFAULT, [])

  const allKategori = useMemo(() => [
    ...kategoriMap.keluar,
    ...kategoriMap.masuk,
    ...kategoriMap.nabung,
  ], [kategoriMap])

  const activeWalletId = useWalletStore(s => s.activeWalletId)
  const activeWallet = wallets.find(w => w.id === activeWalletId) ?? wallets[0]

  // Currency context — filter semua data by currency aktif kalau multicurrency enabled
  const multicurrencyEnabled = useMemo(() => getMulticurrencyEnabled(), [])
  const activeCurrencyToggle = useMemo(() => getActiveCurrencyToggle(), [])
  const baseCurrency = activeWallet?.currency ?? 'IDR'

  // Currency yang sedang aktif (null = semua, untuk kasus single currency)
  const activeCurrency = useMemo((): string | null => {
    if (!multicurrencyEnabled) return null
    if (activeCurrencyToggle === 'base') return baseCurrency
    const secondary = wallets.find(w => w.currency !== baseCurrency)
    return secondary?.currency ?? baseCurrency
  }, [multicurrencyEnabled, activeCurrencyToggle, baseCurrency, wallets])

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
      return sum + wallet.saldo_awal + masuk - keluar
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
  const chartData = useMemo(() => {
    const map: Record<string, number> = {}
    txBulanIni
      .filter(tx => tx.jenis === 'keluar')
      .forEach(tx => {
        map[tx.tanggal] = (map[tx.tanggal] ?? 0) + tx.nominal
      })
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const tanggal = `${currentMonth}-${String(day).padStart(2, '0')}`
      return { tanggal, label: String(day), total: map[tanggal] ?? 0 }
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

  function fmt(n: number) {
    return formatRupiah(n)
  }

  function getKategoriInfo(id: string) {
    return allKategori.find(k => k.id === id)
  }

  // ── Share Ringkasan ────────────────────────────────────────────────────────

  const bulanLabel = getMonthLabel()
  const hasNabung = totalNabungFiltered > 0

  // Total tabungan = sum terkumpul semua goals
  const totalTabungan = useMemo(() => {
    return getGoals().reduce((s, g) => s + g.terkumpul, 0)
  }, [])
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

  function buildShareTeaser(): string {
    if (!hasMasuk && !hasKeluar && !hasNabung) {
      return 'Belum ada catatan bulan ini. Tambah transaksi pertamamu, nanti ringkasannya bisa kamu bagikan di sini.'
    }
    const keluarStr = fmt(totalKeluarFiltered)
    const nabungStr = fmt(totalNabungFiltered)
    const bebasStr = fmt(uangBebas)
    if (hasKeluar && hasNabung) {
      return `Bulan ini keluar ${keluarStr} dan nabung ${nabungStr}. Uang bebasmu tersisa ${bebasStr}.`
    }
    if (hasKeluar) {
      return `Bulan ini keluar ${keluarStr}. Uang bebasmu tersisa ${bebasStr}.`
    }
    return `Uang bebasmu bulan ini ${bebasStr}.`
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
        <div className={styles.greetingRow}>
          <span className={styles.greetingName}>Halo, {nama || 'kamu'}</span>
          <button
            className={styles.settingsBtn}
            onClick={() => navigate('/settings')}
            aria-label="Pengaturan"
          >
            <Settings size={20} strokeWidth={1.5} />
          </button>
        </div>
        <span className={styles.greetingDate}>{getGreetingDate()}</span>
      </div>

      <div className={styles.section}>

        {/* ChecklistCard — conditional */}
        <ChecklistCard />

        {/* Support Card — conditional */}
        {supportVisible && (
          <div className={styles.supportCard}>
            <button
              className={styles.supportDismiss}
              onClick={dismissSupport}
              aria-label="Tutup"
            >
              <X size={16} />
            </button>
            <div className={styles.supportTitle}>
              ☕ CatatDuit gratis selamanya
            </div>
            <div className={styles.supportDesc}>
              Kalau aplikasi ini membantu, kamu bisa traktir kopi buat pengembangnya.
            </div>
            <div className={styles.supportActions}>
              <a
                href="https://trakteer.id/win32_icang/gift"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.supportBtn}
              >
                Trakteer
              </a>
              <a
                href="https://saweria.co/win32icang"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.supportBtn}
              >
                Saweria
              </a>
            </div>
          </div>
        )}

        {/* Hero Number: Uang Bebas */}
        <div className={styles.heroCard}>
          <div className={styles.heroLabel}>Uang Bebas</div>
          <div className={styles.heroSublabel}>sisa setelah tagihan &amp; tabungan</div>
          <div className={[
            styles.heroAmount,
            uangBebas < 0 ? styles.heroAmountNegative : ''
          ].join(' ')}>
            {fmt(uangBebas)}
          </div>
        </div>

        {/* Card Keuangan */}
        <div className={styles.card}>
          {/* Header: judul + Antar Dompet + collapse */}
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

              {/* Daftar wallet — semua relevantWallets */}
              {relevantWallets.map(wallet => {
                const masuk = transaksi.filter(tx => tx.wallet_id === wallet.id && tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0)
                const keluar = transaksi.filter(tx => tx.wallet_id === wallet.id && tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0)
                const saldo = wallet.saldo_awal + masuk - keluar
                return (
                  <div key={wallet.id} className={styles.kasRow}>
                    <span className={styles.kasSymPlus}>+</span>
                    <span className={styles.kasLabel}>{wallet.icon} {wallet.nama}</span>
                    <span className={styles.kasAmountIn}>{fmt(saldo)}</span>
                  </div>
                )
              })}

              {/* Garis + total — hanya kalau >1 wallet */}
              {relevantWallets.length > 1 && (
                <>
                  <div className={styles.kasSepSingle} />
                  <div className={styles.kasRow}>
                    <span />
                    <span className={styles.kasTotalLabel}>Total saldo</span>
                    <span className={styles.kasTotalAmount}>{fmt(totalSaldoFiltered)}</span>
                  </div>
                </>
              )}

              <div className={styles.kasDivider} />

              {/* Tagihan */}
              <div className={styles.kasRow}>
                <span className={styles.kasSymMinus}>−</span>
                <span className={styles.kasLabel}>Tagihan bulan ini</span>
                <span className={[
                  styles.kasAmountNeutral,
                  tagihanBulanIni > 0 ? styles.kasAmountDanger : ''
                ].join(' ')}>
                  {fmt(tagihanBulanIni)}
                </span>
              </div>

              {/* Nabung */}
              <div className={styles.kasRow}>
                <span className={styles.kasSymMinus}>−</span>
                <span className={styles.kasLabel}>Total tabungan</span>
                <span className={styles.kasAmountSavings}>{fmt(totalTabungan)}</span>
              </div>

              {/* Double underline + uang bebas */}
              <div className={styles.kasSepDouble} />

              <div className={styles.kasBebasWrap}>
                <div className={styles.kasBebasRow}>
                  <span className={styles.kasBebasDot} />
                  <span className={styles.kasBebasLabel}>Uang bebas</span>
                  <span className={[
                    styles.kasBebasAmount,
                    uangBebas < 0 ? styles.kasBebasAmountDanger : ''
                  ].join(' ')}>
                    {fmt(uangBebas)}
                  </span>
                </div>
                <p className={styles.kasBebasSub}>yang bisa kamu pakai untuk kebutuhan sehari-hari</p>
              </div>

            </div>
          )}
        </div>

        {/* Card Cashflow */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Cashflow — {getMonthLabel()}</span>
          </div>

          {/* Summary 3 baris */}
          <div className={styles.cfSummary}>
            <div className={styles.cfSummaryRow}>
              <span className={styles.cfSummaryLabel}>Uang masuk</span>
              <span className={[styles.cfSummaryAmount, styles.cashflowIn].join(' ')} style={{ whiteSpace: 'nowrap' }}>{fmt(totalMasukFiltered)}</span>
            </div>
            <div className={styles.cfSummaryRow}>
              <span className={styles.cfSummaryLabel}>Uang keluar</span>
              <span className={[styles.cfSummaryAmount, styles.cashflowOut].join(' ')} style={{ whiteSpace: 'nowrap' }}>{fmt(totalKeluarFiltered)}</span>
            </div>
            <div className={[styles.cfSummaryRow, styles.cfSummaryRowNet].join(' ')}>
              <span className={[styles.cfSummaryLabel, styles.cfSummaryLabelNet].join(' ')}>Uang bersih</span>
              <span className={[
                styles.cfSummaryAmount,
                netBulanIni >= 0 ? styles.cashflowIn : styles.cashflowOut
              ].join(' ')} style={{ whiteSpace: 'nowrap' }}>
                {netBulanIni >= 0 ? '+' : ''}{fmt(netBulanIni)}
              </span>
            </div>
          </div>

          {/* Table detail */}
          {(hasMasuk || hasKeluar) && (
            <table className={styles.cfTable}>
              <tbody>
                {hasMasuk && (
                  <tr className={styles.cfTableSection}>
                    <td colSpan={3} className={styles.cfTableSectionLabel}>Masuk</td>
                  </tr>
                )}
                {cashflowByKategori.masuk.map(k => (
                  <tr key={k.nama} className={styles.cfTableRow}>
                    <td className={styles.cfTableIcon}>{k.icon}</td>
                    <td className={styles.cfTableNama}>{k.nama}</td>
                    <td className={[styles.cfTableAmount, styles.cashflowIn].join(' ')}>{fmt(k.total)}</td>
                  </tr>
                ))}
                {hasKeluar && (
                  <tr className={[styles.cfTableSection, hasMasuk ? styles.cfTableSectionBorderTop : ''].join(' ')}>
                    <td colSpan={3} className={styles.cfTableSectionLabel}>Keluar</td>
                  </tr>
                )}
                {cashflowByKategori.keluar.map(k => (
                  <tr key={k.nama} className={styles.cfTableRow}>
                    <td className={styles.cfTableIcon}>{k.icon}</td>
                    <td className={styles.cfTableNama}>{k.nama}</td>
                    <td className={[styles.cfTableAmount, styles.cashflowOut].join(' ')}>{fmt(k.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!hasMasuk && !hasKeluar && (
            <div className={styles.cardEmptyState}>
              <p className={styles.cardEmptyText}>Belum ada transaksi bulan ini.</p>
            </div>
          )}
        </div>

        {/* Card Pengeluaran per Hari */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Pengeluaran per Hari</span>
          </div>
          <div className={styles.chartWrap}>
            {chartData.length === 0 ? (
              <div className={styles.chartEmpty}>
                Belum ada pengeluaran bulan ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={chartData} barSize={8} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--bg-surface-2)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 'var(--radius-md)',
                          padding: '6px 10px',
                          fontSize: 12,
                          color: 'var(--text-primary)',
                        }}>
                          {fmt(payload[0].value as number)}
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill="var(--accent)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Card Budget — selalu tampil */}
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
            <div className={styles.budgetRows}>
              {budgetRows.map(row => {
                const isOver = row.pct >= 1
                const isWarn = !isOver && row.pct >= 0.75
                const barColor = isOver ? 'var(--status-danger)' : isWarn ? '#EF9F27' : 'var(--accent)'
                const pctLabel = isOver ? `${Math.round(row.pct * 100)}%` : `${Math.round(row.pct * 100)}%`
                const pctColor = isOver ? 'var(--status-danger)' : isWarn ? '#854F0B' : 'var(--accent)'
                const overAmount = isOver ? row.spent - row.limit : 0
                return (
                <div key={row.id} className={styles.budgetRow}>
                  <div className={styles.budgetRowTop}>
                    <span className={styles.budgetRowLabel}>
                      {row.icon} {row.nama}
                    </span>
                    <span className={styles.budgetRowPct} style={{ color: pctColor }}>{pctLabel}</span>
                  </div>
                  <div className={styles.budgetBar}>
                    <div
                      className={styles.budgetBarFill}
                      style={{ width: `${Math.min(row.pct, 1) * 100}%`, background: barColor }}
                    />
                  </div>
                  <div className={styles.budgetRowMeta} style={{ color: isOver ? 'var(--status-danger)' : 'var(--text-tertiary)' }}>
                    {isOver
                      ? `${fmt(row.spent)} dari ${fmt(row.limit)} · jebol ${fmt(overAmount)}`
                      : `${fmt(row.spent)} dari ${fmt(row.limit)}`
                    }
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Card Progress Nabung — selalu tampil */}
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
          ) : (
            <div className={styles.goalRows}>
              {goals.map(goal => {
                const pct = goal.target > 0
                  ? Math.min(goal.terkumpul / goal.target, 1)
                  : 0
                return (
                  <div key={goal.id} className={styles.goalRow}>
                    <div className={styles.goalRowTop}>
                      <div className={styles.goalRowLeft}>
                        {goal.icon && (
                          <span className={styles.goalIcon}>{goal.icon}</span>
                        )}
                        <span className={styles.goalName}>{goal.nama}</span>
                      </div>
                      <span className={styles.goalPercent}>
                        {Math.round(pct * 100)}%
                      </span>
                    </div>
                    <div className={styles.goalProgressBar}>
                      <div
                        className={styles.goalProgressFill}
                        style={{ width: `${pct * 100}%` }}
                      />
                    </div>
                    <div className={styles.goalAmounts}>
                      <span>{fmt(goal.terkumpul)}</span>
                      <span>{fmt(goal.target)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Card Catatan Terakhir — paling bawah */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Catatan Terakhir</span>
          </div>
          {recentTx.length === 0 ? (
            <div className={styles.emptyState}>
              Belum ada catatan. Tambah transaksi pertamamu.
            </div>
          ) : (
            <div className={styles.transaksiList}>
              {recentTx.map(tx => {
                const kat = getKategoriInfo(tx.kategori)
                const isKeluar = tx.jenis === 'keluar'
                const isMasuk = tx.jenis === 'masuk'
                return (
                  <div key={tx.id} className={styles.transaksiItem}>
                    <div className={styles.transaksiIcon}>
                      {kat?.icon ?? '📦'}
                    </div>
                    <div className={styles.transaksiInfo}>
                      <div className={styles.transaksiKategori}>
                        {kat?.nama ?? tx.kategori}
                      </div>
                      {tx.catatan && (
                        <div className={styles.transaksiCatatan}>{tx.catatan}</div>
                      )}
                    </div>
                    <div className={styles.transaksiRight}>
                      <div className={[
                        styles.transaksiNominal,
                        isKeluar ? styles.transaksiNominalKeluar :
                        isMasuk  ? styles.transaksiNominalMasuk  :
                                   styles.transaksiNominalNabung,
                      ].join(' ')}>
                        {isKeluar ? '−' : isMasuk ? '+' : ''}{fmt(tx.nominal)}
                      </div>
                      <div className={styles.transaksiTanggal}>
                        {tx.tanggal.slice(8)}/{tx.tanggal.slice(5, 7)}
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

        {/* Card Bagikan Ringkasan — fix paling bawah */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Ringkasan Bulan Ini</span>
          </div>
          <div className={styles.shareTeaser}>
            {buildShareTeaser()}
          </div>
          {!isShareEmpty && (
            <div className={styles.shareActions}>
              <button
                className={styles.shareBtn}
                onClick={handleShare}
              >
                <Share2 size={16} /> Bagikan
              </button>
            </div>
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
