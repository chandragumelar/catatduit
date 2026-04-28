import { useSavingsStore } from '@/features/planning/savings/savings.store'
import styles from './SavingsCard.module.css'

interface Props {
  onNavigate: () => void
}

export default function SavingsCard({ onNavigate }: Props) {
  const goals = useSavingsStore((s) => s.goals)

  if (goals.length === 0) {
    return (
      <div className={styles.card}>
        <span className={styles.label}>TARGET MENABUNG</span>
        <p className={styles.empty}>Belum ada target. Tambah tujuan menabung biar lebih terarah.</p>
        <button className={styles.cta} onClick={onNavigate}>Tambah Target</button>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <span className={styles.label}>TARGET MENABUNG</span>
      <div className={styles.stampGrid}>
        {goals.map((goal) => (
          <div key={goal.id} className={styles.stamp}>
            <span className={styles.stampIcon}>🎯</span>
            <span className={styles.stampName}>{goal.name}</span>
            <span className={styles.stampTarget}>
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: goal.currencyCode,
                minimumFractionDigits: 0,
              }).format(goal.targetAmount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
