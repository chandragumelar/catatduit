// =============================================================================
// components/ui/PriorityBanner.tsx
// Dipakai untuk: update tersedia, budget jebol, tagihan jatuh tempo.
// Tidak dismissible. Hilang otomatis ketika kondisi resolved.
// =============================================================================

interface PriorityBannerProps {
  message: string
  onClick?: () => void
}

export function PriorityBanner({ message, onClick }: PriorityBannerProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      style={{
        background: 'var(--accent)',
        color: '#fff',
        padding: '10px var(--page-padding-x)',
        fontSize: 14,
        lineHeight: 1.4,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {message}
    </div>
  )
}
