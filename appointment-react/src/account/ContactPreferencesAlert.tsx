import { Link } from 'react-router'

import type { PublicUser } from '@/api/schemas'
import AlertBanner from '@/components/AlertBanner'
import type { RuntimeConfig } from '@/config/runtime-config'

export default function ContactPreferencesAlert({
  config,
  user,
}: {
  config: RuntimeConfig
  user: PublicUser
}) {
  const messages: { link: string; suffix: string }[] = []

  if (!user.email) {
    messages.push({
      link: 'configure your email address',
      suffix: ' to receive notifications.',
    })
  } else if (!user.send_email_reminders) {
    messages.push({
      link: 'subscribe to email reminders',
      suffix: ' to receive appointment reminders.',
    })
  }

  if (!config.VITE_APPOINTMENT_DISABLE_SMS) {
    if (!user.telephone) {
      messages.push({
        link: 'add your phone number',
        suffix: ' to ensure we can contact you.',
      })
    } else if (!user.send_sms_reminders) {
      messages.push({
        link: 'subscribe to SMS text message reminders',
        suffix: ' to receive appointment reminders.',
      })
    }
  }

  if (messages.length === 0) return null

  return (
    <AlertBanner className="mb-6" variant="warning">
      <div className="flex flex-col gap-1">
        {messages.map(({ link, suffix }) => (
          <div key={link}>
            Please <Link to="/account-settings">{link}</Link>
            {suffix}
          </div>
        ))}
      </div>
    </AlertBanner>
  )
}
