// =============================================================================
// hooks/useToast.ts
// =============================================================================

import { useState, useCallback } from 'react'

interface Toast {
  id: number
  message: string
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 2500)
  }, [])

  return { toasts, showToast }
}
