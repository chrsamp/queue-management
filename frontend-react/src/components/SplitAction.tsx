import { ChevronDown } from 'lucide-react'
import {
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  type Key,
} from 'react-aria-components'

import Button, { type ButtonVariant } from '@/components/Button'
import { cx } from '@/lib/cx'

type SplitActionVariant = Extract<ButtonVariant, 'primary' | 'secondary'>

export interface SplitActionItem {
  disabled?: boolean
  id: Key
  label: string
}

interface SplitActionProps {
  disabled?: boolean
  items: SplitActionItem[]
  label: string
  onAction: (key: Key) => void
  onPrimary?: () => void
  variant?: SplitActionVariant
}

export default function SplitAction({
  disabled = false,
  items,
  label,
  onAction,
  onPrimary,
  variant = 'primary',
}: SplitActionProps) {
  const hasMenu = items.length > 0
  const iconBorderClass =
    variant === 'primary'
      ? 'border-l-bc-button-primary-hover'
      : 'border-l-bc-border-dark'

  if (!onPrimary) {
    return (
      <MenuTrigger>
        <Button disabled={disabled || !hasMenu} variant={variant}>
          {label}
          <ChevronDown aria-hidden="true" className="h-4 w-4" />
        </Button>
        <SplitActionPopover items={items} onAction={onAction} />
      </MenuTrigger>
    )
  }

  return (
    <div className="inline-flex items-stretch">
      <Button
        className={cx(hasMenu && 'rounded-r-none')}
        disabled={disabled}
        onClick={onPrimary}
        variant={variant}
      >
        {label}
      </Button>
      {hasMenu && (
        <MenuTrigger>
          <Button
            aria-label={`${label} quick services`}
            className={cx('rounded-l-none border-l', iconBorderClass)}
            disabled={disabled}
            isIconButton
            variant={variant}
          >
            <ChevronDown aria-hidden="true" className="h-4 w-4" />
          </Button>
          <SplitActionPopover items={items} onAction={onAction} />
        </MenuTrigger>
      )}
    </div>
  )
}

function SplitActionPopover({
  items,
  onAction,
}: {
  items: SplitActionItem[]
  onAction: (key: Key) => void
}) {
  return (
    <Popover
      className="border-bc-border bg-bc-white shadow-bc-popover z-50 min-w-64 overflow-hidden rounded-sm border p-1"
      offset={4}
    >
      <Menu
        className="max-h-80 overflow-auto outline-hidden"
        items={items}
        onAction={(key) => onAction(key)}
      >
        {(item) => (
          <MenuItem
            className="data-[focused]:bg-bc-button-secondary-hover data-[hovered]:bg-bc-button-secondary-hover text-bc-body data-[disabled]:text-bc-disabled-text cursor-pointer rounded-sm px-3 py-2 outline-hidden data-[disabled]:cursor-not-allowed"
            id={item.id}
            isDisabled={item.disabled}
            textValue={item.label}
          >
            {item.label}
          </MenuItem>
        )}
      </Menu>
    </Popover>
  )
}
