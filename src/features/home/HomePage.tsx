// =============================================================================
// features/home/HomePage.tsx
// =============================================================================

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  X,
  ArrowRight,
  Wallet,
  Receipt,
  PiggyBank,
  Sparkles,
  TrendingUp,
  TrendingDown,
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

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', { day: 'numeric' })
}

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
  const nama = getNama()
  const transaksi = useTransaksiStore(s => s.transaksi)
  const wallets = useWalletStore(s => s.wallets)
  useComputed() // keep store subscription alive

  const [supportVisible, setSupportVisible] = useState(isSupportVisible)
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(
    () => new Set(getCardCollapsed())
  )

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

  // Saldo aktif wallet
  const activeWalletSaldo = useMemo(() => {
    if (!activeWallet) return 0
    const masuk = transaksi
      .filter(tx => tx.wallet_id === activeWallet.id && tx.jenis === 'masuk')
      .reduce((s, tx) => s + tx.nominal, 0)
    const keluar = transaksi
      .filter(tx => tx.wallet_id === activeWallet.id && tx.jenis === 'keluar')
      .reduce((s, tx) => s + tx.nominal, 0)
    return activeWallet.saldo_awal + masuk - keluar
  }, [activeWallet, transaksi])

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

  // Bar chart — keluar per hari bulan ini
  const chartData = useMemo(() => {
    const map: Record<string, number> = {}
    txBulanIni
      .filter(tx => tx.jenis === 'keluar')
      .forEach(tx => {
        map[tx.tanggal] = (map[tx.tanggal] ?? 0) + tx.nominal
      })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tanggal, total]) => ({ tanggal, label: getDayLabel(tanggal), total }))
  }, [txBulanIni])

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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* Greeting */}
      <div className={styles.greeting}>
        <span className={styles.greetingName}>Halo, {nama || 'kamu'}</span>
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
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Keuangan</span>
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

          {!isCollapsed('keuangan') && (
            <div className={styles.keuanganRows}>
              {/* Saldo aktif wallet */}
              <div className={styles.keuanganRow}>
                <div className={styles.keuanganRowLabel}>
                  <Wallet size={16} className={styles.keuanganRowIcon} />
                  {activeWallet
                    ? <>{activeWallet.icon} {activeWallet.nama}</>
                    : 'Dompet'
                  }
                </div>
                <div className={styles.keuanganRowAmount}>
                  {fmt(activeWalletSaldo)}
                </div>
              </div>

              {/* Total semua dompet — hanya tampil kalau ada >1 wallet dengan currency sama */}
              {relevantWallets.length > 1 && (
                <div className={styles.keuanganRow}>
                  <div className={styles.keuanganRowLabel}>
                    <Wallet size={16} className={styles.keuanganRowIcon} />
                    Total semua dompet
                    <span className={styles.walletBadge}>{relevantWallets.length}</span>
                  </div>
                  <div className={styles.keuanganRowAmount}>
                    {fmt(totalSaldoFiltered)}
                  </div>
                </div>
              )}

              {/* Tagihan bulan ini */}
              <div className={styles.keuanganRow}>
                <div className={styles.keuanganRowLabel}>
                  <Receipt size={16} className={styles.keuanganRowIcon} />
                  Tagihan bulan ini
                </div>
                <div className={[
                  styles.keuanganRowAmount,
                  tagihanBulanIni > 0 ? styles.keuanganRowAmountDanger : ''
                ].join(' ')}>
                  {fmt(tagihanBulanIni)}
                </div>
              </div>

              {/* Nabung bulan ini */}
              <div className={styles.keuanganRow}>
                <div className={styles.keuanganRowLabel}>
                  <PiggyBank size={16} className={styles.keuanganRowIcon} />
                  Nabung bulan ini
                </div>
                <div className={styles.keuanganRowAmount}>
                  {fmt(totalNabungFiltered)}
                </div>
              </div>

              {/* Uang bebas */}
              <div className={styles.keuanganRow}>
                <div className={styles.keuanganRowLabel}>
                  <Sparkles size={16} className={styles.keuanganRowIcon} />
                  Uang bebas
                </div>
                <div className={[
                  styles.keuanganRowAmount,
                  uangBebas >= 0
                    ? styles.keuanganRowAmountAccent
                    : styles.keuanganRowAmountDanger
                ].join(' ')}>
                  {fmt(uangBebas)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card Cashflow */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Cashflow — {getMonthLabel()}</span>
          </div>
          <div className={styles.cashflowDesc}>
            Total uang masuk dikurangi uang keluar bulan ini.
          </div>
          <div className={styles.cashflowGrid}>
            <div className={styles.cashflowItem}>
              <div className={styles.cashflowItemLabel}>
                <TrendingUp size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                Uang masuk
              </div>
              <div className={[styles.cashflowItemAmount, styles.cashflowIn].join(' ')}>
                {fmt(totalMasukFiltered)}
              </div>
            </div>
            <div className={styles.cashflowItem}>
              <div className={styles.cashflowItemLabel}>
                <TrendingDown size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                Uang keluar
              </div>
              <div className={[styles.cashflowItemAmount, styles.cashflowOut].join(' ')}>
                {fmt(totalKeluarFiltered)}
              </div>
            </div>
          </div>
          <div className={styles.cardDivider} />
          <div className={styles.cashflowNet}>
            <span className={styles.cashflowNetLabel}>Uang bersih bulan ini</span>
            <span className={[
              styles.cashflowNetAmount,
              netBulanIni > 0 ? styles.cashflowNetPositive :
              netBulanIni < 0 ? styles.cashflowNetNegative :
              styles.cashflowNetNeutral,
            ].join(' ')}>
              {netBulanIni >= 0 ? '+' : ''}{fmt(netBulanIni)}
            </span>
          </div>
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

        {/* Card Budget — conditional */}
        {budgetRows.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Budget Bulan Ini</span>
            </div>
            <div className={styles.budgetRows}>
              {budgetRows.map(row => (
                <div key={row.id} className={styles.budgetRow}>
                  <div className={styles.budgetRowTop}>
                    <span className={styles.budgetRowLabel}>
                      {row.icon} {row.nama}
                    </span>
                    <span className={styles.budgetRowAmounts}>
                      {fmt(row.spent)} / {fmt(row.limit)}
                    </span>
                  </div>
                  <div className={styles.budgetBar}>
                    <div
                      className={[
                        styles.budgetBarFill,
                        row.pct >= 1 ? styles.budgetBarFillDanger : ''
                      ].join(' ')}
                      style={{ width: `${row.pct * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card Progress Nabung — conditional */}
        {goals.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Target Menabung</span>
            </div>
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
          </div>
        )}

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

      </div>
    </div>
  )
}
