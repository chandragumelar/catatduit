import type { Category } from '@/features/transaction/transaction.types'

export const DEFAULT_CATEGORIES: Omit<Category, 'createdAt' | 'updatedAt'>[] = [
  // Expense
  { id: 'cat-food', name: 'Makanan & Minuman', icon: 'ForkKnife', type: 'expense', isDefault: true },
  { id: 'cat-transport', name: 'Transportasi', icon: 'Car', type: 'expense', isDefault: true },
  { id: 'cat-shopping', name: 'Belanja', icon: 'ShoppingBag', type: 'expense', isDefault: true },
  { id: 'cat-bills', name: 'Tagihan & Utilitas', icon: 'Receipt', type: 'expense', isDefault: true },
  { id: 'cat-health', name: 'Kesehatan', icon: 'FirstAid', type: 'expense', isDefault: true },
  { id: 'cat-entertainment', name: 'Hiburan', icon: 'GameController', type: 'expense', isDefault: true },
  { id: 'cat-education', name: 'Pendidikan', icon: 'GraduationCap', type: 'expense', isDefault: true },
  { id: 'cat-family', name: 'Keluarga', icon: 'Users', type: 'expense', isDefault: true },
  { id: 'cat-installment', name: 'Cicilan', icon: 'CreditCard', type: 'expense', isDefault: true },
  { id: 'cat-other-expense', name: 'Lainnya', icon: 'DotsThree', type: 'expense', isDefault: true },
  // Income
  { id: 'cat-salary', name: 'Gaji', icon: 'Money', type: 'income', isDefault: true },
  { id: 'cat-freelance', name: 'Freelance', icon: 'Briefcase', type: 'income', isDefault: true },
  { id: 'cat-business', name: 'Bisnis', icon: 'Storefront', type: 'income', isDefault: true },
  { id: 'cat-transfer-in', name: 'Transfer Masuk', icon: 'ArrowDownLeft', type: 'income', isDefault: true },
  { id: 'cat-other-income', name: 'Lainnya', icon: 'DotsThree', type: 'income', isDefault: true },
]
