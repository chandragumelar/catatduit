import type { Wallet } from '@/features/transaction/transaction.types'
import styles from './NetWorthCard.module.css'

interface Props {
  totalBalance: number
  wallets: Wallet[]
  getWalletBalance: (id: string) => number
  fmt: (n: number) => string
}

export default function NetWorthCard({ totalBalance, wallets, getWalletBalance, fmt }: Props) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>KEUANGAN KAMU</span>
      <span className={styles.total}>{fmt(totalBalance)}</span>

      {wallets.length > 0 && (
        <div className={styles.walletList}>
          <span className={styles.walletListLabel}>dari dompet</span>
          {wallets.map((wallet) => {
            const balance = getWalletBalance(wallet.id)
            const pct = totalBalance > 0 ? Math.max(0, balance / totalBalance) : 0
            return (
              <div key={wallet.id} className={styles.walletRow}>
                <span className={styles.walletName}>{wallet.name}</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${pct * 100}%` }} />
                </div>
                <span className={styles.walletBalance}>{fmt(balance)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
