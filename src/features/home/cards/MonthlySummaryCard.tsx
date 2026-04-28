import styles from './MonthlySummaryCard.module.css'

interface Props {
  income: number
  expense: number
  fmt: (n: number) => string
}

export default function MonthlySummaryCard({ income, expense, fmt }: Props) {
  const net = income - expense
  const monthLabel = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  return (
    <div className={styles.card}>
      <div className={styles.title}>📋 Ringkasan {monthLabel}</div>

      {income > 0 && (
        <div className={styles.row}>
          <span className={styles.rowLabel}>Pemasukan</span>
          <span className={styles.rowVal} style={{ color: 'var(--color-success)' }}>
            + {fmt(income)}
          </span>
        </div>
      )}
      {expense > 0 && (
        <div className={styles.row}>
          <span className={styles.rowLabel}>Pengeluaran</span>
          <span className={styles.rowVal} style={{ color: 'var(--color-danger)' }}>
            − {fmt(expense)}
          </span>
        </div>
      )}

      <div className={styles.dashes} />

      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>Bersih</span>
        <span
          className={styles.totalVal}
          style={{ color: net >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
        >
          {net >= 0 ? '+' : ''}{fmt(net)}
        </span>
      </div>
    </div>
  )
}
