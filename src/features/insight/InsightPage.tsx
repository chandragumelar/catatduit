// =============================================================================
// features/insight/InsightPage.tsx
// Insight Page — pola & tren lintas waktu.
// Toggle: Bulanan (6 bulan) · Mingguan (6 minggu)
// Cards: Tren Lintas Waktu · Tren per Kategori · Perbandingan Periode · Hari Paling Boros
// =============================================================================

import { useState, useMemo, useEffect, useRef } from 'react'
import { useTransaksiStore } from '@/store/transaksi.store'
import { useWalletStore } from '@/store/wallet.store'
import { getKategori } from '@/storage'
import { KATEGORI_DEFAULT } from '@/constants'

import styles from './InsightPage.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

type ToggleMode = 'bulanan' | 'mingguan'
type MetricKey = 'keluar' | 'masuk' | 'nabung'

interface PeriodBucket {
  label: string       // "Nov", "Des" / "Mg 1", "Mg 2"
  shortLabel: string  // untuk bar label
  keluar: number
  masuk: number
  nabung: number
}

// ── Format helpers ─────────────────────────────────────────────────────────────

function shortRupiah(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.0', '') + ' jt'
  if (v >= 1_000) return Math.round(v / 1_000) + 'rb'
  return String(Math.round(v))
}


// ── Date helpers ───────────────────────────────────────────────────────────────

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  // ISO week-of-year (Mon start)
  const jan1 = new Date(year, 0, 1)
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

function getMonthShortLabel(key: string): string {
  const [y, m] = key.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('id-ID', { month: 'short' })
}

function getWeekShortLabel(key: string): string {
  // key = "2025-W17" — tampilkan tanggal mulai minggu
  const [year, w] = key.split('-W')
  const jan1 = new Date(Number(year), 0, 1)
  const dayOffset = (Number(w) - 1) * 7 - jan1.getDay() + 1
  const monday = new Date(Number(year), 0, 1 + dayOffset)
  return monday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function getPastMonthKeys(n: number): string[] {
  const keys: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(getMonthKey(d))
  }
  return keys
}

function getDayName(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { weekday: 'long' })
}

// ── Chart renderer (Canvas 2D — no external lib) ───────────────────────────────

const COLOR_KELUAR = '#E24B4A'
const COLOR_MASUK  = '#1D9E75'
const COLOR_NABUNG = '#3B82F6'
const COLOR_MUTED  = '#B4B2A9'

const METRIC_COLORS: Record<MetricKey, string> = {
  keluar: COLOR_KELUAR,
  masuk:  COLOR_MASUK,
  nabung: COLOR_NABUNG,
}

const METRIC_LABELS: Record<MetricKey, string> = {
  keluar: 'Pengeluaran',
  masuk:  'Pemasukan',
  nabung: 'Nabung',
}

interface LineChartProps {
  buckets: PeriodBucket[]
  metric1: MetricKey
  metric2: MetricKey | 'none'
}

function LineChart({ buckets, metric1, metric2 }: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    const PAD_TOP = 28
    const PAD_BOTTOM = 24
    const PAD_X = 8
    const chartW = W - PAD_X * 2
    const chartH = H - PAD_TOP - PAD_BOTTOM

    ctx.clearRect(0, 0, W, H)

    const series1 = buckets.map(b => b[metric1])
    const series2 = metric2 !== 'none' ? buckets.map(b => b[metric2 as MetricKey]) : []
    const allVals = [...series1, ...series2]
    const maxVal = Math.max(...allVals, 1)

    function xPos(i: number) {
      return PAD_X + (i / (buckets.length - 1)) * chartW
    }
    function yPos(v: number) {
      return PAD_TOP + chartH - (v / maxVal) * chartH
    }

    function drawLine(series: number[], color: string, dashed: boolean) {
      if (series.length < 2) return
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.lineJoin = 'round'
      if (dashed) ctx.setLineDash([5, 3])
      else ctx.setLineDash([])

      series.forEach((v, i) => {
        const x = xPos(i)
        const y = yPos(v)
        if (i === 0) ctx.moveTo(x, y)
        else {
          // smooth bezier
          const prevX = xPos(i - 1)
          const prevY = yPos(series[i - 1])
          const cpX = (prevX + x) / 2
          ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y)
        }
      })
      ctx.stroke()
      ctx.setLineDash([])

      // dots + labels
      series.forEach((v, i) => {
        const x = xPos(i)
        const y = yPos(v)
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()

        const lbl = shortRupiah(v)
        ctx.font = '500 11px Inter, sans-serif'
        ctx.fillStyle = color
        ctx.textAlign = 'center'
        ctx.fillText(lbl, x, y - 12)
      })
    }

    drawLine(series1, METRIC_COLORS[metric1], false)
    if (metric2 !== 'none') drawLine(series2, METRIC_COLORS[metric2 as MetricKey], true)

    // X labels
    ctx.font = '11px Inter, sans-serif'
    ctx.fillStyle = COLOR_MUTED
    ctx.textAlign = 'center'
    buckets.forEach((b, i) => {
      ctx.fillText(b.shortLabel, xPos(i), H - 4)
    })
  }, [buckets, metric1, metric2])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '200px', display: 'block' }}
      aria-label="Line chart tren lintas waktu"
    />
  )
}

