import AlertBanner from '@/components/AlertBanner'
import { useWorkflowStore } from '@/store/workflow-store'

export default function GlobalAlertRegion() {
  const alert = useWorkflowStore((state) => state.globalAlert)
  const clearGlobalAlert = useWorkflowStore((state) => state.clearGlobalAlert)

  if (!alert) {
    return null
  }

  return (
    <AlertBanner
      isCloseable={alert.isCloseable ?? true}
      onClose={clearGlobalAlert}
      role={alert.role ?? 'status'}
      variant={alert.variant ?? 'info'}
    >
      {alert.message}
    </AlertBanner>
  )
}

export { GlobalAlertRegion }
