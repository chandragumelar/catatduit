// =============================================================================
// storage/storage.kategori.ts
// =============================================================================

import type { KategoriMap } from '@/types'
import { STORAGE_KEYS, KATEGORI_DEFAULT } from '@/constants'
import { getData, setData } from './storage.base'

export function getKategori(): KategoriMap {
  return getData<KategoriMap>(STORAGE_KEYS.KATEGORI, structuredClone(KATEGORI_DEFAULT))
}

export function saveKategori(data: KategoriMap): boolean {
  return setData(STORAGE_KEYS.KATEGORI, data)
}
