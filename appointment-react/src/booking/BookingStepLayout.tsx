import type { RefObject } from 'react'

import Button from '@/components/Button'
import InlineError from '@/components/InlineError'

export function StepHeader({
  headingRef,
  subtitle,
  title,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>
  subtitle?: string
  title: string
}) {
  return (
    <header className="px-4 py-5 text-left">
      <h2
        className="bc-heading m-0 outline-none"
        id="booking-heading"
        ref={headingRef}
        tabIndex={-1}
      >
        {title}
      </h2>
      {subtitle && <p className="text-bc-secondary mb-0">{subtitle}</p>}
    </header>
  )
}

export function RequestError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-start gap-3 py-6">
      <InlineError>{message}</InlineError>
      <Button onClick={onRetry} variant="secondary">
        Try again
      </Button>
    </div>
  )
}
