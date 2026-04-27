import { useState } from 'react'
import { ShieldCheck, PencilSimple, ChartBar } from '@phosphor-icons/react'
import styles from './IntroSlider.module.css'

interface Slide {
  icon: React.ReactNode
  title: string
  desc: string
}

const SLIDES: Slide[] = [
  {
    icon: <ShieldCheck size={64} weight="duotone" />,
    title: 'Data kamu, di HP kamu',
    desc: 'Semua catatan keuangan tersimpan di perangkatmu. Tidak ada yang dikirim ke server kami.',
  },
  {
    icon: <PencilSimple size={64} weight="duotone" />,
    title: 'Catat dalam detik',
    desc: 'Tidak perlu ngerti istilah finance. Cukup jujur mencatat, sisanya biar kami yang urus.',
  },
  {
    icon: <ChartBar size={64} weight="duotone" />,
    title: 'Pahami uangmu',
    desc: 'Lihat ke mana uangmu pergi dan dapatkan insight yang actionable setiap bulannya.',
  },
]

interface Props {
  onNext: () => void
}

export default function IntroSlider({ onNext }: Props) {
  const [current, setCurrent] = useState(0)
  const isLast = current === SLIDES.length - 1

  const handleNext = () => {
    if (isLast) onNext()
    else setCurrent((c) => c + 1)
  }

  const slide = SLIDES[current]

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>{slide.icon}</div>
        <h1 className={styles.title}>{slide.title}</h1>
        <p className={styles.desc}>{slide.desc}</p>
      </div>

      <div className={styles.footer}>
        <div className={styles.dots}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={i === current ? styles.dotActive : styles.dot}
              onClick={() => setCurrent(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        <button className={styles.btnNext} onClick={handleNext}>
          {isLast ? 'Mulai' : 'Lanjut'}
        </button>

        {!isLast && (
          <button className={styles.btnSkip} onClick={onNext}>
            Lewati
          </button>
        )}
      </div>
    </div>
  )
}
