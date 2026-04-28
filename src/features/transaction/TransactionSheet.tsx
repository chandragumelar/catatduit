import { useState, useEffect, useRef } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { useWalletStore } from '@/features/transaction/wallet.store'
import { useCategoryStore } from '@/features/transaction/category.store'
import { useTransaction } from '@/features/transaction/useTransaction'
import { useNudgeStore } from '@/stores/nudge.store'
import { getCurrencySymbol } from '@/core/utils/currency'
import { toISODate } from '@/core/utils/date'
import { RealClock } from '@/core/clock/RealClock'
import type { TransactionType } from '@/features/transaction/transaction.types'
import styles from './TransactionSheet.module.css'

const clock = new RealClock()

const TABS: { type: TransactionType; label: string }[] = [
  { type: 'expense', label: 'Keluar' },
  { type: 'income', label: 'Masuk' },
  { type: 'savings', label: 'Nabung' },
]

interface Props {
  initialType: TransactionType
  onClose: () => void
}

function formatDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('id-ID')
}

export default function TransactionSheet({ initialType, onClose }: Props) {
  const [type, setType] = useState<TransactionType>(initialType)
  const [amountRaw, setAmountRaw] = useState('')
  const [walletId, setWalletId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(toISODate(clock.now()))
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const sheetRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const isDraggingRef = useRef(false)

  const wallets = useWalletStore((s) => s.wallets)
  const categories = useCategoryStore((s) => s.categories)
  const { create } = useTransaction(clock)
  const { markFirstTransaction } = useNudgeStore()

  // Set default wallet on mount
  useEffect(() => {
    if (wallets.length > 0 && !walletId) {
      setWalletId(wallets[0].id)
    }
  }, [wallets])

  // Set default category when type changes
  useEffect(() => {
    const list = categories.filter((c) => c.type === (type === 'savings' ? 'expense' : type))
    if (list.length > 0) setCategoryId(list[0].id)
    else setCategoryId('')
  }, [type, categories])

  const selectedWallet = wallets.find((w) => w.id === walletId)
  const currencySymbol = selectedWallet ? getCurrencySymbol(selectedWallet.currencyCode) : 'Rp'
  const categoryList = categories.filter(
    (c) => c.type === (type === 'savings' ? 'expense' : type)
  )

  // ── Swipe to close ────────────────────────────────────────────
  function handleTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY
    isDraggingRef.current = true
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDraggingRef.current || !sheetRef.current) return
    const delta = e.touches[0].clientY - startYRef.current
    if (delta > 0) {
      sheetRef.current.style.transform = `translateY(${delta}px)`
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!isDraggingRef.current || !sheetRef.current) return
    const delta = e.changedTouches[0].clientY - startYRef.current
    isDraggingRef.current = false
    if (delta > 120) {
      onClose()
    } else {
      sheetRef.current.style.transform = ''
    }
  }

  // ── Submit ────────────────────────────────────────────────────
  function handleSubmit() {
    const newErrors: Record<string, string> = {}
    if (!amountRaw || Number(amountRaw) <= 0) newErrors.amount = 'Nominal harus lebih dari 0'
    if (!walletId) newErrors.wallet = 'Pilih dompet dulu'
    if (type !== 'savings' && !categoryId) newErrors.category = 'Pilih kategori'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const result = create({
      type,
      walletId,
      categoryId: type === 'savings' ? null : categoryId,
      amount: Number(amountRaw),
      notes,
      date,
    })

    if (result.success) {
      markFirstTransaction()
      onClose()
    } else {
      setErrors({ submit: result.error ?? 'Terjadi kesalahan' })
    }
  }

  const submitLabel =
    type === 'expense'
      ? 'Simpan pengeluaran'
      : type === 'income'
      ? 'Simpan pemasukan'
      : 'Simpan tabungan'

  const canSubmit = amountRaw && Number(amountRaw) > 0 && walletId

  return (
    <>
      <div className={styles.overlay} onClick={onClose} aria-hidden />
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal
        aria-label="Catat transaksi"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.handle} />

        {/* Tabs */}
        <div className={styles.tabs}>
          {TABS.map(({ type: t, label }) => (
            <button
              key={t}
              className={[
                styles.tab,
                type === t ? styles[`tabActive_${t}`] : '',
              ].join(' ')}
              onClick={() => setType(t)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* Amount block */}
          <div className={styles[`amountBlock_${type}`]}>
            <span className={styles[`amountLabel_${type}`]}>
              {type === 'expense' ? 'pengeluaran' : type === 'income' ? 'pemasukan' : 'tabungan'}
            </span>
            <div className={styles.amountRow}>
              <span className={styles.amountSym}>{currencySymbol}</span>
              <input
                className={styles.amountInput}
                inputMode="numeric"
                placeholder="0"
                value={formatDisplay(amountRaw)}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '')
                  if (Number(digits) > 999999999999) return
                  setAmountRaw(digits)
                  setErrors((prev) => ({ ...prev, amount: '' }))
                }}
                autoFocus
              />
            </div>
            {errors.amount && <span className={styles.errorText}>{errors.amount}</span>}
          </div>

          {/* Dompet */}
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>dompet</span>
            <div className={styles.selectWrap}>
              <select
                className={styles.select}
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} · {w.currencyCode}
                  </option>
                ))}
              </select>
              <CaretDown size={16} className={styles.selectChevron} />
            </div>
          </div>

          {/* Kategori chips — hanya untuk expense & income */}
          {type !== 'savings' && (
            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>kategori</span>
              <div className={styles.chips}>
                {categoryList.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={[
                      styles.chip,
                      categoryId === cat.id ? styles[`chipActive_${type}`] : '',
                    ].join(' ')}
                    onClick={() => setCategoryId(cat.id)}
                  >
                    <span className={styles.chipLabel}>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tanggal */}
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>tanggal</span>
            <input
              type="date"
              className={styles.inputDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Catatan */}
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>catatan</span>
            <textarea
              className={styles.textarea}
              placeholder="Opsional..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
            />
          </div>

          {errors.submit && <span className={styles.errorText}>{errors.submit}</span>}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            className={[
              styles.submitBtn,
              styles[`submitBtn_${type}`],
              !canSubmit ? styles.submitBtnDisabled : '',
            ].join(' ')}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </>
  )
}
