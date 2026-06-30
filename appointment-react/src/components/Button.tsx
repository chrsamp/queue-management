import type { ReactNode } from 'react'
import {
  Button as ReactAriaButton,
  type ButtonProps as ReactAriaButtonProps,
} from 'react-aria-components'

import { cx } from '@/lib/cx'

export type ButtonSize = 'xsmall' | 'small' | 'medium' | 'large'
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'link'

export interface ButtonProps extends Omit<
  ReactAriaButtonProps,
  'children' | 'className' | 'isDisabled' | 'onPress'
> {
  children: ReactNode
  className?: string
  danger?: boolean
  disabled?: boolean
  isIconButton?: boolean
  onClick?: () => void
  size?: ButtonSize
  variant?: ButtonVariant
}

const sizeClasses: Record<ButtonSize, string> = {
  large: 'min-h-12 px-6 text-bc-body',
  medium: 'min-h-10 px-4 text-bc-body',
  small: 'min-h-8 px-3 text-bc-small',
  xsmall: 'min-h-6 px-2 text-xs leading-4',
}

const iconSizeClasses: Record<ButtonSize, string> = {
  large: 'h-12 w-12 min-w-12 p-0',
  medium: 'h-10 w-10 min-w-10 p-0',
  small: 'h-8 w-8 min-w-8 p-0',
  xsmall: 'h-6 w-6 min-w-6 p-0',
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-bc-button-primary text-bc-white hover:bg-bc-button-primary-hover active:bg-bc-button-primary-pressed disabled:bg-bc-disabled-surface disabled:text-bc-disabled-text',
  secondary:
    'border border-bc-border-dark bg-bc-white text-bc-primary hover:bg-bc-button-secondary-hover active:bg-bc-button-secondary-pressed disabled:border-bc-border disabled:bg-bc-disabled-surface disabled:text-bc-disabled-text',
  tertiary:
    'bg-transparent text-bc-primary hover:bg-bc-button-tertiary-hover active:bg-bc-button-tertiary-pressed disabled:bg-transparent disabled:text-bc-disabled-text',
  link: 'bg-transparent text-bc-link underline underline-offset-4 disabled:text-bc-disabled-text',
}

const dangerClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-bc-danger text-bc-white hover:bg-bc-danger-hover active:bg-bc-danger-surface active:text-bc-danger disabled:bg-bc-disabled-surface disabled:text-bc-disabled-text',
  secondary:
    'border border-bc-danger bg-bc-white text-bc-danger hover:bg-bc-danger-surface active:bg-bc-danger active:text-bc-white disabled:border-bc-border disabled:bg-bc-disabled-surface disabled:text-bc-disabled-text',
  tertiary:
    'bg-transparent text-bc-danger hover:bg-bc-danger-surface active:bg-bc-button-tertiary-pressed disabled:bg-transparent disabled:text-bc-disabled-text',
  link: 'bg-transparent text-bc-danger underline underline-offset-4 disabled:text-bc-disabled-text',
}

export default function Button({
  children,
  className,
  danger = false,
  disabled = false,
  isIconButton = false,
  onClick,
  size = 'medium',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <ReactAriaButton
      className={cx(
        'focus-visible:outline-bc-focus inline-flex min-h-6 min-w-6 cursor-pointer items-center justify-center gap-2 rounded-sm border-0 font-normal focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed',
        isIconButton ? iconSizeClasses[size] : sizeClasses[size],
        danger ? dangerClasses[variant] : variantClasses[variant],
        className,
      )}
      isDisabled={disabled}
      onPress={onClick}
      type={type}
      {...props}
    >
      {children}
    </ReactAriaButton>
  )
}

export { Button }
