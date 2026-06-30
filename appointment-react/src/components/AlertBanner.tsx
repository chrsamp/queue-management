import type { AriaRole, ReactNode } from 'react'
import { CheckCircle, CircleAlert, Info, TriangleAlert, X } from 'lucide-react'

import { cx } from '@/lib/cx'

import Button from './Button'

export type AlertBannerVariant =
  'black' | 'danger' | 'info' | 'success' | 'warning'

export interface AlertBannerProps {
  children: ReactNode
  className?: string
  containerClassName?: string
  customIcon?: ReactNode
  isCloseable?: boolean
  isIconHidden?: boolean
  onClose?: () => void
  role?: AriaRole
  size?: 'small' | 'medium'
  variant?: AlertBannerVariant
}

const variantClasses: Record<AlertBannerVariant, string> = {
  black: 'bg-bc-gray-110 text-bc-white',
  danger: 'bg-bc-danger text-bc-white',
  info: 'bg-bc-info text-bc-white',
  success: 'bg-bc-success text-bc-white',
  warning: 'bg-bc-warning text-bc-primary',
}

const sizeClasses = {
  medium: {
    container: 'py-3',
    content: 'text-bc-body',
    icon: 'h-5 w-5',
  },
  small: {
    container: 'py-1',
    content: 'text-bc-small',
    icon: 'h-4 w-4',
  },
}

export default function AlertBanner({
  children,
  className,
  containerClassName,
  customIcon,
  isCloseable = true,
  isIconHidden = false,
  onClose,
  role = 'status',
  size = 'medium',
  variant = 'info',
}: AlertBannerProps) {
  const icon = customIcon ?? getIcon(variant, sizeClasses[size].icon)

  return (
    <div className={cx('w-full', variantClasses[variant], className)}>
      <div
        className={cx(
          'mx-auto flex w-full items-start gap-4 px-6',
          sizeClasses[size].container,
          containerClassName,
        )}
      >
        {!isIconHidden && (
          <span className="mt-1 flex shrink-0 items-center" aria-hidden="true">
            {icon}
          </span>
        )}
        <div
          className={cx(
            'flex min-w-0 flex-1 flex-wrap items-baseline gap-4',
            sizeClasses[size].content,
          )}
          role={role}
        >
          {children}
        </div>
        {isCloseable && (
          <Button
            aria-label="Close this alert"
            className={cx(
              'size-6 shrink-0',
              variant === 'warning'
                ? 'text-bc-primary'
                : 'text-bc-white hover:text-bc-primary',
            )}
            isIconButton
            onClick={onClose}
            size="small"
            variant="tertiary"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

function getIcon(variant: AlertBannerVariant, className: string) {
  switch (variant) {
    case 'success':
      return <CheckCircle className={className} />
    case 'warning':
      return <TriangleAlert className={className} />
    case 'danger':
      return <CircleAlert className={className} />
    case 'black':
    case 'info':
      return <Info className={className} />
  }
}

export { AlertBanner }
