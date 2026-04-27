import type { StorageAdapter } from './StorageAdapter'
import { AppError, ERROR_CODES } from '@/core/errors/AppError'

export class LocalStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return null
      return JSON.parse(raw) as T
    } catch {
      throw new AppError(`Failed to read key: ${key}`, ERROR_CODES.STORAGE_READ_FAILED, { key })
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      throw new AppError(`Failed to write key: ${key}`, ERROR_CODES.STORAGE_WRITE_FAILED, { key })
    }
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(key)
  }

  async clear(): Promise<void> {
    const keysToRemove = Object.keys(localStorage).filter((k) => k.startsWith('cd_'))
    keysToRemove.forEach((k) => localStorage.removeItem(k))
  }
}
