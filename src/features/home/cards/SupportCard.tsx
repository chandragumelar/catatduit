import styles from './SupportCard.module.css'

export default function SupportCard() {
  return (
    <div className={styles.card}>
      <span className={styles.deco}>☕</span>
      <div className={styles.top}>
        <span className={styles.eyebrow}>Gratis selamanya</span>
        <div className={styles.headline}>
          Suka CatatDuit?<br />
          <span className={styles.headlineAccent}>Traktir kopi.</span>
        </div>
      </div>
      <p className={styles.desc}>
        Kalau aplikasi ini membantu, kamu bisa support pengembangnya dengan traktir kopi.
      </p>
      <div className={styles.actions}>
        <a
          href="https://trakteer.id/win32_icang/gift"
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.btn} ${styles.btnPrimary}`}
        >
          Trakteer
        </a>
        <a
          href="https://saweria.co/win32icang"
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.btn} ${styles.btnSecondary}`}
        >
          Saweria
        </a>
      </div>
    </div>
  )
}
