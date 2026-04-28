import styles from './CurrencyFilterPill.module.css'

interface Props {
  currencies: string[]
  active: string
  onChange: (currency: string) => void
}

export default function CurrencyFilterPill({ currencies, active, onChange }: Props) {
  return (
    <div className={styles.wrap}>
      {currencies.slice(0, 2).map((currency) => (
        <button
          key={currency}
          className={currency === active ? styles.pillActive : styles.pill}
          onClick={() => onChange(currency)}
        >
          {currency}
        </button>
      ))}
    </div>
  )
}
