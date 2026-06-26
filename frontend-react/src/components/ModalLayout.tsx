import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useRef,
  useState,
} from 'react'
import { Minimize2, X } from 'lucide-react'

import { cx } from '@/lib/cx'

import Button from './Button'
import Dialog, { DialogTitle } from './Dialog'
import Modal from './Modal'

interface ModalLayoutProps {
  bodyClassName?: string
  children: ReactNode
  className?: string
  closeDisabled?: boolean
  footer?: ReactNode
  footerClassName?: string
  header: ReactNode
  headerClassName?: string
  isOpen?: boolean
  minimizeDisabled?: boolean
  onClose: () => void
}

interface Position {
  x: number
  y: number
}

const interactiveSelector = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
].join(',')

export default function ModalLayout({
  bodyClassName,
  children,
  className,
  closeDisabled = false,
  footer,
  footerClassName,
  header,
  headerClassName,
  isOpen = true,
  minimizeDisabled = false,
  onClose,
}: ModalLayoutProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const dragStateRef = useRef<{
    origin: Position
    pointerId: number
    start: Position
  } | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)

  function clampPosition(nextPosition: Position) {
    const shell = shellRef.current

    if (!shell) {
      return nextPosition
    }

    const rect = shell.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const visibleWidth = Math.min(160, rect.width)
    const visibleHeight = Math.min(64, rect.height)

    return {
      x: Math.min(
        viewportWidth / 2 - visibleWidth,
        Math.max(-viewportWidth / 2 + visibleWidth, nextPosition.x),
      ),
      y: Math.min(
        viewportHeight / 2 - visibleHeight,
        Math.max(-viewportHeight / 2 + visibleHeight, nextPosition.y),
      ),
    }
  }

  function handleHeaderPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return
    }

    if (
      event.target instanceof Element &&
      event.target.closest(interactiveSelector)
    ) {
      return
    }

    dragStateRef.current = {
      origin: position,
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function handleHeaderPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    setPosition(
      clampPosition({
        x: dragState.origin.x + event.clientX - dragState.start.x,
        y: dragState.origin.y + event.clientY - dragState.start.y,
      }),
    )
  }

  function handleHeaderPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null
    }
  }

  function toggleMinimized() {
    setIsMinimized((current) => !current)
  }

  return (
    <Modal
      className={cx(
        'overflow-hidden',
        isMinimized ? 'max-w-md' : 'max-w-xl',
        className,
      )}
      isDismissable={!closeDisabled}
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
      modalRef={shellRef}
      modalStyle={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      overlayClassName={
        isMinimized ? 'pointer-events-none bg-transparent' : undefined
      }
    >
      <Dialog className="p-0" isCloseable={false}>
        <div
          className={cx(
            'flex max-h-[calc(100vh-2rem)] flex-col',
            isMinimized && 'max-h-none',
          )}
        >
          <div
            className={cx(
              'border-bc-border bg-bc-light-gray flex cursor-move items-start justify-between gap-4 border-b px-6 py-4',
              headerClassName,
            )}
            onPointerCancel={handleHeaderPointerEnd}
            onPointerDown={handleHeaderPointerDown}
            onPointerMove={handleHeaderPointerMove}
            onPointerUp={handleHeaderPointerEnd}
          >
            <div className="min-w-0 flex-1">
              {typeof header === 'string' ? (
                <DialogTitle className="text-bc-h4 m-0 font-bold">
                  {header}
                </DialogTitle>
              ) : (
                header
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                aria-label={isMinimized ? 'Restore modal' : 'Minimize modal'}
                disabled={minimizeDisabled}
                isIconButton
                onClick={toggleMinimized}
                size="small"
                variant="tertiary"
              >
                <Minimize2 aria-hidden="true" className="h-4 w-4" />
              </Button>
              <Button
                aria-label="Close modal"
                disabled={closeDisabled}
                isIconButton
                onClick={onClose}
                size="small"
                variant="tertiary"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div
                className={cx('min-h-0 flex-1 overflow-auto', bodyClassName)}
              >
                {children}
              </div>
              {footer && (
                <div
                  className={cx(
                    'bg-bc-light-gray shrink-0 border-t px-6 py-4',
                    footerClassName,
                  )}
                >
                  {footer}
                </div>
              )}
            </>
          )}
        </div>
      </Dialog>
    </Modal>
  )
}

export { ModalLayout }
