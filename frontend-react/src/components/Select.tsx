import type { ReactElement } from 'react'
import {
  Autocomplete,
  Button as ReactAriaButton,
  FieldError,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  SearchField,
  Select as ReactAriaSelect,
  SelectValue,
  Text,
  type Key,
  type SelectProps as ReactAriaSelectProps,
  type ValidationResult,
  useFilter,
} from 'react-aria-components'

import { cx } from '@/lib/cx'

export interface SelectItem {
  description?: string
  iconLeft?: ReactElement
  id: Key
  isDisabled?: boolean
  label: string
  textValue?: string
}

export interface SelectProps<T extends SelectItem> extends Omit<
  ReactAriaSelectProps<T>,
  'children' | 'className'
> {
  className?: string
  description?: string
  errorMessage?: string | ((validation: ValidationResult) => string)
  items: T[]
  label?: string
  placeholder?: string
  renderEmptyState?: () => ReactElement
  searchable?: boolean
  searchLabel?: string
  searchPlaceholder?: string
  size?: 'small' | 'medium'
}

export default function Select<T extends SelectItem>({
  className,
  description,
  errorMessage,
  items,
  label,
  placeholder = 'Select an item',
  renderEmptyState,
  searchable = false,
  searchLabel = 'Search options',
  searchPlaceholder = 'Search',
  size = 'medium',
  ...props
}: SelectProps<T>) {
  const { contains } = useFilter({ sensitivity: 'base' })
  const listBox = (
    <ListBox
      className="max-h-64 flex-1 overflow-auto outline-hidden"
      items={items}
      renderEmptyState={renderEmptyState}
    >
      {(item) => (
        <ListBoxItem
          className="data-[disabled]:text-bc-disabled-text data-[focused]:bg-bc-button-secondary-hover data-[hovered]:bg-bc-button-secondary-hover flex cursor-pointer items-center gap-2 rounded-sm p-2 outline-hidden data-[disabled]:cursor-not-allowed"
          id={item.id}
          isDisabled={item.isDisabled}
          textValue={item.textValue ?? item.label}
        >
          {({ isSelected }) => (
            <>
              {item.iconLeft}
              <span className="min-w-0 flex-1">
                <Text
                  className="text-bc-body text-bc-primary block truncate"
                  slot="label"
                >
                  {item.label}
                </Text>
                {item.description && (
                  <Text
                    className="text-bc-small text-bc-secondary block truncate"
                    slot="description"
                  >
                    {item.description}
                  </Text>
                )}
              </span>
              {isSelected && (
                <span aria-hidden="true" className="text-bc-link">
                  ✓
                </span>
              )}
            </>
          )}
        </ListBoxItem>
      )}
    </ListBox>
  )

  return (
    <ReactAriaSelect
      className={cx('group flex min-w-0 flex-col items-stretch', className)}
      {...props}
    >
      {({ isInvalid, isOpen, isRequired }) => (
        <>
          {label && (
            <Label className="text-bc-small text-bc-secondary pb-1">
              {label}
              {isRequired && (
                <span className="text-bc-secondary pl-1">(required)</span>
              )}
            </Label>
          )}
          <ReactAriaButton
            className={cx(
              'border-bc-border bg-bc-white group-data-[disabled]:bg-bc-disabled-surface group-data-[disabled]:text-bc-disabled-text group-data-[invalid]:border-bc-danger group-data-[focus-visible]:border-bc-form-active group-data-[focus-visible]:outline-bc-focus group-data-[hovered]:border-bc-form-hover flex w-full cursor-pointer items-center gap-2 rounded-sm border px-3 text-left group-data-[focus-visible]:outline-2 group-data-[focus-visible]:outline-offset-1',
              size === 'small' ? 'min-h-8' : 'min-h-10',
            )}
          >
            <SelectValue<T> className="text-bc-body text-bc-primary min-w-0 flex-1 truncate">
              {({ selectedItem, selectedText }) => (
                <span
                  className={cx(
                    'block truncate',
                    !selectedText && 'text-bc-placeholder',
                  )}
                >
                  {selectedItem?.label ?? (selectedText || placeholder)}
                </span>
              )}
            </SelectValue>
            {isInvalid && (
              <span aria-hidden="true" className="text-bc-danger">
                !
              </span>
            )}
            <span aria-hidden="true" className="text-bc-secondary">
              {isOpen ? '^' : 'v'}
            </span>
          </ReactAriaButton>
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
          <Popover
            className="border-bc-border bg-bc-white shadow-bc-popover z-50 flex max-h-80 w-(--trigger-width) flex-col overflow-hidden rounded-sm border p-1"
            offset={4}
          >
            {searchable ? (
              <Autocomplete filter={contains}>
                <SearchField
                  aria-label={searchLabel}
                  autoFocus
                  className="border-bc-border bg-bc-white focus-within:border-bc-form-active focus-within:outline-bc-focus m-1 flex min-h-9 items-center rounded-sm border px-3 focus-within:outline-2 focus-within:outline-offset-1"
                >
                  <Input
                    className="placeholder:text-bc-placeholder text-bc-body text-bc-primary min-w-0 flex-1 border-0 bg-transparent p-0 outline-hidden"
                    placeholder={searchPlaceholder}
                  />
                </SearchField>
                {listBox}
              </Autocomplete>
            ) : (
              listBox
            )}
          </Popover>
        </>
      )}
    </ReactAriaSelect>
  )
}

export { Select }
