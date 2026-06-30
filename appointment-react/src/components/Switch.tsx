import type { ReactNode } from 'react'
import {
  SwitchButton as ReactAriaSwitchButton,
  SwitchField as ReactAriaSwitchField,
  type SwitchFieldProps as ReactAriaSwitchFieldProps,
} from 'react-aria-components'

import { cx } from '@/lib/cx'

export type SwitchLabelPosition = 'left' | 'right'

export interface SwitchProps extends Omit<
  ReactAriaSwitchFieldProps,
  | 'children'
  | 'className'
  | 'defaultSelected'
  | 'isDisabled'
  | 'isReadOnly'
  | 'isSelected'
  | 'onChange'
> {
  checked?: boolean
  children?: ReactNode
  className?: string
  defaultChecked?: boolean
  disabled?: boolean
  labelPosition?: SwitchLabelPosition
  onChange?: (checked: boolean) => void
  readOnly?: boolean
}

export default function Switch({
  checked,
  children,
  className,
  defaultChecked,
  disabled = false,
  labelPosition = 'right',
  onChange,
  readOnly = false,
  ...props
}: SwitchProps) {
  return (
    <ReactAriaSwitchField
      className={cx(
        'text-bc-small text-bc-secondary data-[disabled]:text-bc-disabled-text inline-flex forced-color-adjust-none',
        className,
      )}
      defaultSelected={defaultChecked}
      isDisabled={disabled}
      isReadOnly={readOnly}
      isSelected={checked}
      onChange={onChange}
      {...props}
    >
      <ReactAriaSwitchButton className="group inline-flex cursor-pointer items-center gap-2 data-[disabled]:cursor-not-allowed data-[readonly]:cursor-not-allowed">
        {labelPosition === 'left' && children}
        <span
          aria-hidden="true"
          className="h-bc-switch-thumb w-bc-switch-track bg-bc-disabled-surface group-data-[selected]:bg-bc-button-primary group-data-[hovered]:group-data-[selected]:bg-bc-button-primary-hover group-data-[focus-visible]:outline-bc-focus group-data-[disabled]:bg-bc-disabled-surface flex shrink-0 items-center rounded-full transition-colors duration-200 group-data-[focus-visible]:outline-2 group-data-[focus-visible]:outline-offset-2 motion-reduce:transition-none"
        >
          <span className="h-bc-switch-thumb w-bc-switch-thumb border-bc-border bg-bc-white group-data-[hovered]:border-bc-border-dark group-data-[selected]:translate-x-bc-switch-thumb group-data-[selected]:border-bc-button-primary group-data-[hovered]:group-data-[selected]:border-bc-button-primary-hover group-data-[disabled]:border-bc-border group-data-[disabled]:bg-bc-light-gray box-border block rounded-full border-2 transition-transform duration-200 motion-reduce:transition-none" />
        </span>
        {labelPosition === 'right' && children}
      </ReactAriaSwitchButton>
    </ReactAriaSwitchField>
  )
}

export { Switch }
