import type { ReactElement } from 'react'
import {
  FieldError,
  Input,
  Label,
  Text,
  TextField as ReactAriaTextField,
  type TextFieldProps as ReactAriaTextFieldProps,
  type ValidationResult,
} from 'react-aria-components'

import { cx } from '@/lib/cx'

export interface TextFieldProps extends Omit<
  ReactAriaTextFieldProps,
  'className'
> {
  className?: string
  description?: string
  errorMessage?: string | ((validation: ValidationResult) => string)
  iconLeft?: ReactElement
  iconRight?: ReactElement
  inputClassName?: string
  label?: string
  placeholder?: string
  size?: 'small' | 'medium'
}

export default function TextField({
  className,
  description,
  errorMessage,
  iconLeft,
  iconRight,
  inputClassName,
  label,
  placeholder,
  size = 'medium',
  ...props
}: TextFieldProps) {
  return (
    <ReactAriaTextField
      className={cx('group flex min-w-0 flex-col items-stretch', className)}
      {...props}
    >
      {({ isInvalid, isRequired }) => (
        <>
          {label && (
            <Label className="text-bc-small text-bc-secondary pb-1">
              {label}
              {isRequired && (
                <span className="text-bc-secondary pl-1">(required)</span>
              )}
            </Label>
          )}
          <div
            className={cx(
              'border-bc-border bg-bc-white group-data-[disabled]:bg-bc-disabled-surface group-data-[disabled]:text-bc-disabled-text group-data-[invalid]:border-bc-danger group-data-[focus-within]:border-bc-form-active group-data-[focus-within]:outline-bc-focus group-data-[hovered]:border-bc-form-hover flex items-center gap-2 rounded-sm border px-3 group-data-[focus-within]:outline-2 group-data-[focus-within]:outline-offset-1',
              size === 'small' ? 'min-h-8' : 'min-h-10',
            )}
          >
            {iconLeft}
            <Input
              className={cx(
                'placeholder:text-bc-placeholder text-bc-body text-bc-primary min-w-0 flex-1 border-0 bg-transparent p-0 outline-hidden disabled:cursor-not-allowed',
                inputClassName,
              )}
              placeholder={placeholder}
            />
            {isInvalid && (
              <span aria-hidden="true" className="text-bc-danger">
                !
              </span>
            )}
            {iconRight}
          </div>
          {description && (
            <Text
              className="text-bc-small text-bc-secondary pt-1"
              slot="description"
            >
              {description}
            </Text>
          )}
          <FieldError className="text-bc-small text-bc-danger pt-1">
            {errorMessage}
          </FieldError>
        </>
      )}
    </ReactAriaTextField>
  )
}

export { TextField }
