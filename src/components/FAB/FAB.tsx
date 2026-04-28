import { useState } from 'react'
import { Plus, X } from '@phosphor-icons/react'
import TransactionSheet from '@/features/transaction/TransactionSheet'
import type { TransactionType } from '@/features/transaction/transaction.types'
import styles from './FAB.module.css'

export default function FAB() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<TransactionType>('expense')

  function openSheet(t: TransactionType) {
    setType(t)
    setOpen(true)
  }

  return (
    <>
      <button
        className={styles.fab}
        onClick={() => openSheet('expense')}
        aria-label="Catat transaksi"
      >
        <Plus size={24} weight="bold" color="#ffffff" />
      </button>

      {open && (
        <TransactionSheet
          initialType={type}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
