import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import {
  Checkbox as AriaCheckbox,
  type CheckboxProps as AriaCheckboxProps,
} from 'react-aria-components'

import { cx } from '@/lib/cx'

export default function Checkbox({
  children,
  className,
  ...props
}: AriaCheckboxProps & { children: ReactNode; className?: string }) {
  return (
    <AriaCheckbox
      className={cx(
        'group focus-visible:outline-bc-focus inline-flex cursor-pointer items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2',
        className,
      )}
      {...props}
    >
      <span className="border-bc-border-dark group-data-[selected]:bg-bc-button-primary flex size-5 items-center justify-center rounded-sm border text-white">
        <Check
          aria-hidden="true"
          className="hidden size-4 group-data-[selected]:block"
        />
      </span>
      {children}
    </AriaCheckbox>
  )
}
