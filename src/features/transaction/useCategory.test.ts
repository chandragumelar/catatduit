import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCategory } from '@/features/transaction/useCategory'
import { useCategoryStore } from '@/features/transaction/category.store'
import { TestClock } from '@/core/clock/TestClock'

const clock = new TestClock(new Date('2024-01-15T10:00:00Z'))

beforeEach(() => {
  useCategoryStore.setState((s) => ({ ...s, categories: [] }))
})

describe('useCategory — init', () => {
  it('initializes default categories', () => {
    const { result } = renderHook(() => useCategory(clock))
    act(() => { result.current.init() })
    expect(result.current.categories.length).toBeGreaterThan(0)
  })

  it('does not reinitialize if categories exist', () => {
    const { result } = renderHook(() => useCategory(clock))
    act(() => { result.current.init() })
    const count = result.current.categories.length
    act(() => { result.current.init() })
    expect(result.current.categories.length).toBe(count)
  })
})

describe('useCategory — create', () => {
  it('creates a custom category', () => {
    const { result } = renderHook(() => useCategory(clock))
    let res: { success: boolean; error?: string }
    act(() => {
      res = result.current.create({ name: 'Kopi', icon: 'Coffee', type: 'expense' })
    })
    expect(res!.success).toBe(true)
  })

  it('rejects empty name', () => {
    const { result } = renderHook(() => useCategory(clock))
    let res: { success: boolean; error?: string }
    act(() => {
      res = result.current.create({ name: '', icon: 'Coffee', type: 'expense' })
    })
    expect(res!.success).toBe(false)
  })

  it('rejects duplicate name in same type', () => {
    const { result } = renderHook(() => useCategory(clock))
    act(() => {
      result.current.create({ name: 'Kopi', icon: 'Coffee', type: 'expense' })
    })
    let res: { success: boolean; error?: string }
    act(() => {
      res = result.current.create({ name: 'Kopi', icon: 'Coffee', type: 'expense' })
    })
    expect(res!.success).toBe(false)
  })

  it('allows same name in different type', () => {
    const { result } = renderHook(() => useCategory(clock))
    act(() => {
      result.current.create({ name: 'Lainnya', icon: 'DotsThree', type: 'expense' })
    })
    let res: { success: boolean; error?: string }
    act(() => {
      res = result.current.create({ name: 'Lainnya', icon: 'DotsThree', type: 'income' })
    })
    expect(res!.success).toBe(true)
  })
})

describe('useCategory — remove', () => {
  it('prevents removing default category', () => {
    const { result } = renderHook(() => useCategory(clock))
    act(() => { result.current.init() })
    const defaultCat = result.current.categories.find((c) => c.isDefault)!
    let res: { success: boolean; error?: string }
    act(() => {
      res = result.current.remove(defaultCat.id)
    })
    expect(res!.success).toBe(false)
  })

  it('allows removing custom category', () => {
    const { result } = renderHook(() => useCategory(clock))
    act(() => {
      result.current.create({ name: 'Kopi', icon: 'Coffee', type: 'expense' })
    })
    const custom = result.current.categories.find((c) => !c.isDefault)!
    let res: { success: boolean; error?: string }
    act(() => {
      res = result.current.remove(custom.id)
    })
    expect(res!.success).toBe(true)
  })
})
