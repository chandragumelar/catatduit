// =============================================================================
// components/layout/FAB.tsx
// Floating Action Button — buka InputBottomSheet
// =============================================================================

import { Plus } from 'lucide-react'
import { useInputStore } from '@/store/input.store'

export function FAB() {
  const open = useInputStore(s => s.open)

  return (
    <button
      aria-label="Catat transaksi"
      onClick={() => open('keluar')}
      style={{
        width: 'var(--fab-size)',
        height: 'var(--fab-size)',
        borderRadius: 'var(--radius-full)',
        background: 'var(--accent)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(15, 123, 108, 0.35)',
        flexShrink: 0,
        // tap animation via CSS active pseudo
      }}
      // inline active scale tidak bisa via CSS module karena FAB pakai inline style
      // gunakan onPointerDown / onPointerUp untuk tap feedback
      onPointerDown={e => {
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)'
      }}
      onPointerUp={e => {
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
      }}
      onPointerLeave={e => {
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
      }}
    >
      <Plus size={24} color="#ffffff" strokeWidth={2.5} />
    </button>
  )
}
