import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gear } from '@phosphor-icons/react'
import { useWallet } from '@/features/transaction/useWallet'
import { useTransaction } from '@/features/transaction/useTransaction'
import { useUserProfileStore } from '@/features/onboarding/store/userProfile.store'
import { useUIStore } from '@/stores/ui.store'
import { useClock } from '@/App'
import { getMonthBoundary, toISODate } from '@/core/utils/date'
import { formatAmount } from '@/core/utils/currency'
import GreetingCard from './cards/GreetingCard'
import CurrencyFilterPill from './cards/CurrencyFilterPill'
import NetWorthCard from './cards/NetWorthCard'
import CashflowCard from './cards/CashflowCard'
import DailyActivityCard from './cards/DailyActivityCard'
import BudgetSummaryCard from './cards/BudgetSummaryCard'
import SavingsCard from './cards/SavingsCard'
import RecentTransactionsCard from './cards/RecentTransactionsCard'
import MonthlySummaryCard from './cards/MonthlySummaryCard'
import SupportCard from './cards/SupportCard'
import styles from './HomePage.module.css'

export default function HomePage() {
  const navigate = useNavigate()
  const clock = useClock()
  const profile = useUserProfileStore((s) => s.profile)
  const { activeCurrency, setActiveCurrency } = useUIStore()
  const { wallets, getWalletBalance, getTotalBalance, getActiveCurrencies } = useWallet(clock)
  const { transactions, getCashflow, getByDate } = useTransaction(clock)

  const activeCurrencies = getActiveCurrencies()
  const showCurrencyFilter = activeCurrencies.length >= 2

  const { start, end } = getMonthBoundary(clock)
  const startStr = toISODate(start)
  const endStr = toISODate(end)
  const todayStr = toISODate(clock.now())

  const cashflow = useMemo(
    () => getCashflow(startStr, endStr, activeCurrency),
    [transactions, startStr, endStr, activeCurrency]
  )

  const todayTransactions = useMemo(
    () => getByDate(todayStr),
    [transactions, todayStr]
  )

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .filter((t) => {
          const wallet = wallets.find((w) => w.id === t.walletId)
          return wallet?.currencyCode === activeCurrency
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 4),
    [transactions, activeCurrency, wallets]
  )

  const totalBalance = getTotalBalance(activeCurrency)
  const relevantWallets = wallets.filter((w) => w.currencyCode === activeCurrency)

  function fmt(n: number) {
    return formatAmount(n, activeCurrency)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <GreetingCard nickname={profile?.nickname ?? 'kamu'} clock={clock} />
        <button
          className={styles.settingsBtn}
          onClick={() => navigate('/settings')}
          aria-label="Pengaturan"
        >
          <Gear size={20} />
        </button>
      </div>

      <div className={styles.section}>
        {showCurrencyFilter && (
          <CurrencyFilterPill
            currencies={activeCurrencies}
            active={activeCurrency}
            onChange={setActiveCurrency}
          />
        )}

        <NetWorthCard
          totalBalance={totalBalance}
          wallets={relevantWallets}
          getWalletBalance={getWalletBalance}
          fmt={fmt}
        />

        <CashflowCard
          income={cashflow.income}
          expense={cashflow.expense}
          fmt={fmt}
        />

        <DailyActivityCard
          transactions={todayTransactions}
          wallets={wallets}
          fmt={fmt}
        />

        <BudgetSummaryCard
          activeCurrency={activeCurrency}
          transactions={transactions}
          wallets={wallets}
          startStr={startStr}
          endStr={endStr}
          fmt={fmt}
          onNavigate={() => navigate('/planning')}
        />

        <SavingsCard onNavigate={() => navigate('/planning')} />

        <RecentTransactionsCard
          transactions={recentTransactions}
          wallets={wallets}
          fmt={fmt}
        />

        <MonthlySummaryCard
          income={cashflow.income}
          expense={cashflow.expense}
          fmt={fmt}
        />

        <SupportCard />
      </div>
    </div>
  )
}
