import type { ReactNode } from 'react'
import {
  Dialog as ReactAriaDialog,
  DialogTrigger,
  type DialogProps as ReactAriaDialogProps,
} from 'react-aria-components'

import { cx } from '@/lib/cx'

import Button from './Button'

export interface DialogProps extends Omit<
  ReactAriaDialogProps,
  'children' | 'className'
> {
  children?: ReactNode
  className?: string
  isCloseable?: boolean
}

export default function Dialog({
  children,
  className,
  isCloseable = true,
  role = 'dialog',
  ...props
}: DialogProps) {
  return (
    <ReactAriaDialog
      className={cx('relative flex min-h-20 flex-col p-6', className)}
      role={role}
      {...props}
    >
      {({ close }) => (
        <>
          {isCloseable && (
            <Button
              aria-label="Close"
              className="absolute top-3 right-3"
              isIconButton
              onClick={close}
              size="small"
              variant="tertiary"
            >
              <span aria-hidden="true" className="text-bc-h4 leading-none">
                x
              </span>
            </Button>
          )}
          {children}
        </>
      )}
    </ReactAriaDialog>
  )
}

export { Dialog, DialogTrigger }
