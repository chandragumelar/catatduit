export type TransactionType = 'expense' | 'income' | 'savings'

export interface Transaction {
  id: string
  type: TransactionType
  walletId: string
  categoryId: string | null
  amount: number
  notes: string
  date: string
  createdAt: string
  updatedAt: string
  aiCategory: string | null
  categoryConfidence: number | null
}

export interface Category {
  id: string
  name: string
  icon: string
  type: 'expense' | 'income'
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface Wallet {
  id: string
  name: string
  currencyCode: string
  initialBalance: number
  createdAt: string
  updatedAt: string
}

export interface Budget {
  id: string
  categoryId: string
  amount: number
  periodType: 'weekly' | 'monthly'
  currencyCode: string
  createdAt: string
  updatedAt: string
}

export interface Bill {
  id: string
  name: string
  amount: number
  currencyCode: string
  isRecurring: boolean
  frequency: 'weekly' | 'monthly' | 'yearly' | null
  dueDate: string
  isPaid: boolean
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currencyCode: string
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  id: string
  nickname: string
  avatarStyle: 'bottts' | 'dylan'
  avatarSeed: string
  createdAt: string
  updatedAt: string
}

export type PeriodType = 'weekly' | 'monthly'

export interface AppSettings {
  activeCurrency: string
  activePeriodType: PeriodType
  pushNotifEnabled: boolean
  pushNotifTime: string
  pushNotifSubscription: unknown | null
}

export interface OnboardingState {
  isDone: boolean
  completedAt: string | null
}

export interface NudgeState {
  hasFirstTransaction: boolean
  hasFirstBill: boolean
  hasFirstSavingsGoal: boolean
  isDismissed: boolean
}
