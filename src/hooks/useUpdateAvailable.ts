// =============================================================================
// hooks/useUpdateAvailable.ts
// Deteksi Service Worker update dan expose applyUpdate().
// Dipakai di App.tsx → PriorityBanner.
// =============================================================================

import { useEffect, useState, useCallback } from 'react'

interface UpdateAvailable {
  updateAvailable: boolean
  applyUpdate: () => void
}

export function useUpdateAvailable(): UpdateAvailable {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleControllerChange = () => {
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    navigator.serviceWorker.ready.then(registration => {
      // Kalau ada SW yang waiting saat pertama load
      if (registration.waiting) {
        setWaitingWorker(registration.waiting)
      }

      // Dengarkan update baru
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker)
          }
        })
      })
    })

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  const applyUpdate = useCallback(() => {
    if (!waitingWorker) return
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }, [waitingWorker])

  return {
    updateAvailable: waitingWorker !== null,
    applyUpdate,
  }
}
