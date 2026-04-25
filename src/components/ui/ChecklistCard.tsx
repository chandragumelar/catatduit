// =============================================================================
// components/ui/ChecklistCard.tsx
// Checklist post-onboarding. Progressive: item 2-4 muncul setelah item 1 done.
// Hilang permanen setelah semua done/dismiss.
// =============================================================================

import { useState, useEffect } from 'react'
import { Check, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getChecklistDone, saveChecklistDone } from '@/storage'
import { useWalletStore } from '@/store/wallet.store'
import { useTransaksiStore } from '@/store/transaksi.store'
import { useInputStore } from '@/store/input.store'
import styles from './ChecklistCard.module.css'

// ── Item definitions ──────────────────────────────────────────────────────────

export type ChecklistItemId =
  | 'catat_pertama'
  | 'tambah_dompet'
  | 'tambah_tagihan'
  | 'buat_target'

interface ChecklistItem {
  id: ChecklistItemId
  label: string
  action: () => void
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChecklistCard() {
  const navigate = useNavigate()
  const openInput = useInputStore(s => s.open)
  const wallets = useWalletStore(s => s.wallets)
  const transaksi = useTransaksiStore(s => s.transaksi)

  const [doneIds, setDoneIds] = useState<Set<string>>(() => {
    return new Set(getChecklistDone())
  })
  const [hidden, setHidden] = useState(false)

  // Deteksi done otomatis dari state
  const hasTransaksi = transaksi.length > 0
  const hasMultiWallet = wallets.length > 1

  useEffect(() => {
    const next = new Set(doneIds)
    if (hasTransaksi) next.add('catat_pertama')
    if (hasMultiWallet) next.add('tambah_dompet')
    if (next.size !== doneIds.size) {
      setDoneIds(next)
      saveChecklistDone([...next])
    }
  }, [hasTransaksi, hasMultiWallet])

  const firstItemDone = doneIds.has('catat_pertama')

  // Item definitions — action bisa dispatch FAB open atau navigate
  const ALL_ITEMS: ChecklistItem[] = [
    {
      id: 'catat_pertama',
      label: 'Catat pengeluaran pertamamu',
      action: () => openInput('keluar'),
    },
    {
      id: 'tambah_dompet',
      label: 'Tambah dompet kedua',
      action: () => navigate('/settings'),
    },
    {
      id: 'tambah_tagihan',
      label: 'Tambah tagihan rutin',
      action: () => navigate('/planning'),
    },
    {
      id: 'buat_target',
      label: 'Buat target menabung',
      action: () => navigate('/planning'),
    },
  ]

  // Filter: tambah_dompet tidak muncul kalau sudah multi-wallet dari onboarding
  const visibleItems = ALL_ITEMS.filter(item => {
    if (item.id === 'tambah_dompet' && hasMultiWallet && !doneIds.has('tambah_dompet')) return false
    // Item 2-4 hanya muncul setelah catat_pertama done
    if (item.id !== 'catat_pertama' && !firstItemDone) return false
    return true
  })

  function dismiss(id: string) {
    const next = new Set(doneIds)
    next.add(id)
    setDoneIds(next)
    saveChecklistDone([...next])
  }

  // Hitung apakah semua visible item sudah done/dismissed
  const allDone = visibleItems.every(item => doneIds.has(item.id))
    // Edge case: kalau firstItemDone tapi item lain belum visible karena filter,
    // tunggu sampai visible items muncul dulu
    && firstItemDone

  useEffect(() => {
    if (allDone) {
      // Delay sedikit biar user sempat lihat state terakhir
      const t = setTimeout(() => setHidden(true), 600)
      return () => clearTimeout(t)
    }
  }, [allDone])

  if (hidden) return null

  const remaining = visibleItems.filter(item => !doneIds.has(item.id)).length

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>
          {remaining > 0 ? `Yuk mulai! (${remaining} langkah lagi)` : 'Semua selesai!'}
        </span>
      </div>

      <ul className={styles.list}>
        {/* Always show item 1 */}
        {ALL_ITEMS.filter(item => item.id === 'catat_pertama').map(item => (
          <ChecklistRow
            key={item.id}
            item={item}
            done={doneIds.has(item.id)}
            onAction={item.action}
            onDismiss={() => dismiss(item.id)}
          />
        ))}

        {/* Item 2-4 hanya muncul setelah catat_pertama done */}
        {firstItemDone && ALL_ITEMS
          .filter(item => item.id !== 'catat_pertama')
          .filter(item => !(item.id === 'tambah_dompet' && hasMultiWallet && !doneIds.has('tambah_dompet')))
          .map(item => (
            <ChecklistRow
              key={item.id}
              item={item}
              done={doneIds.has(item.id)}
              onAction={item.action}
              onDismiss={() => dismiss(item.id)}
            />
          ))
        }
      </ul>
    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

function ChecklistRow({
  item,
  done,
  onAction,
  onDismiss,
}: {
  item: ChecklistItem
  done: boolean
  onAction: () => void
  onDismiss: () => void
}) {
  return (
    <li className={`${styles.row} ${done ? styles.rowDone : ''}`}>
      <button
        className={`${styles.checkbox} ${done ? styles.checkboxDone : ''}`}
        onClick={done ? undefined : onAction}
        disabled={done}
        aria-label={done ? 'Selesai' : 'Mulai'}
      >
        {done && <Check size={12} strokeWidth={3} />}
      </button>

      <button
        className={`${styles.label} ${done ? styles.labelDone : ''}`}
        onClick={done ? undefined : onAction}
        disabled={done}
      >
        {item.label}
      </button>

      {!done && (
        <button
          className={styles.dismissBtn}
          onClick={onDismiss}
          aria-label="Lewati"
        >
          <X size={14} />
        </button>
      )}
    </li>
  )
}
