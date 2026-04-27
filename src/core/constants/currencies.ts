export interface CurrencyDefinition {
  code: string
  symbol: string
  name: string
}

export const SUPPORTED_CURRENCIES: CurrencyDefinition[] = [
  { code: 'IDR', symbol: 'Rp', name: 'Rupiah Indonesia' },
  { code: 'USD', symbol: '$', name: 'Dolar Amerika' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'Poundsterling Inggris' },
  { code: 'AUD', symbol: 'A$', name: 'Dolar Australia' },
  { code: 'SGD', symbol: 'S$', name: 'Dolar Singapura' },
  { code: 'MYR', symbol: 'RM', name: 'Ringgit Malaysia' },
  { code: 'JPY', symbol: '¥', name: 'Yen Jepang' },
  { code: 'CNY', symbol: '¥', name: 'Yuan China' },
  { code: 'SAR', symbol: '﷼', name: 'Riyal Arab Saudi' },
]

export const getCurrency = (code: string): CurrencyDefinition | undefined =>
  SUPPORTED_CURRENCIES.find((c) => c.code === code)
