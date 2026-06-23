import type { ReactNode } from 'react'
import {
  Modal as ReactAriaModal,
  ModalOverlay,
  type ModalOverlayProps,
} from 'react-aria-components'

import { cx } from '@/lib/cx'

export interface ModalProps extends Omit<
  ModalOverlayProps,
  'children' | 'className'
> {
  children: ReactNode
  className?: string
}

export default function Modal({ children, className, ...props }: ModalProps) {
  return (
    <ModalOverlay
      className="bg-bc-overlay data-[entering]:animate-bc-modal-fade data-[exiting]:animate-bc-modal-fade-out fixed inset-0 z-50 flex min-h-screen items-center justify-center p-4 motion-reduce:data-[entering]:animate-none motion-reduce:data-[exiting]:animate-none"
      {...props}
    >
      <ReactAriaModal
        className={cx(
          'border-bc-border bg-bc-white shadow-bc-modal max-h-full w-full max-w-xl overflow-auto rounded-sm border outline-hidden',
          className,
        )}
      >
        {children}
      </ReactAriaModal>
    </ModalOverlay>
  )
}

export { Modal }
