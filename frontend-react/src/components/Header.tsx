import type { ElementType, ReactNode } from 'react'

import BcLogo from './BcLogo'

type HeaderTitleElement = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'p'

export interface HeaderSkipLink {
  href: string
  label: ReactNode
}

export interface HeaderProps {
  title?: ReactNode
  titleAs?: HeaderTitleElement
  homeHref?: string
  homeLabel?: string
  logo?: ReactNode
  skipLinks?: HeaderSkipLink[]
  children?: ReactNode
  className?: string
  containerClassName?: string
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function Header({
  title,
  titleAs = 'span',
  homeHref = '/',
  homeLabel = 'Government of British Columbia',
  logo = (
    <BcLogo
      aria-hidden="true"
      className="w-bc-logo-header min-w-bc-logo-header"
      focusable="false"
    />
  ),
  skipLinks = [],
  children,
  className,
  containerClassName,
}: HeaderProps) {
  const TitleElement = titleAs as ElementType

  return (
    <header
      className={cx(
        'min-h-bc-header-height border-bc-border bg-bc-white box-border flex w-full items-center justify-around border-b px-4',
        className,
      )}
    >
      <div
        className={cx(
          'max-w-bc-content relative flex w-full flex-1 flex-row items-center gap-4',
          containerClassName,
        )}
      >
        <a
          aria-label={homeLabel}
          className="focus-visible:outline-bc-link shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2"
          href={homeHref}
          title={homeLabel}
        >
          {logo}
        </a>

        {skipLinks.length > 0 && (
          <ul className="absolute m-0 list-none p-0">
            {skipLinks.map((skipLink) => (
              <li key={skipLink.href}>
                <a
                  className="bg-bc-white text-bc-body text-bc-link focus:outline-bc-link sr-only z-10 px-4 py-1 underline focus:not-sr-only focus:absolute focus:top-1/2 focus:left-0 focus:-translate-y-1/2 focus:whitespace-nowrap focus:outline-2 focus:outline-offset-2"
                  href={skipLink.href}
                >
                  {skipLink.label}
                </a>
              </li>
            ))}
          </ul>
        )}

        {title && (
          <>
            <div aria-hidden="true" className="bg-bc-border h-8 w-px" />
            <TitleElement className="text-bc-h4 text-bc-primary flex-1 font-bold">
              {title}
            </TitleElement>
          </>
        )}

        {children}
      </div>
    </header>
  )
}
