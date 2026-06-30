import type { ReactNode } from 'react'

import { cx } from '@/lib/cx'

import BcLogo from './BcLogo'

export interface FooterLink {
  href: string
  label: ReactNode
}

export interface FooterLinkGroup {
  title: ReactNode
  links: FooterLink[]
}

export interface FooterProps {
  acknowledgement?: ReactNode | null
  contact?: ReactNode | null
  linkGroups?: FooterLinkGroup[] | null
  logo?: ReactNode | null
  copyright?: ReactNode | null
  className?: string
  containerClassName?: string
}

const defaultAcknowledgement = (
  <p className="m-0">
    The B.C. Public Service acknowledges the territories of First Nations around
    B.C. and is grateful to carry out our work on these lands. We acknowledge
    the rights, interests, priorities, and concerns of all Indigenous Peoples —
    First Nations, Métis, and Inuit — respecting and acknowledging their
    distinct cultures, histories, rights, laws, and governments.
  </p>
)

const defaultContact = (
  <p className="text-bc-small m-0">
    We can help in over 220 languages and through other accessible options.{' '}
    <a
      className="text-bc-secondary underline hover:no-underline"
      href="https://www2.gov.bc.ca/gov/content?id=6A77C17D0CCB48F897F8598CCC019111"
    >
      Call, email or text us
    </a>
    , or{' '}
    <a
      className="text-bc-secondary underline hover:no-underline"
      href="https://www2.gov.bc.ca/gov/content?id=FBC4210F6BC047A5884198F543C97D53"
    >
      find a service centre
    </a>
  </p>
)

const defaultLinkGroups: FooterLinkGroup[] = [
  {
    title: 'More Info',
    links: [
      {
        href: 'https://www2.gov.bc.ca/gov/content/home',
        label: 'Home',
      },
      {
        href: 'https://www2.gov.bc.ca/gov/content?id=3C4F47288DFB454987435AB5EFEFBB7F',
        label: 'About gov.bc.ca',
      },
      {
        href: 'https://www2.gov.bc.ca/gov/content?id=79F93E018712422FBC8E674A67A70535',
        label: 'Disclaimer',
      },
      {
        href: 'https://www2.gov.bc.ca/gov/content?id=9E890E16955E4FF4BF3B0E07B4722932',
        label: 'Privacy',
      },
      {
        href: 'https://www2.gov.bc.ca/gov/content?id=E08E79740F9C41B9B0C484685CC5E412',
        label: 'Accessibility',
      },
      {
        href: 'https://www2.gov.bc.ca/gov/content?id=1AAACC9C65754E4D89A118B875E0FBDA',
        label: 'Copyright',
      },
      {
        href: 'https://www2.gov.bc.ca/gov/content?id=6A77C17D0CCB48F897F8598CCC019111',
        label: 'Contact us',
      },
    ],
  },
]

export function FooterLinks({ title, links }: FooterLinkGroup) {
  return (
    <figure className="m-0 min-w-80">
      {title && (
        <figcaption className="text-bc-small mb-4 block font-bold uppercase">
          {title}
        </figcaption>
      )}
      <ul className="max-bc-mobile:grid-cols-1 m-0 grid list-none grid-cols-2 gap-x-8 gap-y-2 p-0">
        {links.map((link) => (
          <li className="text-bc-small" key={link.href}>
            <a
              className="text-bc-primary no-underline hover:underline"
              href={link.href}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </figure>
  )
}

export default function Footer({
  acknowledgement = defaultAcknowledgement,
  contact = defaultContact,
  linkGroups = defaultLinkGroups,
  logo = (
    <BcLogo
      className="w-bc-logo-footer min-w-bc-logo-footer"
      title="Government of British Columbia"
    />
  ),
  copyright = `© ${new Date().getUTCFullYear()} Government of British Columbia.`,
  className,
  containerClassName,
}: FooterProps) {
  const hasLogoContactLinks = Boolean(logo || contact || linkGroups?.length)

  return (
    <footer className={cx('flex w-full flex-col items-stretch', className)}>
      {acknowledgement && (
        <div className="border-bc-gold-60 bg-bc-gray-110 max-bc-mobile:px-4 flex flex-col items-center justify-around border-y-4 p-8">
          <div className="max-w-bc-content text-bc-small text-bc-white flex w-full flex-col items-center justify-stretch">
            {acknowledgement}
          </div>
        </div>
      )}

      <div className="bg-bc-light-gray max-bc-mobile:p-4 flex flex-col items-center justify-around p-8">
        <div
          className={cx(
            'max-w-bc-content max-bc-mobile:gap-4 flex w-full flex-col items-stretch gap-8',
            containerClassName,
          )}
        >
          {hasLogoContactLinks && (
            <div className="max-bc-tablet:flex-wrap flex w-full flex-row flex-nowrap items-start justify-between gap-x-8 gap-y-4">
              {(logo || contact) && (
                <div className="w-bc-footer-logo min-w-bc-footer-logo-min max-bc-tablet:max-w-bc-footer-logo-min max-bc-mobile:gap-4 flex flex-col gap-6">
                  {logo}
                  {contact}
                </div>
              )}

              {linkGroups?.map((linkGroup) => (
                <FooterLinks
                  key={String(linkGroup.title)}
                  links={linkGroup.links}
                  title={linkGroup.title}
                />
              ))}
            </div>
          )}

          {hasLogoContactLinks && copyright && (
            <hr className="bg-bc-border-dark m-0 h-px w-full border-0" />
          )}

          {copyright && (
            <p className="text-bc-body text-bc-secondary m-0">{copyright}</p>
          )}
        </div>
      </div>
    </footer>
  )
}
