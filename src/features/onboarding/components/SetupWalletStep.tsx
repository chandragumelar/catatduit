import { Trash, Plus } from '@phosphor-icons/react'
import { SUPPORTED_CURRENCIES } from '@/core/constants/currencies'
import styles from './OnboardingStep.module.css'

interface WalletDraft {
  tempId: string
  name: string
  currencyCode: string
  initialBalance: number
}

interface Props {
  walletDrafts: WalletDraft[]
  walletErrors: Record<string, string>
  canAddMoreCurrencies: boolean
  onAdd: () => void
  onRemove: (tempId: string) => void
  onUpdate: (tempId: string, updates: Partial<Omit<WalletDraft, 'tempId'>>) => void
  onNext: () => void
  onBack: () => void
}

export default function SetupWalletStep({
  walletDrafts, walletErrors, onAdd, onRemove, onUpdate, onNext, onBack,
}: Props) {
  const activeCurrencies = [...new Set(walletDrafts.map((w) => w.currencyCode))]
  const canAddWallet = walletDrafts.length < 10

  return (
    <div className={styles.container}>
      <button className={styles.btnBack} onClick={onBack} aria-label="Kembali">
        ←
      </button>

      <div className={styles.content}>
        <h1 className={styles.title}>Setup dompetmu</h1>
        <p className={styles.subtitle}>
          Tambahkan dompet sesuai cara kamu menyimpan uang. Maksimal 2 jenis mata uang.
        </p>

        <div className={styles.walletList}>
          {walletDrafts.map((draft) => (
            <div key={draft.tempId} className={styles.walletItem}>
              <div className={styles.walletRow}>
                <input
                  className={walletErrors[draft.tempId] ? styles.inputError : styles.input}
                  type="text"
                  placeholder="Nama dompet"
                  value={draft.name}
                  onChange={(e) => onUpdate(draft.tempId, { name: e.target.value })}
                  maxLength={30}
                />
                <select
                  className={styles.select}
                  value={draft.currencyCode}
                  onChange={(e) => {
                    const newCurrency = e.target.value
                    const otherCurrencies = walletDrafts
                      .filter((w) => w.tempId !== draft.tempId)
                      .map((w) => w.currencyCode)
                    const uniqueOthers = new Set(otherCurrencies)
                    if (uniqueOthers.size >= 2 && !uniqueOthers.has(newCurrency)) return
                    onUpdate(draft.tempId, { currencyCode: newCurrency })
                  }}
                >
                  {SUPPORTED_CURRENCIES.map((c) => {
                    const isDisabled =
                      activeCurrencies.length >= 2 &&
                      !activeCurrencies.includes(c.code) &&
                      draft.currencyCode !== c.code
                    return (
                      <option key={c.code} value={c.code} disabled={isDisabled}>
                        {c.code} — {c.name}
                      </option>
                    )
                  })}
                </select>
                {walletDrafts.length > 1 && (
                  <button
                    className={styles.btnRemove}
                    onClick={() => onRemove(draft.tempId)}
                    aria-label="Hapus dompet"
                  >
                    <Trash size={20} />
                  </button>
                )}
              </div>
              {walletErrors[draft.tempId] && (
                <span className={styles.errorText}>{walletErrors[draft.tempId]}</span>
              )}
            </div>
          ))}
        </div>

        {canAddWallet && (
          <button className={styles.btnAdd} onClick={onAdd}>
            <Plus size={16} />
            Tambah dompet
          </button>
        )}
      </div>

      <div className={styles.footer}>
        <button className={styles.btnPrimary} onClick={onNext}>
          Lanjut
        </button>
      </div>
    </div>
  )
}
