import type { Clock } from '@/core/clock/Clock'
import styles from './GreetingCard.module.css'

interface Props {
  nickname: string
  clock: Clock
}

function getGreetingPeriod(hour: number): string {
  if (hour < 11) return '🌤️ Selamat pagi'
  if (hour < 15) return '☀️ Selamat siang'
  if (hour < 19) return '🌇 Selamat sore'
  return '🌙 Selamat malam'
}

function getFormattedDate(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function GreetingCard({ nickname, clock }: Props) {
  const now = clock.now()
  const hour = now.getHours()

  return (
    <div className={styles.container}>
      <span className={styles.period}>{getGreetingPeriod(hour)}</span>
      <span className={styles.name}>Halo, {nickname} 👋</span>
      <span className={styles.date}>{getFormattedDate(now)}</span>
    </div>
  )
}
