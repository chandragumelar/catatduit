// =============================================================================
// storage/storage.tagihan.ts
// =============================================================================

import type { Tagihan } from '@/types'
import { STORAGE_KEYS } from '@/constants'
import { getData, setData } from './storage.base'

export function getTagihan(): Tagihan[] {
  return getData<Tagihan[]>(STORAGE_KEYS.TAGIHAN, [])
}

export function saveTagihan(data: Tagihan[]): boolean {
  return setData(STORAGE_KEYS.TAGIHAN, data)
}
