// =============================================================================
// components/layout/PageLayout.tsx
// Shell layout: priority banners (update + tagihan), page content, bottom nav, sheets
// =============================================================================

import { useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { PriorityBanner } from '@/components/ui/PriorityBanner'
import { InputBottomSheet } from '@/features/input/InputBottomSheet'
import { TransferBottomSheet } from '@/features/transfer/TransferBottomSheet'
import { getTagihan } from '@/storage'
import { getCurrentMonthKey, getTagihanWarnings, buildTagihanBannerMessage } from '@/lib/format'

interface PageLayoutProps {
  updateAvailable: boolean
  onApplyUpdate: () => void
}

export function PageLayout({ updateAvailable, onApplyUpdate }: PageLayoutProps) {
  const currentMonth = getCurrentMonthKey()

  const tagihanMessage = useMemo(() => {
    const tagihan = getTagihan()
    const warnings = getTagihanWarnings(tagihan, currentMonth)
    return buildTagihanBannerMessage(warnings)
  }, [currentMonth])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      {/* Update banner — selalu di atas, berdiri sendiri, actionable */}
      {updateAvailable && (
        <PriorityBanner
          message="Ada pembaruan tersedia. Ketuk untuk memperbarui."
          onClick={onApplyUpdate}
          variant="update"
        />
      )}
      {/* Tagihan banner — di bawah update, tidak clickable */}
      {tagihanMessage && (
        <PriorityBanner
          message={tagihanMessage}
          variant="warning"
        />
      )}
      <main style={{ flex: 1, paddingBottom: 'var(--bottom-nav-height)' }}>
        <Outlet />
      </main>
      <BottomNav />
      {/* Bottom sheets — render di luar <main> agar z-index tidak terjepit */}
      <InputBottomSheet />
      <TransferBottomSheet />
    </div>
  )
}
