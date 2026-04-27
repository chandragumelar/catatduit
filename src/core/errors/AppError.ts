export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const ERROR_CODES = {
  STORAGE_READ_FAILED: 'STORAGE_READ_FAILED',
  STORAGE_WRITE_FAILED: 'STORAGE_WRITE_FAILED',
  MAX_WALLETS_REACHED: 'MAX_WALLETS_REACHED',
  MAX_CURRENCIES_REACHED: 'MAX_CURRENCIES_REACHED',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  AUTH_FAILED: 'AUTH_FAILED',
} as const
