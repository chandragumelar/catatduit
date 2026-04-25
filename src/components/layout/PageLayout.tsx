// =============================================================================
// components/layout/PageLayout.tsx
// Shell layout: header, priority banner, page content, bottom nav, FAB, input sheet
// =============================================================================

import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { PriorityBanner } from '@/components/ui/PriorityBanner'
import { InputBottomSheet } from '@/features/input/InputBottomSheet'

interface PageLayoutProps {
  updateAvailable: boolean
  onApplyUpdate: () => void
}

export function PageLayout({ updateAvailable, onApplyUpdate }: PageLayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      {updateAvailable && (
        <PriorityBanner
          message="Ada pembaruan tersedia. Ketuk untuk memperbarui."
          onClick={onApplyUpdate}
        />
      )}
      <main style={{ flex: 1, paddingBottom: 'var(--bottom-nav-height)' }}>
        <Outlet />
      </main>
      <BottomNav />
      {/* Input sheet — render di luar <main> agar z-index tidak terjepit */}
      <InputBottomSheet />
    </div>
  )
}
