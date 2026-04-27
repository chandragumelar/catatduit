import type { Clock } from '@/core/clock/Clock'
import { RealClock } from '@/core/clock/RealClock'
import { useWalletStore } from '@/features/transaction/wallet.store'
import { useTransactionStore } from '@/features/transaction/transaction.store'
import { isValidCurrencyCode, isNonEmptyString } from '@/core/utils/validation'
import type { Wallet } from '@/features/transaction/transaction.types'

interface CreateWalletInput {
  name: string
  currencyCode: string
  initialBalance: number
}

interface UpdateWalletInput {
  name?: string
  initialBalance?: number
}

export function useWallet(clock: Clock = new RealClock()) {
  const { wallets, addWallet, updateWallet, removeWallet } = useWalletStore()
  const { transactions } = useTransactionStore()

  const getWalletBalance = (walletId: string): number => {
    const wallet = wallets.find((w) => w.id === walletId)
    if (!wallet) return 0

    const walletTxs = transactions.filter((t) => t.walletId === walletId)
    const income = walletTxs
      .filter((t) => t.type === 'income' || t.type === 'savings')
      .reduce((sum, t) => sum + t.amount, 0)
    const expense = walletTxs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    return wallet.initialBalance + income - expense
  }

  const getTotalBalance = (currencyCode: string): number => {
    return wallets
      .filter((w) => w.currencyCode === currencyCode)
      .reduce((sum, w) => sum + getWalletBalance(w.id), 0)
  }

  const getActiveCurrencies = (): string[] => {
    return [...new Set(wallets.map((w) => w.currencyCode))]
  }

  const create = (input: CreateWalletInput): { success: boolean; error?: string } => {
    if (!isNonEmptyString(input.name)) {
      return { success: false, error: 'Nama dompet tidak boleh kosong' }
    }
    if (input.name.trim().length > 30) {
      return { success: false, error: 'Nama dompet maksimal 30 karakter' }
    }
    if (!isValidCurrencyCode(input.currencyCode)) {
      return { success: false, error: 'Mata uang tidak valid' }
    }
    if (input.initialBalance < 0) {
      return { success: false, error: 'Saldo awal tidak boleh negatif' }
    }

    const now = clock.now().toISOString()
    const wallet: Wallet = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      currencyCode: input.currencyCode,
      initialBalance: input.initialBalance,
      createdAt: now,
      updatedAt: now,
    }

    return addWallet(wallet)
  }

  const update = (id: string, input: UpdateWalletInput): { success: boolean; error?: string } => {
    if (input.name !== undefined) {
      if (!isNonEmptyString(input.name)) {
        return { success: false, error: 'Nama dompet tidak boleh kosong' }
      }
      if (input.name.trim().length > 30) {
        return { success: false, error: 'Nama dompet maksimal 30 karakter' }
      }
    }

    updateWallet(id, {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.initialBalance !== undefined ? { initialBalance: input.initialBalance } : {}),
    })
    return { success: true }
  }

  const remove = (id: string) => removeWallet(id)

  return {
    wallets,
    getWalletBalance,
    getTotalBalance,
    getActiveCurrencies,
    create,
    update,
    remove,
  }
}
