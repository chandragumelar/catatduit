import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWallet } from '@/features/transaction/useWallet'
import { useWalletStore } from '@/features/transaction/wallet.store'
import { useTransactionStore } from '@/features/transaction/transaction.store'
import { TestClock } from '@/core/clock/TestClock'

const clock = new TestClock(new Date('2024-01-15T10:00:00Z'))

beforeEach(() => {
  useWalletStore.setState((s) => ({ ...s, wallets: [] }))
  useTransactionStore.setState((s) => ({ ...s, transactions: [] }))
})

describe('useWallet — create', () => {
  it('creates a wallet successfully', () => {
    const { result } = renderHook(() => useWallet(clock))
    let res: { success: boolean; error?: string }
    act(() => {
      res = result.current.create({ name: 'Dompet Harian', currencyCode: 'IDR', initialBalance: 100000 })
    })
    expect(res!.success).toBe(true)
    expect(result.current.wallets).toHaveLength(1)
    expect(result.current.wallets[0].name).toBe('Dompet Harian')
  })

  it('rejects empty name', () => {
    const { result } = renderHook(() => useWallet(clock))
    let res: { success: boolean; error?: string }
    act(() => {
      res = result.current.create({ name: '  ', currencyCode: 'IDR', initialBalance: 0 })
    })
    expect(res!.success).toBe(false)
    expect(res!.error).toBeTruthy()
  })

  it('rejects name longer than 30 chars', () => {
    const { result } = renderHook(() => useWallet(clock))
    let res: { success: boolean; error?: string }
    act(() => {
      res = result.current.create({ name: 'A'.repeat(31), currencyCode: 'IDR', initialBalance: 0 })
    })
    expect(res!.success).toBe(false)
  })

  it('rejects duplicate wallet name', () => {
    const { result } = renderHook(() => useWallet(clock))
    act(() => {
      result.current.create({ name: 'Dompet Harian', currencyCode: 'IDR', initialBalance: 0 })
    })
    let res: { success: boolean; error?: string }
    act(() => {
      res = result.current.create({ name: 'Dompet Harian', currencyCode: 'IDR', initialBalance: 0 })
    })
    expect(res!.success).toBe(false)
  })

  it('rejects more than 2 different currencies', () => {
    const { result } = renderHook(() => useWallet(clock))
    act(() => {
      result.current.create({ name: 'IDR Wallet', currencyCode: 'IDR', initialBalance: 0 })
      result.current.create({ name: 'USD Wallet', currencyCode: 'USD', initialBalance: 0 })
    })
    let res: { success: boolean; error?: string }
    act(() => {
      res = result.current.create({ name: 'EUR Wallet', currencyCode: 'EUR', initialBalance: 0 })
    })
    expect(res!.success).toBe(false)
  })

  it('rejects more than 10 wallets', () => {
    const { result } = renderHook(() => useWallet(clock))
    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.create({ name: `Dompet ${i}`, currencyCode: 'IDR', initialBalance: 0 })
      }
    })
    let res: { success: boolean; error?: string }
    act(() => {
      res = result.current.create({ name: 'Dompet 11', currencyCode: 'IDR', initialBalance: 0 })
    })
    expect(res!.success).toBe(false)
  })
})

describe('useWallet — remove', () => {
  it('prevents removing last wallet', () => {
    const { result } = renderHook(() => useWallet(clock))
    act(() => {
      result.current.create({ name: 'Satu-satunya', currencyCode: 'IDR', initialBalance: 0 })
    })
    let res: { success: boolean; error?: string }
    act(() => {
      const id = result.current.wallets[0].id
      res = result.current.remove(id)
    })
    expect(res!.success).toBe(false)
  })
})

describe('useWallet — balance', () => {
  it('returns initial balance when no transactions', () => {
    const { result } = renderHook(() => useWallet(clock))
    act(() => {
      result.current.create({ name: 'Dompet', currencyCode: 'IDR', initialBalance: 500000 })
    })
    const id = result.current.wallets[0].id
    expect(result.current.getWalletBalance(id)).toBe(500000)
  })

  it('returns 0 for unknown wallet', () => {
    const { result } = renderHook(() => useWallet(clock))
    expect(result.current.getWalletBalance('unknown-id')).toBe(0)
  })
})
