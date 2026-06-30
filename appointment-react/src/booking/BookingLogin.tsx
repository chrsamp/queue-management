import { useEffect, type RefObject } from 'react'

import { useAuth } from '@/auth/use-auth'
import { StepHeader } from '@/booking/BookingStepLayout'
import LoginChoices from '@/booking/LoginChoices'
import AlertBanner from '@/components/AlertBanner'
import LoadingIndicator from '@/components/LoadingIndicator'
import type { RuntimeConfig } from '@/config/runtime-config'
import { useBookingStore } from '@/store/booking-store'

export default function BookingLogin({
  config,
  headingRef,
}: {
  config: RuntimeConfig
  headingRef: RefObject<HTMLHeadingElement | null>
}) {
  const auth = useAuth()
  const setCurrentStep = useBookingStore((state) => state.setCurrentStep)

  useEffect(() => {
    if (auth.authenticated && auth.authorized) setCurrentStep('summary')
  }, [auth.authenticated, auth.authorized, setCurrentStep])

  return (
    <>
      <StepHeader
        headingRef={headingRef}
        onBack={() => setCurrentStep('date')}
        subtitle="To complete your appointment booking, please login using one of the following."
        title="Login"
      />
      <div className="mx-auto max-w-2xl p-6">
        {!auth.initialized && <LoadingIndicator label="Checking login" />}
        {auth.authenticated && !auth.authorized && (
          <AlertBanner isCloseable={false} role="alert" variant="danger">
            Your account does not have access to the appointment application.
          </AlertBanner>
        )}
        {auth.initialized && !auth.authenticated && (
          <LoginChoices config={config} />
        )}
      </div>
    </>
  )
}