interface BarChartProps {
  buckets: PeriodBucket[]
  metric: MetricKey
}

function BarChart({ buckets, metric }: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    const PAD_TOP = 28
    const PAD_BOTTOM = 24
    const PAD_X = 8
    const chartW = W - PAD_X * 2
    const chartH = H - PAD_TOP - PAD_BOTTOM

    ctx.clearRect(0, 0, W, H)

    const values = buckets.map(b => b[metric])
    const maxVal = Math.max(...values, 1)
    const barW = (chartW / buckets.length) * 0.55
    const gap = chartW / buckets.length

    const color = METRIC_COLORS[metric]

    values.forEach((v, i) => {
      const x = PAD_X + gap * i + (gap - barW) / 2
      const barH = (v / maxVal) * chartH
      const y = PAD_TOP + chartH - barH
      const isMax = v === maxVal

      // bar
      ctx.beginPath()
      const r = 4
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + barW - r, y)
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r)
      ctx.lineTo(x + barW, y + barH)
      ctx.lineTo(x, y + barH)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
      ctx.fillStyle = isMax ? color : color + '66'
      ctx.fill()

      // label
      const lbl = shortRupiah(v)
      ctx.font = '500 11px Inter, sans-serif'
      ctx.fillStyle = isMax ? color : COLOR_MUTED
      ctx.textAlign = 'center'
      ctx.fillText(lbl, x + barW / 2, y - 8)

      // x label
      ctx.font = '11px Inter, sans-serif'
      ctx.fillStyle = COLOR_MUTED
      ctx.fillText(buckets[i].shortLabel, x + barW / 2, H - 4)
    })
  }, [buckets, metric])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '200px', display: 'block' }}
      aria-label="Bar chart tren per kategori"
    />
  )
}

// ── Narasi generators ──────────────────────────────────────────────────────────

function buildNarasiTrenLintas(
  buckets: PeriodBucket[],
  metric1: MetricKey,
  metric2: MetricKey | 'none',
  mode: ToggleMode
): [string, string] {
  if (buckets.length < 2) return ['Belum cukup data untuk membuat analisis.', '']

  const vals1 = buckets.map(b => b[metric1])
  const first1 = vals1[0], last1 = vals1[vals1.length - 1]
  const trend1 = last1 > first1 * 1.1 ? 'naik' : last1 < first1 * 0.9 ? 'turun' : 'stabil'
  const label1 = METRIC_LABELS[metric1].toLowerCase()

  let p1 = ''
  if (trend1 === 'stabil') {
    p1 = `${METRIC_LABELS[metric1]} kamu cenderung stabil sepanjang ${mode === 'bulanan' ? '6 bulan' : '6 minggu'} terakhir — tidak banyak fluktuasi yang perlu diwaspadai.`
  } else {
    const maxIdx = vals1.indexOf(Math.max(...vals1))
    const maxLabel = buckets[maxIdx].label
    p1 = `${METRIC_LABELS[metric1]} kamu menunjukkan tren ${trend1} dalam ${mode === 'bulanan' ? '6 bulan' : '6 minggu'} terakhir. Puncaknya terjadi di ${maxLabel}.`
  }

  if (metric2 === 'none') {
    const avg = Math.round(vals1.reduce((a, b) => a + b, 0) / vals1.length)
    const p2 = last1 > avg
      ? `${mode === 'bulanan' ? 'Bulan' : 'Minggu'} terakhir berada di atas rata-rata periode ini — perlu perhatian lebih kalau trennya belum berbalik.`
      : `${mode === 'bulanan' ? 'Bulan' : 'Minggu'} terakhir masih di bawah rata-rata periode ini, yang merupakan sinyal positif.`
    return [p1, p2]
  }

  const vals2 = buckets.map(b => b[metric2 as MetricKey])
  const label2 = METRIC_LABELS[metric2 as MetricKey].toLowerCase()
  const gaps = vals1.map((v, i) => v - vals2[i])
  const lastGap = gaps[gaps.length - 1]
  const firstGap = gaps[0]
  const gapDir = lastGap > firstGap * 1.1 ? 'melebar' : lastGap < firstGap * 0.9 ? 'menyempit' : 'stabil'

  const p2 = `Jarak antara ${label1} dan ${label2} ${gapDir === 'stabil' ? 'relatif stabil' : gapDir}. ${gapDir === 'melebar' ? 'Ini perlu diwaspadai — ruang gerak keuangan kamu makin sempit.' : gapDir === 'menyempit' ? 'Tren ini positif.' : ''}`
  return [p1, p2]
}

