import { getCurrencySymbol } from '@/core/utils/currency'
import styles from './OnboardingStep.module.css'

interface WalletDraft {
  tempId: string
  name: string
  currencyCode: string
  initialBalance: number
}

interface Props {
  walletDrafts: WalletDraft[]
  onUpdate: (tempId: string, updates: Partial<Omit<WalletDraft, 'tempId'>>) => void
  onNext: () => void
  onBack: () => void
}

export default function SetBalanceStep({ walletDrafts, onUpdate, onNext, onBack }: Props) {
  return (
    <div className={styles.container}>
      <button className={styles.btnBack} onClick={onBack} aria-label="Kembali">
        ←
      </button>

      <div className={styles.content}>
        <h1 className={styles.title}>Berapa saldo sekarang?</h1>
        <p className={styles.subtitle}>
          Isi saldo awal tiap dompet. Boleh dikosongkan kalau tidak tahu.
        </p>

        <div className={styles.walletList}>
          {walletDrafts.map((draft) => (
            <div key={draft.tempId} className={styles.balanceItem}>
              <label className={styles.walletName}>{draft.name}</label>
              <div className={styles.balanceRow}>
                <span className={styles.currencySymbol}>
                  {getCurrencySymbol(draft.currencyCode)}
                </span>
                <input
                  className={styles.inputAmount}
                  type="number"
                  min="0"
                  placeholder="0"
                  value={draft.initialBalance || ''}
                  onChange={(e) =>
                    onUpdate(draft.tempId, {
                      initialBalance: Math.max(0, Number(e.target.value)),
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.btnPrimary} onClick={onNext}>
          Mulai CatatDuit!
        </button>
        <button className={styles.btnSecondary} onClick={onBack}>
          Kembali
        </button>
      </div>
    </div>
  )
}
