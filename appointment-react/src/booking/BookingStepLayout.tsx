import type { RefObject } from 'react'
import { ArrowLeft } from 'lucide-react'

import Button from '@/components/Button'
import InlineError from '@/components/InlineError'

export function StepHeader({
  headingRef,
  onBack,
  subtitle,
  title,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>
  onBack?: () => void
  subtitle?: string
  title: string
}) {
  return (
    <header className="border-bc-border relative border-b px-4 py-5 text-center">
      {onBack && (
        <Button
          aria-label="Back"
          className="mb-3 sm:absolute sm:top-4 sm:left-4 sm:mb-0"
          onClick={onBack}
          variant="tertiary"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
          Back
        </Button>
      )}
      <h3
        className="text-bc-h4 m-0 outline-none"
        ref={headingRef}
        tabIndex={-1}
      >
        {title}
      </h3>
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
    <div className="flex flex-col items-center gap-3 py-6">
      <InlineError>{message}</InlineError>
      <Button onClick={onRetry} variant="secondary">
        Try again
      </Button>
    </div>
  )
}
