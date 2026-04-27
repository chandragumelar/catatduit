import styles from './OnboardingStep.module.css'

interface Props {
  nickname: string
  error: string
  onChange: (value: string) => void
  onNext: () => void
  onBack: () => void
}

export default function NicknameStep({ nickname, error, onChange, onNext, onBack }: Props) {
  return (
    <div className={styles.container}>
      <button className={styles.btnBack} onClick={onBack} aria-label="Kembali">
        ←
      </button>

      <div className={styles.content}>
        <h1 className={styles.title}>Hai! Siapa namamu?</h1>
        <p className={styles.subtitle}>
          Kami akan memanggilmu dengan nama ini di aplikasi.
        </p>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="nickname">
            Nama panggilan
          </label>
          <input
            id="nickname"
            className={error ? styles.inputError : styles.input}
            type="text"
            placeholder="Contoh: Budi, Sari, Icang..."
            value={nickname}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onNext()}
            maxLength={30}
            autoFocus
          />
          {error && <span className={styles.errorText}>{error}</span>}
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.btnPrimary} onClick={onNext}>
          Lanjut
        </button>
      </div>
    </div>
  )
}
