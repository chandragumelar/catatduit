import type { Clock } from '@/core/clock/Clock'
import { RealClock } from '@/core/clock/RealClock'
import { useTransactionStore } from '@/features/transaction/transaction.store'
import { useWalletStore } from '@/features/transaction/wallet.store'
import { isValidAmount, isNonEmptyString } from '@/core/utils/validation'
import type { Transaction, TransactionType } from '@/features/transaction/transaction.types'

interface CreateTransactionInput {
  type: TransactionType
  walletId: string
  categoryId: string | null
  amount: number
  notes: string
  date: string
}

export function useTransaction(clock: Clock = new RealClock()) {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } =
    useTransactionStore()
  const { wallets } = useWalletStore()

  const validate = (input: CreateTransactionInput): string | null => {
    if (!isNonEmptyString(input.walletId)) return 'Pilih dompet dulu'
    if (!wallets.find((w) => w.id === input.walletId)) return 'Dompet tidak ditemukan'
    if (!isValidAmount(input.amount)) return 'Nominal harus lebih dari 0'
    if (input.type !== 'savings' && !input.categoryId) return 'Pilih kategori'
    if (!isNonEmptyString(input.date)) return 'Tanggal tidak valid'
    return null
  }

  const create = (input: CreateTransactionInput): { success: boolean; error?: string } => {
    const error = validate(input)
    if (error) return { success: false, error }

    const now = clock.now().toISOString()
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      type: input.type,
      walletId: input.walletId,
      categoryId: input.categoryId,
      amount: input.amount,
      notes: input.notes.trim(),
      date: input.date,
      createdAt: now,
      updatedAt: now,
      aiCategory: null,
      categoryConfidence: null,
    }

    addTransaction(transaction)
    return { success: true }
  }

  const update = (
    id: string,
    input: Partial<CreateTransactionInput>
  ): { success: boolean; error?: string } => {
    if (input.amount !== undefined && !isValidAmount(input.amount)) {
      return { success: false, error: 'Nominal harus lebih dari 0' }
    }

    updateTransaction(id, input)
    return { success: true }
  }

  const remove = (id: string) => deleteTransaction(id)

  const getByDate = (date: string): Transaction[] => {
    return transactions
      .filter((t) => t.date === date)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  const getByPeriod = (
    startDate: string,
    endDate: string,
    currencyCode: string
  ): Transaction[] => {
    const walletIds = new Set(
      wallets.filter((w) => w.currencyCode === currencyCode).map((w) => w.id)
    )
    return transactions
      .filter(
        (t) => t.date >= startDate && t.date <= endDate && walletIds.has(t.walletId)
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  }

  const getCashflow = (
    startDate: string,
    endDate: string,
    currencyCode: string
  ): { income: number; expense: number } => {
    const periodTxs = getByPeriod(startDate, endDate, currencyCode)
    return {
      income: periodTxs
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
      expense: periodTxs
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    }
  }

  return {
    transactions,
    create,
    update,
    remove,
    getByDate,
    getByPeriod,
    getCashflow,
  }
}
