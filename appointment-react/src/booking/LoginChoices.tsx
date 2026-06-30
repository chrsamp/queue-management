import { Link } from 'react-router'

import type { IdentityProviderHint } from '@/auth/auth-service'
import type { RuntimeConfig } from '@/config/runtime-config'

export default function LoginChoices({ config }: { config: RuntimeConfig }) {
  return (
    <div className="flex flex-col gap-4">
      {!config.VITE_APPOINTMENT_HIDE_BC_SERVICES_CARD && (
        <LoginChoice
          hint="bcsc"
          label="Login with BC Services Card"
          learnMore="https://www2.gov.bc.ca/gov/content?id=B2B3A21E797A421A8FD39EEA86E245D6"
        />
      )}
      <LoginChoice
        hint="bceidboth"
        label="Login with Basic BCeID"
        learnMore={
          config.VITE_APPOINTMENT_BCEID_REGISTRATION_URL ||
          'https://www.bceid.ca/register/basic/account_details.aspx'
        }
      />
      {!config.VITE_APPOINTMENT_HIDE_BC_SERVICES_CARD &&
        config.VITE_APPOINTMENT_BC_SERVICES_CARD_URL && (
          <a
            className="border-bc-border-dark focus-visible:outline-bc-focus inline-flex min-h-12 items-center justify-center rounded-sm border px-6 no-underline focus-visible:outline-2"
            href={config.VITE_APPOINTMENT_BC_SERVICES_CARD_URL}
          >
            Get a BC Services Card
          </a>
        )}
    </div>
  )
}

function LoginChoice({
  hint,
  label,
  learnMore,
}: {
  hint: IdentityProviderHint
  label: string
  learnMore: string
}) {
  return (
    <div className="border-bc-border flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      <Link
        className="bg-bc-button-primary hover:bg-bc-button-primary-hover inline-flex min-h-12 items-center rounded-sm px-6 text-white no-underline"
        to={`/signin/${hint}`}
      >
        {label}
      </Link>
      <a href={learnMore} rel="noreferrer" target="_blank">
        Learn more
      </a>
    </div>
  )
}
