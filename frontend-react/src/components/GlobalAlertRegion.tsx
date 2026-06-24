import { Link } from 'react-router'

import AlertBanner from '@/components/AlertBanner'
import { cx } from '@/lib/cx'
import { useWorkflowStore } from '@/store/workflow-store'

export default function GlobalAlertRegion() {
  const alerts = useWorkflowStore((state) => state.globalAlerts)
  const dismissGlobalAlert = useWorkflowStore(
    (state) => state.dismissGlobalAlert,
  )

  if (alerts.length === 0) {
    return null
  }

  return (
    <>
      {alerts.map((alert) => (
        <AlertBanner
          isCloseable={alert.isCloseable ?? true}
          key={alert.id}
          onClose={() => dismissGlobalAlert(alert.id)}
          role={alert.role ?? 'status'}
          variant={alert.variant ?? 'info'}
        >
          <span>{alert.message}</span>
          {alert.action && (
            <Link
              className={cx(
                'rounded-sm font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2',
                alert.variant === 'warning'
                  ? 'text-bc-primary focus-visible:outline-bc-primary'
                  : 'text-bc-white focus-visible:outline-bc-white',
              )}
              to={alert.action.to}
            >
              {alert.action.label}
            </Link>
          )}
        </AlertBanner>
      ))}
    </>
  )
}

export { GlobalAlertRegion }
