import type { CSSProperties, Ref, ReactNode } from 'react'
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
  modalRef?: Ref<HTMLDivElement>
  modalStyle?: CSSProperties
  overlayClassName?: string
}

export default function Modal({
  children,
  className,
  modalRef,
  modalStyle,
  overlayClassName,
  ...props
}: ModalProps) {
  return (
    <ModalOverlay
      className={cx(
        'bg-bc-overlay data-[entering]:animate-bc-modal-fade data-[exiting]:animate-bc-modal-fade-out fixed inset-0 z-50 flex min-h-screen items-center justify-center p-4 motion-reduce:data-[entering]:animate-none motion-reduce:data-[exiting]:animate-none',
        overlayClassName,
      )}
      {...props}
    >
      <ReactAriaModal
        className={cx(
          'border-bc-border bg-bc-white shadow-bc-modal pointer-events-auto max-h-full w-full max-w-xl rounded-sm border outline-hidden',
          className,
        )}
        ref={modalRef}
        style={modalStyle}
      >
        {children}
      </ReactAriaModal>
    </ModalOverlay>
  )
}

export { Modal }
