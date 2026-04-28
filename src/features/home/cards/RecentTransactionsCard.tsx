import type { Transaction, Wallet } from '@/features/transaction/transaction.types'
import styles from './RecentTransactionsCard.module.css'

interface Props {
  transactions: Transaction[]
  wallets: Wallet[]
  fmt: (n: number) => string
}

export default function RecentTransactionsCard({ transactions, wallets, fmt }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  function dateLabel(dateStr: string): string {
    if (dateStr === today) return 'Hari ini'
    if (dateStr === yesterday) return 'Kemarin'
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  return (
    <div className={styles.card}>
      <span className={styles.label}>CATATAN TERAKHIR</span>

      {transactions.length === 0 ? (
        <p className={styles.empty}>Belum ada catatan. Tambah transaksi pertamamu.</p>
      ) : (
        <div className={styles.bubbleList}>
          {transactions.map((tx) => {
            const wallet = wallets.find((w) => w.id === tx.walletId)
            const isRight = tx.type === 'income' || tx.type === 'savings'
            return (
              <div key={tx.id} className={[styles.bubbleRow, isRight ? styles.bubbleRowRight : ''].join(' ')}>
                <div className={styles.bubbleAvatar}>
                  {tx.type === 'expense' ? '📤' : tx.type === 'income' ? '📥' : '🐷'}
                </div>
                <div className={[styles.bubble, isRight ? styles.bubbleRight : styles.bubbleLeft].join(' ')}>
                  <div className={styles.bubbleTop}>
                    <span className={styles.bubbleNotes}>
                      {tx.notes || (tx.type === 'savings' ? 'Tabungan' : 'Transaksi')}
                    </span>
                    <span className={styles.bubbleAmt}>
                      {isRight ? '+' : '−'}{fmt(tx.amount)}
                    </span>
                  </div>
                  <div className={styles.bubbleMeta}>
                    {wallet?.name ?? ''} · {dateLabel(tx.date)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
