import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboarding } from './store/useOnboarding'
import { useOnboardingStore } from './store/onboarding.store'
import IntroSlider from './components/IntroSlider'
import NicknameStep from './components/NicknameStep'
import SetupWalletStep from './components/SetupWalletStep'
import SetBalanceStep from './components/SetBalanceStep'
import styles from './OnboardingPage.module.css'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { isDone } = useOnboardingStore()
  const onboarding = useOnboarding()

  useEffect(() => {
    if (isDone) navigate('/', { replace: true })
  }, [isDone, navigate])

  useEffect(() => {
    if (onboarding.step === 'done') navigate('/', { replace: true })
  }, [onboarding.step, navigate])

  return (
    <div className={styles.container}>
      {onboarding.step === 'intro' && (
        <IntroSlider onNext={onboarding.goNext} />
      )}
      {onboarding.step === 'nickname' && (
        <NicknameStep
          nickname={onboarding.nickname}
          error={onboarding.nicknameError}
          onChange={onboarding.setNickname}
          onNext={onboarding.goNext}
          onBack={onboarding.goBack}
        />
      )}
      {onboarding.step === 'setup-wallet' && (
        <SetupWalletStep
          walletDrafts={onboarding.walletDrafts}
          walletErrors={onboarding.walletErrors}
          canAddMoreCurrencies={onboarding.canAddMoreCurrencies()}
          onAdd={onboarding.addWalletDraft}
          onRemove={onboarding.removeWalletDraft}
          onUpdate={onboarding.updateWalletDraft}
          onNext={onboarding.goNext}
          onBack={onboarding.goBack}
        />
      )}
      {onboarding.step === 'set-balance' && (
        <SetBalanceStep
          walletDrafts={onboarding.walletDrafts}
          onUpdate={onboarding.updateWalletDraft}
          onNext={onboarding.goNext}
          onBack={onboarding.goBack}
        />
      )}
    </div>
  )
}
