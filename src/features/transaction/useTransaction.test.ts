import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTransaction } from '@/features/transaction/useTransaction'
import { useTransactionStore } from '@/features/transaction/transaction.store'
import { useWalletStore } from '@/features/transaction/wallet.store'
import { TestClock } from '@/core/clock/TestClock'
import type { Wallet } from '@/features/transaction/transaction.types'

const clock = new TestClock(new Date('2024-01-15T10:00:00Z'))

const mockWallet: Wallet = {
  id: 'wallet-1',
  name: 'Dompet Test',
  currencyCode: 'IDR',
  initialBalance: 500000,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

beforeEach(() => {
  useTransactionStore.setState((s) => ({ ...s, transactions: [] }))
  useWalletStore.setState((s) => ({ ...s, wallets: [mockWallet] }))
})

describe('useTransaction — create', () => {
  it('creates expense transaction', () => {
    const { result } = renderHook(() => useTransaction(clock))
    let res: { success: boolean; error?: string }
    act(() => {
      res = result.current.create({
        type: 'expense', walletId: 'wallet-1', categoryId: 'cat-food',
        amount: 25000, notes: 'makan siang', date: '2024-01-15',
      })
    })
    expect(res!.success).toBe(true)
    expect(result.current.transactions).toHaveLength(1)
    expect(result.current.transactions[0].type).toBe('expense')
  })

  it('rejects zero amount', () => {
    const { result } = renderHook(() => useTransaction(clock))
    let res: { success: boolean; error?: string }
    act(() => {
      res = result.current.create({
        type: 'expense', walletId: 'wallet-1', categoryId: 'cat-food',
        amount: 0, notes: '', date: '2024-01-15',
      })
    })
    expect(res!.success).toBe(false)
  })

  it('rejects negative amount', () => {
    const { result } = renderHook(() => useTransaction(clock))
    let res: { success: boolean; error?: string }
    act(() => {
      res = result.current.create({
        type: 'expense', walletId: 'wallet-1', categoryId: 'cat-food',
        amount: -1000, notes: '', date: '2024-01-15',
      })
    })
    expect(res!.success).toBe(false)
  })

  it('rejects expense without category', () => {
    const { result } = renderHook(() => useTransaction(clock))
    let res: { success: boolean; error?: string }
    act(() => {
      res = result.current.create({
        type: 'expense', walletId: 'wallet-1', categoryId: null,
        amount: 10000, notes: '', date: '2024-01-15',
      })
    })
    expect(res!.success).toBe(false)
  })

  it('allows savings without category', () => {
    const { result } = renderHook(() => useTransaction(clock))
    let res: { success: boolean; error?: string }
    act(() => {
      res = result.current.create({
        type: 'savings', walletId: 'wallet-1', categoryId: null,
        amount: 100000, notes: 'tabungan bulanan', date: '2024-01-15',
      })
    })
    expect(res!.success).toBe(true)
  })

  it('rejects unknown wallet', () => {
    const { result } = renderHook(() => useTransaction(clock))
    let res: { success: boolean; error?: string }
    act(() => {
      res = result.current.create({
        type: 'expense', walletId: 'unknown', categoryId: 'cat-food',
        amount: 10000, notes: '', date: '2024-01-15',
      })
    })
    expect(res!.success).toBe(false)
  })
})

describe('useTransaction — getByDate', () => {
  it('returns transactions for a specific date', () => {
    const { result } = renderHook(() => useTransaction(clock))
    act(() => {
      result.current.create({
        type: 'expense', walletId: 'wallet-1', categoryId: 'cat-food',
        amount: 10000, notes: '', date: '2024-01-15',
      })
      result.current.create({
        type: 'expense', walletId: 'wallet-1', categoryId: 'cat-food',
        amount: 20000, notes: '', date: '2024-01-14',
      })
    })
    expect(result.current.getByDate('2024-01-15')).toHaveLength(1)
    expect(result.current.getByDate('2024-01-14')).toHaveLength(1)
    expect(result.current.getByDate('2024-01-13')).toHaveLength(0)
  })
})

describe('useTransaction — getCashflow', () => {
  it('calculates income and expense correctly', () => {
    const { result } = renderHook(() => useTransaction(clock))
    act(() => {
      result.current.create({
        type: 'income', walletId: 'wallet-1', categoryId: 'cat-salary',
        amount: 5000000, notes: 'gaji', date: '2024-01-01',
      })
      result.current.create({
        type: 'expense', walletId: 'wallet-1', categoryId: 'cat-food',
        amount: 200000, notes: '', date: '2024-01-10',
      })
    })
    const cashflow = result.current.getCashflow('2024-01-01', '2024-01-31', 'IDR')
    expect(cashflow.income).toBe(5000000)
    expect(cashflow.expense).toBe(200000)
  })
})
