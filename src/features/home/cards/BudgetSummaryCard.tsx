import { useMemo } from 'react'
import type { Transaction, Wallet } from '@/features/transaction/transaction.types'
import { useBudgetStore } from '@/features/planning/budget/budget.store'
import { useCategoryStore } from '@/features/transaction/category.store'
import styles from './BudgetSummaryCard.module.css'

interface Props {
  activeCurrency: string
  transactions: Transaction[]
  wallets: Wallet[]
  startStr: string
  endStr: string
  fmt: (n: number) => string
  onNavigate: () => void
}

export default function BudgetSummaryCard({
  activeCurrency, transactions, wallets, startStr, endStr, fmt, onNavigate,
}: Props) {
  const budgets = useBudgetStore((s) => s.budgets)
  const categories = useCategoryStore((s) => s.categories)

  const walletIds = useMemo(
    () => new Set(wallets.filter((w) => w.currencyCode === activeCurrency).map((w) => w.id)),
    [wallets, activeCurrency]
  )

  const budgetRows = useMemo(() => {
    const activeBudgets = budgets.filter(
      (b) => b.periodType === 'monthly' && b.currencyCode === activeCurrency
    )
    return activeBudgets.map((budget) => {
      const spent = transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.categoryId === budget.categoryId &&
            t.date >= startStr &&
            t.date <= endStr &&
            walletIds.has(t.walletId)
        )
        .reduce((sum, t) => sum + t.amount, 0)
      const category = categories.find((c) => c.id === budget.categoryId)
      const pct = budget.amount > 0 ? Math.min(spent / budget.amount, 1) : 0
      return { budget, category, spent, pct }
    })
  }, [budgets, transactions, activeCurrency, startStr, endStr, walletIds, categories])

  if (budgetRows.length === 0) {
    return (
      <div className={styles.card}>
        <span className={styles.label}>BUDGET BULAN INI</span>
        <p className={styles.empty}>Belum ada budget. Atur limit per kategori biar pengeluaran lebih terkontrol.</p>
        <button className={styles.cta} onClick={onNavigate}>Atur Budget</button>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <span className={styles.label}>BUDGET BULAN INI</span>
      <div className={styles.thermoWrap}>
        {budgetRows.map(({ budget, category, spent, pct }) => {
          const isOver = pct >= 1
          const isWarn = !isOver && pct >= 0.75
          const fillColor = isOver
            ? 'var(--color-danger)'
            : isWarn
            ? 'var(--color-warning)'
            : 'var(--color-success)'
          const pctColor = isOver
            ? 'var(--color-danger)'
            : isWarn
            ? 'var(--color-warning)'
            : 'var(--color-success)'

          return (
            <div key={budget.id} className={styles.thermoCol}>
              <span className={styles.thermoPct} style={{ color: pctColor }}>
                {Math.round(Math.min(pct, 9.99) * 100)}%
              </span>
              <div className={styles.thermoTrack}>
                <div
                  className={styles.thermoFill}
                  style={{ height: `${Math.min(pct, 1) * 100}%`, background: fillColor }}
                />
              </div>
              <span className={styles.thermoNama}>{category?.name ?? '?'}</span>
              <span className={styles.thermoMeta}>
                {fmt(spent)}/{fmt(budget.amount)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
