import styles from './CashflowCard.module.css'

interface Props {
  income: number
  expense: number
  fmt: (n: number) => string
}

export default function CashflowCard({ income, expense, fmt }: Props) {
  const net = income - expense
  const maxVal = Math.max(income, expense, 1)

  if (income === 0 && expense === 0) {
    return (
      <div className={styles.card}>
        <span className={styles.label}>CASHFLOW BULAN INI</span>
        <p className={styles.empty}>
          Belum ada catatan bulan ini. Mulai catat transaksi pertamamu.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <span className={styles.label}>CASHFLOW BULAN INI</span>

      <div className={styles.bars}>
        <div className={styles.barRow}>
          <span className={styles.barLabel}>Masuk</span>
          <div className={styles.barTrack}>
            <div
              className={styles.barFillIncome}
              style={{ width: `${(income / maxVal) * 100}%` }}
            />
          </div>
          <span className={styles.barAmt} style={{ color: 'var(--color-success)' }}>
            {fmt(income)}
          </span>
        </div>
        <div className={styles.barRow}>
          <span className={styles.barLabel}>Keluar</span>
          <div className={styles.barTrack}>
            <div
              className={styles.barFillExpense}
              style={{ width: `${(expense / maxVal) * 100}%` }}
            />
          </div>
          <span className={styles.barAmt} style={{ color: 'var(--color-danger)' }}>
            {fmt(expense)}
          </span>
        </div>
      </div>

      <div className={styles.netRow}>
        <span className={styles.netLabel}>Bersih bulan ini</span>
        <span
          className={styles.netAmt}
          style={{ color: net >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
        >
          {net >= 0 ? '+' : ''}{fmt(net)}
        </span>
      </div>
    </div>
  )
}
