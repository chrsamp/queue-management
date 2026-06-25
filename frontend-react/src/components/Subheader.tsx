import {
  Children,
  isValidElement,
  type HTMLAttributes,
  type ReactNode,
} from 'react'

import { cx } from '@/lib/cx'

export interface SubheaderProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'children'
> {
  ariaLabel?: string
  children?: ReactNode
  className?: string
  containerClassName?: string
  endItems?: ReactNode[]
  size?: 'small' | 'medium'
  startItems?: ReactNode[]
}

export default function Subheader({
  ariaLabel,
  children,
  className,
  containerClassName,
  endItems = [],
  size = 'medium',
  startItems = [],
  ...props
}: SubheaderProps) {
  const childItems = Children.toArray(children)
  const start = [...startItems, ...childItems].filter(Boolean)
  const end = endItems.filter(Boolean)

  if (start.length === 0 && end.length === 0) {
    return null
  }

  return (
    <div
      className={cx(
        'border-bc-border bg-bc-white box-border flex w-full items-center justify-around border-b px-4',
        className,
      )}
    >
      <nav
        aria-label={ariaLabel}
        className={cx(
          'box-border flex w-full flex-1 flex-wrap items-center justify-between gap-4',
          size === 'small'
            ? 'min-h-bc-subheader-small py-0.5'
            : 'min-h-bc-subheader-medium py-2',
          containerClassName,
        )}
        {...props}
      >
        <SubheaderList items={start} size={size} />
        {end.length > 0 && (
          <SubheaderList className="ml-auto" items={end} size={size} />
        )}
      </nav>
    </div>
  )
}

function SubheaderList({
  className,
  items,
  size,
}: {
  className?: string
  items: ReactNode[]
  size: 'small' | 'medium'
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <ul
      className={cx(
        'm-0 flex list-none flex-wrap items-center gap-2 p-0',
        className,
      )}
    >
      {items.flatMap((item, index) => {
        const baseKey =
          isValidElement(item) && item.key != null ? item.key : index

        return [
          <li
            className={cx('flex items-center', size === 'medium' && 'px-2')}
            key={`item-${String(baseKey)}`}
          >
            {item}
          </li>,
          ...(index < items.length - 1
            ? [
                <li
                  aria-hidden="true"
                  className="bg-bc-border mx-0 flex w-px self-stretch"
                  key={`sep-${String(baseKey)}`}
                  role="presentation"
                />,
              ]
            : []),
        ]
      })}
    </ul>
  )
}

export { Subheader }
