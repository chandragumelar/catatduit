// =============================================================================
// components/ui/PriorityBanner.tsx
// Variant "update": accent hijau, clickable.
// Variant "warning": amber, tidak clickable.
// Tidak dismissible. Hilang otomatis ketika kondisi resolved.
// =============================================================================

interface PriorityBannerProps {
  message: string
  onClick?: () => void
  variant?: 'update' | 'warning'
}

export function PriorityBanner({ message, onClick, variant = 'update' }: PriorityBannerProps) {
  const isWarning = variant === 'warning'

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      style={{
        background: isWarning ? '#92400e' : 'var(--accent)',
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
