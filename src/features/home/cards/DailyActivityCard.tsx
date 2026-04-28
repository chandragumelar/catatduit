import type { Transaction, Wallet } from '@/features/transaction/transaction.types'
import styles from './DailyActivityCard.module.css'

interface Props {
  transactions: Transaction[]
  wallets: Wallet[]
  fmt: (n: number) => string
}

export default function DailyActivityCard({ transactions, wallets, fmt }: Props) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>AKTIVITAS HARI INI</span>

      {transactions.length === 0 ? (
        <p className={styles.empty}>Belum ada catatan hari ini.</p>
      ) : (
        <div className={styles.list}>
          {transactions.map((tx) => {
            const wallet = wallets.find((w) => w.id === tx.walletId)
            const isIncome = tx.type === 'income' || tx.type === 'savings'
            return (
              <div key={tx.id} className={styles.item}>
                <div className={styles.itemLeft}>
                  <span className={styles.itemType}>
                    {tx.type === 'expense' ? '📤' : tx.type === 'income' ? '📥' : '🐷'}
                  </span>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemNotes}>
                      {tx.notes || (tx.type === 'savings' ? 'Tabungan' : 'Transaksi')}
                    </span>
                    <span className={styles.itemWallet}>{wallet?.name ?? ''}</span>
                  </div>
                </div>
                <span
                  className={styles.itemAmt}
                  style={{ color: isIncome ? 'var(--color-success)' : 'var(--color-danger)' }}
                >
                  {isIncome ? '+' : '−'}{fmt(tx.amount)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
