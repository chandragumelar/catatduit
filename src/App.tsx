import { createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RealClock } from '@/core/clock/RealClock'
import type { Clock } from '@/core/clock/Clock'
import { useOnboardingStore } from '@/features/onboarding/store/onboarding.store'
import HomePage from '@/features/home/HomePage'
import PlanningPage from '@/features/planning/PlanningPage'
import InsightPage from '@/features/insight/InsightPage'
import SettingsPage from '@/features/settings/SettingsPage'
import OnboardingPage from '@/features/onboarding/OnboardingPage'
import BottomNav from '@/components/BottomNav/BottomNav'

const ClockContext = createContext<Clock>(new RealClock())
export const useClock = () => useContext(ClockContext)

export default function App() {
  return (
    <ClockContext.Provider value={new RealClock()}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ClockContext.Provider>
  )
}

function AppRoutes() {
  const isOnboardingDone = useOnboardingStore((s) => s.isDone)

  if (!isOnboardingDone) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    )
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/planning" element={<PlanningPage />} />
        <Route path="/insight" element={<InsightPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </>
  )
}