function buildNarasiTrenKategori(
  buckets: Array<{ label: string; total: number }>,
  katNama: string,
  mode: ToggleMode
): [string, string] {
  if (buckets.length < 2) return ['Belum cukup data untuk membuat analisis.', '']

  const vals = buckets.map(b => b.total)
  const maxVal = Math.max(...vals)
  const maxIdx = vals.indexOf(maxVal)
  const minVal = Math.min(...vals)
  const last = vals[vals.length - 1]
  const prev = vals[vals.length - 2]

  const rising3 = vals.length >= 3 && vals[vals.length - 1] > vals[vals.length - 2] && vals[vals.length - 2] > vals[vals.length - 3]

  const p1 = `${katNama} mencapai puncaknya di ${buckets[maxIdx].label}${minVal === 0 ? ', dan sempat tidak ada pengeluaran di beberapa periode' : ''}. Rentang nilainya cukup ${maxVal > minVal * 2 ? 'lebar — pengeluaran di kategori ini tidak konsisten' : 'sempit — polanya relatif stabil'}.`

  let p2 = ''
  if (rising3) {
    p2 = `Tiga ${mode === 'bulanan' ? 'bulan' : 'minggu'} terakhir menunjukkan kenaikan berturut-turut. Ini bukan fluktuasi biasa — ada perubahan kebiasaan yang perlu kamu sadari sebelum jadi baseline baru.`
  } else if (last < prev * 0.85) {
    p2 = `${mode === 'bulanan' ? 'Bulan' : 'Minggu'} terakhir menunjukkan penurunan yang cukup signifikan dibanding sebelumnya — sinyal positif kalau ini memang disengaja.`
  } else {
    p2 = `Tidak ada tren yang terlalu mencolok di ${mode === 'bulanan' ? 'bulan' : 'minggu'} terakhir. Lanjutkan pantau ke periode berikutnya untuk melihat pola yang lebih jelas.`
  }

  return [p1, p2]
}

function buildNarasiPerbandingan(
  rows: Array<{ nama: string; prev: number; curr: number }>,
  prevLabel: string,
  currLabel: string
): [string, string] {
  if (rows.length === 0) return ['Tidak ada kategori yang muncul di kedua periode untuk dibandingkan.', '']

  const biggest = [...rows].sort((a, b) => Math.abs(b.curr - b.prev) - Math.abs(a.curr - a.prev))[0]
  const naik = rows.filter(r => r.curr > r.prev)
  const turun = rows.filter(r => r.curr < r.prev)

  const namaUp = biggest.curr > biggest.prev ? 'naik' : 'turun'
  const p1 = `Perubahan terbesar terjadi di ${biggest.nama} — ${namaUp} dibanding ${prevLabel}. ${naik.length > turun.length ? `Secara keseluruhan lebih banyak kategori yang naik (${naik.length} dari ${rows.length}).` : turun.length > naik.length ? `Secara keseluruhan lebih banyak kategori yang berhasil ditekan (${turun.length} dari ${rows.length}).` : 'Kenaikan dan penurunan kategori berimbang.'}`

  const konsisten = rows.filter(r => r.curr > r.prev * 1.2)
  const p2 = konsisten.length > 1
    ? `${konsisten.map(r => r.nama).join(' dan ')} sama-sama naik signifikan — dua kategori ini perlu perhatian lebih kalau tren ini berlanjut ke ${currLabel} berikutnya.`
    : turun.length > 0
    ? `${turun.map(r => r.nama).join(' dan ')} berhasil ditekan dibanding ${prevLabel} — pertahankan pola ini.`
    : 'Pantau terus di periode berikutnya untuk melihat apakah tren ini berlanjut.'

  return [p1, p2]
}

