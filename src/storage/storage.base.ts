// =============================================================================
// storage/storage.base.ts
// Primitif localStorage: getData, setData, clearData.
// Semua storage.*.ts import dari sini, bukan akses localStorage langsung.
// =============================================================================

export function getData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function setData<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      // Toast dipanggil dari layer atas, bukan di sini
      console.error('[storage] QuotaExceededError')
    }
    return false
  }
}

export function removeData(key: string): void {
  localStorage.removeItem(key)
}

export function clearAllData(): void {
  localStorage.clear()
}