function buildNarasiHariPaling(
  entries: Array<{ monthLabel: string; day: string; total: number }>,
  mode: ToggleMode
): [string, string] {
  if (entries.length === 0) return ['Belum ada data pengeluaran.', '']

  const dayCounts: Record<string, number> = {}
  for (const e of entries) {
    dayCounts[e.day] = (dayCounts[e.day] ?? 0) + 1
  }
  const topDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]
  const topDayName = topDay[0]
  const topDayCount = topDay[1]

  const p1 = topDayCount >= Math.ceil(entries.length * 0.5)
    ? `Polanya cukup konsisten: ${topDayName} muncul sebagai ${mode === 'bulanan' ? 'hari' : 'hari'} terboros di ${topDayCount} dari ${entries.length} periode terakhir. Bukan kebetulan — ini kemungkinan besar kebiasaan yang sudah terbentuk.`
    : `Tidak ada pola hari yang terlalu dominan — pengeluaran terbesarmu tersebar cukup merata sepanjang minggu.`

  const maxEntry = [...entries].sort((a, b) => b.total - a.total)[0]
  const minEntry = [...entries].sort((a, b) => a.total - b.total)[0]
  const p2 = `Periode dengan pengeluaran terbesar adalah ${maxEntry.monthLabel} (${maxEntry.day}), sementara yang paling terkontrol adalah ${minEntry.monthLabel} (${minEntry.day}).`

  return [p1, p2]
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function InsightPage() {
  const transaksi = useTransaksiStore(s => s.transaksi)
  const wallets = useWalletStore(s => s.wallets)

  const [mode, setMode] = useState<ToggleMode>('bulanan')
  const [metric1, setMetric1] = useState<MetricKey>('keluar')
  const [metric2, setMetric2] = useState<MetricKey | 'none'>('masuk')
  const [selectedKatId, setSelectedKatId] = useState<string>('')


  const kategoriMap = useMemo(() => getKategori() ?? KATEGORI_DEFAULT, [])
  const kategoriKeluar = useMemo(() => kategoriMap.keluar.filter(k =>
    !['transfer_keluar', 'lainnya_keluar'].includes(k.id)
  ), [kategoriMap])

  // Set default kategori pertama kali
  useEffect(() => {
    if (!selectedKatId && kategoriKeluar.length > 0) {
      setSelectedKatId(kategoriKeluar[0].id)
    }
  }, [kategoriKeluar, selectedKatId])

  // Relevant wallet ids (semua — insight tidak perlu currency filter karena lintas waktu)
  const allWalletIds = useMemo(() => new Set(wallets.map(w => w.id)), [wallets])

  // Filter transaksi yang relevan (exclude transfer)
  const txRelevant = useMemo(() =>
    transaksi.filter(tx =>
      allWalletIds.has(tx.wallet_id) &&
      tx.type !== 'transfer_out' &&
      tx.type !== 'transfer_in'
    ),
    [transaksi, allWalletIds]
  )

  // ── Buckets bulanan ────────────────────────────────────────────────────────
  const monthKeys = useMemo(() => getPastMonthKeys(6), [])

  const monthBuckets = useMemo((): PeriodBucket[] =>
    monthKeys.map(key => {
      const txMonth = txRelevant.filter(tx => tx.tanggal.startsWith(key))
      return {
        label: getMonthShortLabel(key),
        shortLabel: getMonthShortLabel(key),
        keluar: txMonth.filter(tx => tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0),
        masuk:  txMonth.filter(tx => tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0),
        nabung: txMonth.filter(tx => tx.jenis === 'nabung').reduce((s, tx) => s + tx.nominal, 0),
      }
    }),
    [txRelevant, monthKeys]
  )

  // ── Buckets mingguan ───────────────────────────────────────────────────────
  const weekBuckets = useMemo((): PeriodBucket[] => {
    // Kumpulkan semua week keys dari 6 minggu terakhir
    const now = new Date()
    const weekKeys: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      weekKeys.push(getWeekKey(d.toISOString().split('T')[0]))
    }
    // Dedupe tapi jaga urutan
    const seen = new Set<string>()
    const unique = weekKeys.filter(k => seen.has(k) ? false : (seen.add(k), true))

    return unique.map(key => {
      const txWeek = txRelevant.filter(tx => getWeekKey(tx.tanggal) === key)
      const label = getWeekShortLabel(key)
      return {
        label,
        shortLabel: label,
        keluar: txWeek.filter(tx => tx.jenis === 'keluar').reduce((s, tx) => s + tx.nominal, 0),
        masuk:  txWeek.filter(tx => tx.jenis === 'masuk').reduce((s, tx) => s + tx.nominal, 0),
        nabung: txWeek.filter(tx => tx.jenis === 'nabung').reduce((s, tx) => s + tx.nominal, 0),
      }
    })
  }, [txRelevant])

  const activeBuckets = mode === 'bulanan' ? monthBuckets : weekBuckets

  // ── Card 2: Tren per Kategori ──────────────────────────────────────────────
  const katBuckets = useMemo(() => {
    if (!selectedKatId) return []
    return activeBuckets.map((b, i) => {
      const key = mode === 'bulanan' ? monthKeys[i] : null
      const txPeriod = mode === 'bulanan' && key
        ? txRelevant.filter(tx => tx.tanggal.startsWith(key) && tx.kategori === selectedKatId && tx.jenis === 'keluar')
        : txRelevant.filter(tx => {
            const wk = getWeekKey(tx.tanggal)
            const now = new Date()
            const weekKeys: string[] = []
            for (let ii = 5; ii >= 0; ii--) {
              const d = new Date(now); d.setDate(d.getDate() - ii * 7)
              weekKeys.push(getWeekKey(d.toISOString().split('T')[0]))
            }
            const seen = new Set<string>()
            const unique = weekKeys.filter(k => seen.has(k) ? false : (seen.add(k), true))
            return wk === unique[i] && tx.kategori === selectedKatId && tx.jenis === 'keluar'
          })
      return { label: b.label, total: txPeriod.reduce((s, tx) => s + tx.nominal, 0) }
    })
  }, [selectedKatId, activeBuckets, txRelevant, mode, monthKeys])

  const selectedKat = useMemo(() =>
    kategoriKeluar.find(k => k.id === selectedKatId),
    [kategoriKeluar, selectedKatId]
  )

  // ── Card 3: Perbandingan Periode ───────────────────────────────────────────
  const compareData = useMemo(() => {
    if (mode === 'bulanan') {
      const currKey = monthKeys[monthKeys.length - 1]
      const prevKey = monthKeys[monthKeys.length - 2]
      const currLabel = getMonthShortLabel(currKey)
      const prevLabel = getMonthShortLabel(prevKey)

      const txCurr = txRelevant.filter(tx => tx.tanggal.startsWith(currKey) && tx.jenis === 'keluar')
      const txPrev = txRelevant.filter(tx => tx.tanggal.startsWith(prevKey) && tx.jenis === 'keluar')

      const totalCurr = txCurr.reduce((s, tx) => s + tx.nominal, 0)
      const totalPrev = txPrev.reduce((s, tx) => s + tx.nominal, 0)

      // Kategori yang ada di KEDUA bulan
      const katInCurr = new Set(txCurr.map(tx => tx.kategori))
      const katInPrev = new Set(txPrev.map(tx => tx.kategori))
      const sharedKat = [...katInCurr].filter(k => katInPrev.has(k))

      const rows = sharedKat.map(katId => {
        const kat = kategoriKeluar.find(k => k.id === katId)
        const curr = txCurr.filter(tx => tx.kategori === katId).reduce((s, tx) => s + tx.nominal, 0)
        const prev = txPrev.filter(tx => tx.kategori === katId).reduce((s, tx) => s + tx.nominal, 0)
        return { id: katId, nama: kat?.nama ?? 'Lainnya', icon: kat?.icon ?? '📦', curr, prev }
      }).sort((a, b) => Math.abs(b.curr - b.prev) - Math.abs(a.curr - a.prev)).slice(0, 4)

      return { prevLabel, currLabel, totalPrev, totalCurr, rows }
    } else {
      // Mingguan: minggu ini vs minggu lalu
      const now = new Date()
      const thisWeek = getWeekKey(now.toISOString().split('T')[0])
      const lastWeekDate = new Date(now); lastWeekDate.setDate(lastWeekDate.getDate() - 7)
      const lastWeek = getWeekKey(lastWeekDate.toISOString().split('T')[0])

      const currLabel = 'Mg ini'
      const prevLabel = 'Mg lalu'

      const txCurr = txRelevant.filter(tx => getWeekKey(tx.tanggal) === thisWeek && tx.jenis === 'keluar')
      const txPrev = txRelevant.filter(tx => getWeekKey(tx.tanggal) === lastWeek && tx.jenis === 'keluar')

      const totalCurr = txCurr.reduce((s, tx) => s + tx.nominal, 0)
      const totalPrev = txPrev.reduce((s, tx) => s + tx.nominal, 0)

      const katInCurr = new Set(txCurr.map(tx => tx.kategori))
      const katInPrev = new Set(txPrev.map(tx => tx.kategori))
      const sharedKat = [...katInCurr].filter(k => katInPrev.has(k))

      const rows = sharedKat.map(katId => {
        const kat = kategoriKeluar.find(k => k.id === katId)
        const curr = txCurr.filter(tx => tx.kategori === katId).reduce((s, tx) => s + tx.nominal, 0)
        const prev = txPrev.filter(tx => tx.kategori === katId).reduce((s, tx) => s + tx.nominal, 0)
        return { id: katId, nama: kat?.nama ?? 'Lainnya', icon: kat?.icon ?? '📦', curr, prev }
      }).sort((a, b) => Math.abs(b.curr - b.prev) - Math.abs(a.curr - a.prev)).slice(0, 4)

      return { prevLabel, currLabel, totalPrev, totalCurr, rows }
    }
  }, [mode, txRelevant, monthKeys, kategoriKeluar])

  const compareMaxVal = useMemo(() =>
    Math.max(...compareData.rows.flatMap(r => [r.curr, r.prev]), 1),
    [compareData]
  )

  // ── Card 4: Hari Paling Boros ──────────────────────────────────────────────
  const borosEntries = useMemo(() => {
    if (mode === 'bulanan') {
      return monthKeys.map(key => {
        const txMonth = txRelevant.filter(tx => tx.tanggal.startsWith(key) && tx.jenis === 'keluar')
        if (txMonth.length === 0) return null

        // Aggregate by tanggal
        const byDay: Record<string, number> = {}
        for (const tx of txMonth) {
          byDay[tx.tanggal] = (byDay[tx.tanggal] ?? 0) + tx.nominal
        }
        const topDate = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]
        return {
          monthLabel: getMonthShortLabel(key),
          day: getDayName(topDate[0]),
          total: topDate[1],
        }
      }).filter(Boolean) as Array<{ monthLabel: string; day: string; total: number }>
    } else {
      // Mingguan: hari terboros tiap minggu
      const now = new Date()
      const weekEntries: Array<{ monthLabel: string; day: string; total: number }> = []
      const seen = new Set<string>()

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i * 7)
        const key = getWeekKey(d.toISOString().split('T')[0])
        if (seen.has(key)) continue
        seen.add(key)

        const txWeek = txRelevant.filter(tx => getWeekKey(tx.tanggal) === key && tx.jenis === 'keluar')
        if (txWeek.length === 0) continue

        const byDay: Record<string, number> = {}
        for (const tx of txWeek) {
          byDay[tx.tanggal] = (byDay[tx.tanggal] ?? 0) + tx.nominal
        }
        const topDate = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]
        weekEntries.push({
          monthLabel: getWeekShortLabel(key),
          day: getDayName(topDate[0]),
          total: topDate[1],
        })
      }
      return weekEntries
    }
  }, [mode, txRelevant, monthKeys])

  const borosMaxTotal = useMemo(() =>
    Math.max(...borosEntries.map(e => e.total), 1),
    [borosEntries]
  )

  // Hari yang paling sering muncul sebagai terboros
  const borosDominantDay = useMemo(() => {
    if (borosEntries.length === 0) return null
    const counts: Record<string, number> = {}
    for (const e of borosEntries) counts[e.day] = (counts[e.day] ?? 0) + 1
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    return { day: top[0], count: top[1], total: borosEntries.length }
  }, [borosEntries])

  // ── Narasi ────────────────────────────────────────────────────────────────
  const [narasiLintas1, narasiLintas2] = useMemo(() =>
    buildNarasiTrenLintas(activeBuckets, metric1, metric2, mode),
    [activeBuckets, metric1, metric2, mode]
  )

  const [narasiKat1, narasiKat2] = useMemo(() =>
    selectedKat ? buildNarasiTrenKategori(katBuckets, selectedKat.nama, mode) : ['', ''],
    [katBuckets, selectedKat, mode]
  )

  const [narasiBanding1, narasiBanding2] = useMemo(() =>
    buildNarasiPerbandingan(
      compareData.rows.map(r => ({ nama: r.nama, prev: r.prev, curr: r.curr })),
      compareData.prevLabel,
      compareData.currLabel
    ),
    [compareData]
  )

  const [narasiHari1, narasiHari2] = useMemo(() =>
    buildNarasiHariPaling(borosEntries, mode),
    [borosEntries, mode]
  )

  const sublabel = mode === 'bulanan' ? 'menampilkan 6 bulan terakhir' : 'menampilkan 6 minggu terakhir'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Insight</span>
      </div>

      {/* ── Toggle ── */}
      <div className={styles.toggleWrapper}>
        <div className={styles.toggleTrack}>
          <button
            className={`${styles.toggleBtn} ${mode === 'bulanan' ? styles.toggleBtnActive : ''}`}
            onClick={() => setMode('bulanan')}
          >
            Bulanan
          </button>
          <button
            className={`${styles.toggleBtn} ${mode === 'mingguan' ? styles.toggleBtnActive : ''}`}
            onClick={() => setMode('mingguan')}
          >
            Mingguan
          </button>
        </div>
        <span className={styles.toggleSublabel}>{sublabel}</span>
      </div>

      <div className={styles.section}>

        {/* ── Card 1: Tren Lintas Waktu ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Tren lintas waktu</span>
          </div>

          <div className={styles.controls}>
            <select
              className={styles.select}
              value={metric1}
              onChange={e => setMetric1(e.target.value as MetricKey)}
            >
              <option value="keluar">Pengeluaran</option>
              <option value="masuk">Pemasukan</option>
              <option value="nabung">Nabung</option>
            </select>
            <select
              className={styles.select}
              value={metric2}
              onChange={e => setMetric2(e.target.value as MetricKey | 'none')}
            >
              <option value="masuk">Pemasukan</option>
              <option value="none">— tidak ada —</option>
              <option value="keluar">Pengeluaran</option>
              <option value="nabung">Nabung</option>
            </select>
          </div>

          <div className={styles.chartWrap}>
            <div className={styles.legendRow}>
              <div className={styles.legendItem}>
                <svg width="24" height="10" viewBox="0 0 24 10">
                  <line x1="0" y1="5" x2="24" y2="5" stroke={METRIC_COLORS[metric1]} strokeWidth="2"/>
                  <circle cx="12" cy="5" r="3" fill={METRIC_COLORS[metric1]}/>
                </svg>
                {METRIC_LABELS[metric1]}
              </div>
              {metric2 !== 'none' && (
                <div className={styles.legendItem}>
                  <svg width="24" height="10" viewBox="0 0 24 10">
                    <line x1="0" y1="5" x2="24" y2="5" stroke={METRIC_COLORS[metric2 as MetricKey]} strokeWidth="2" strokeDasharray="5 3"/>
                    <circle cx="12" cy="5" r="3" fill={METRIC_COLORS[metric2 as MetricKey]}/>
                  </svg>
                  {METRIC_LABELS[metric2 as MetricKey]}
                </div>
              )}
            </div>
            <div className={styles.chartCanvas}>
              <LineChart buckets={activeBuckets} metric1={metric1} metric2={metric2} />
            </div>
          </div>

          <div className={styles.narasi}>
            <p className={styles.narasiP}>{narasiLintas1}</p>
            {narasiLintas2 && <p className={styles.narasiP}>{narasiLintas2}</p>}
          </div>
        </div>

        {/* ── Card 2: Tren per Kategori ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Tren per kategori</span>
          </div>

          <div className={styles.controls}>
            <select
              className={styles.select}
              value={selectedKatId}
              onChange={e => setSelectedKatId(e.target.value)}
            >
              {kategoriKeluar.map(k => (
                <option key={k.id} value={k.id}>{k.icon} {k.nama}</option>
              ))}
            </select>
          </div>

          <div className={styles.chartWrap}>
            <div className={styles.chartCanvas}>
              {katBuckets.every(b => b.total === 0)
                ? <p className={styles.empty}>Belum ada pengeluaran di kategori ini.</p>
                : <BarChart
                    buckets={activeBuckets.map((b, i) => ({ ...b, [metric1]: katBuckets[i]?.total ?? 0 }))}
                    metric={metric1}
                  />
              }
            </div>
          </div>

          <div className={styles.narasi}>
            <p className={styles.narasiP}>{narasiKat1}</p>
            {narasiKat2 && <p className={styles.narasiP}>{narasiKat2}</p>}
          </div>
        </div>

        {/* ── Card 3: Perbandingan Periode ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Perbandingan periode</span>
            <span className={styles.cardPeriod}>
              {compareData.currLabel} vs {compareData.prevLabel}
            </span>
          </div>

          {/* Totals */}
          <div className={styles.compareTotals}>
            <div className={styles.compareTotalCell}>
              <div className={styles.compareTotalMonth}>
                <div className={styles.compareLegendDot} style={{ background: COLOR_MUTED, opacity: 0.5 }} />
                <span className={styles.compareTotalLabel}>{compareData.prevLabel}</span>
              </div>
              <div className={styles.compareTotalValue}>{shortRupiah(compareData.totalPrev)}</div>
            </div>
            <div className={styles.compareTotalCell}>
              <div className={styles.compareTotalMonth}>
                <div className={styles.compareLegendDot} style={{ background: COLOR_KELUAR }} />
                <span className={styles.compareTotalLabel}>{compareData.currLabel}</span>
              </div>
              <div className={styles.compareTotalValue}>{shortRupiah(compareData.totalCurr)}</div>
            </div>
          </div>

          {/* Legend + catatan */}
          <div className={styles.compareMetaRow}>
            <div className={styles.compareLegendDot} style={{ background: COLOR_MUTED, opacity: 0.5 }} />
            <span className={styles.compareLegendLabel}>{compareData.prevLabel}</span>
            <div className={styles.compareDivider} />
            <div className={styles.compareLegendDot} style={{ background: COLOR_KELUAR }} />
            <span className={styles.compareLegendLabel}>{compareData.currLabel}</span>
            <span className={styles.compareOnlyNote}>hanya kategori yang ada di keduanya</span>
          </div>

          {compareData.rows.length === 0 ? (
            <p className={styles.compareNoData}>
              Tidak ada kategori yang muncul di kedua periode.
            </p>
          ) : (
            <div className={styles.compareRows}>
              {compareData.rows.map(row => {
                const delta = row.curr - row.prev
                const deltaLabel = delta >= 0
                  ? `naik ${shortRupiah(Math.abs(delta))} ${mode === 'bulanan' ? 'bulan' : 'minggu'} ini`
                  : `turun ${shortRupiah(Math.abs(delta))} ${mode === 'bulanan' ? 'bulan' : 'minggu'} ini`
                const isUp = delta >= 0
                const prevW = Math.round((row.prev / compareMaxVal) * 100)
                const currW = Math.round((row.curr / compareMaxVal) * 100)

                return (
                  <div key={row.id} className={styles.compareRow}>
                    <div className={styles.compareRowTop}>
                      <span className={styles.compareRowLabel}>{row.icon} {row.nama}</span>
                      <span className={`${styles.compareDelta} ${isUp ? styles.compareDeltaUp : styles.compareDeltaDown}`}>
                        {deltaLabel}
                      </span>
                    </div>
                    <div className={styles.compareBarPair}>
                      <div className={styles.compareBarRow}>
                        <span className={styles.compareBarMonth}>{compareData.prevLabel.slice(0, 3)}</span>
                        <div className={styles.compareBarTrack}>
                          <div className={styles.compareBarFill} style={{ width: `${prevW}%`, background: COLOR_MUTED, opacity: 0.5 }} />
                        </div>
                        <span className={styles.compareBarValue}>{shortRupiah(row.prev)}</span>
                      </div>
                      <div className={styles.compareBarRow}>
                        <span className={styles.compareBarMonth}>{compareData.currLabel.slice(0, 3)}</span>
                        <div className={styles.compareBarTrack}>
                          <div className={styles.compareBarFill} style={{ width: `${currW}%`, background: isUp ? COLOR_KELUAR : COLOR_MASUK }} />
                        </div>
                        <span className={styles.compareBarValue} style={{ color: isUp ? '#A32D2D' : 'var(--status-success)' }}>
                          {shortRupiah(row.curr)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className={styles.narasi}>
            <p className={styles.narasiP}>{narasiBanding1}</p>
            {narasiBanding2 && <p className={styles.narasiP}>{narasiBanding2}</p>}
          </div>
        </div>

        {/* ── Card 4: Hari Paling Boros ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Hari paling boros</span>
            <span className={styles.cardPeriod}>{sublabel.replace('menampilkan ', '')}</span>
          </div>

          {borosEntries.length === 0 ? (
            <p className={styles.empty}>Belum ada data pengeluaran.</p>
          ) : (
            <>
              <div className={styles.borosGrid}>
                {borosEntries.map((entry, i) => (
                  <div key={i} className={styles.borosCell}>
                    <span className={styles.borosCellMonth}>{entry.monthLabel}</span>
                    <div className={styles.borosCellTop}>
                      <span className={styles.borosCellDay}>{entry.day}</span>
                      <span className={styles.borosCellAmount}>{shortRupiah(entry.total)}</span>
                    </div>
                    <div className={styles.borosCellBar}>
                      <div
                        className={styles.borosCellBarFill}
                        style={{ width: `${Math.round((entry.total / borosMaxTotal) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {borosDominantDay && borosDominantDay.count >= Math.ceil(borosEntries.length * 0.5) && (
                <div className={styles.borosAlert}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="8" cy="8" r="7" stroke="#E24B4A" strokeWidth="1.5"/>
                    <path d="M8 5v3.5M8 11v.5" stroke="#E24B4A" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span className={styles.borosAlertText}>
                    <span className={styles.borosAlertStrong}>{borosDominantDay.day}</span> muncul sebagai hari terboros di{' '}
                    <span className={styles.borosAlertStrong}>{borosDominantDay.count} dari {borosDominantDay.total}</span>{' '}
                    periode terakhir.
                  </span>
                </div>
              )}
            </>
          )}

          <div className={styles.narasi}>
            <p className={styles.narasiP}>{narasiHari1}</p>
            {narasiHari2 && <p className={styles.narasiP}>{narasiHari2}</p>}
          </div>
        </div>

      </div>
    </div>
  )
}
