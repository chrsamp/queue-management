import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import type { QueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'

import {
  getCitizens,
  getCurrentCsr,
  getOffices,
  loginAdminSession,
} from '@/api/endpoints'
import { ApiError } from '@/api/errors'
import type { Office } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import {
  buildAdminFrameUrl,
  getAdminOptions,
  getDefaultAdminView,
  isAdminRole,
  keyToAdminView,
  type AdminView,
} from '@/app/admin'
import {
  getEnvironmentStripClassName,
  getHeaderTitle,
  getNavigationUsername,
} from '@/app/app-shell-utils'
import { useAuth } from '@/auth/use-auth'
import BookingsWorkspace from '@/bookings/BookingsWorkspace'
import Button from '@/components/Button'
import CounterSwitcher from '@/components/CounterSwitcher'
import CsrStatusSwitch from '@/components/CsrStatusSwitch'
import GlobalAlertRegion from '@/components/GlobalAlertRegion'
import Header from '@/components/Header'
import HeaderNavigationMenu from '@/components/HeaderNavigationMenu'
import OfficeSwitcher from '@/components/OfficeSwitcher'
import Select from '@/components/Select'
import Subheader from '@/components/Subheader'
import { queryKeys } from '@/query/query-keys'
import AgendaPanel from '@/appointments/AgendaPanel'
import AppointmentsWorkspace from '@/appointments/AppointmentsWorkspace'
import ExamsWorkspace from '@/exams/ExamsWorkspace'
import { appointmentsEnabled } from '@/appointments/appointment-utils'
import GaPanel from '@/queue/GaPanel'
import QueueWorkspace from '@/queue/QueueWorkspace'
import { useWorkflowStore } from '@/store/workflow-store'

interface AppProps {
  adminBaseUrl: string
  queryClient: QueryClient
  supportUrl: string
}

const examActionItemsAlertId = 'exam-action-items'

function App({ adminBaseUrl, queryClient, supportUrl }: AppProps) {
  const auth = useAuth()
  const apiClient = useApiClient()
  const clearGlobalAlert = useWorkflowStore((state) => state.clearGlobalAlert)
  const clearWorkflow = useWorkflowStore((state) => state.clearWorkflow)
  const currentRoleCode = useWorkflowStore((state) => state.currentRoleCode)
  const currentOffice = useWorkflowStore((state) => state.currentOffice)
  const resetDismissedGlobalAlert = useWorkflowStore(
    (state) => state.resetDismissedGlobalAlert,
  )
  const setCurrentCsr = useWorkflowStore((state) => state.setCurrentCsr)
  const setGlobalAlert = useWorkflowStore((state) => state.setGlobalAlert)
  const location = useLocation()
  const headerTitle = getHeaderTitle(location.pathname)
  const showQueueSubheader =
    auth.authenticated && location.pathname === '/queue'
  const environmentStripClassName = getEnvironmentStripClassName(
    typeof window === 'undefined' ? '' : window.location.host,
  )

  const currentCsrQuery = useQuery({
    enabled: auth.authenticated,
    queryFn: ({ signal }) => getCurrentCsr(apiClient, signal),
    queryKey: queryKeys.csrs.me,
    retry: false,
  })

  useEffect(() => {
    if (currentCsrQuery.data) {
      setCurrentCsr(currentCsrQuery.data.csr)
    } else if (!auth.authenticated || currentCsrQuery.isError) {
      clearWorkflow()
    }
  }, [
    auth.authenticated,
    clearWorkflow,
    currentCsrQuery.data,
    currentCsrQuery.isError,
    setCurrentCsr,
  ])

  useEffect(() => {
    const csr = currentCsrQuery.data?.csr
    const canSeeExamActionItems =
      csr?.office_manager === 1 || csr?.role.role_code === 'GA'

    if (currentCsrQuery.data?.attention_needed && canSeeExamActionItems) {
      setGlobalAlert({
        action: {
          label: 'Show',
          to: '/exams?quickAction=oemai&examType=all',
        },
        id: examActionItemsAlertId,
        isCloseable: true,
        message: 'Office Exam Manager Action Items are present',
        role: 'status',
        variant: 'info',
      })
      return
    }

    clearGlobalAlert(examActionItemsAlertId)
    resetDismissedGlobalAlert(examActionItemsAlertId)
  }, [
    clearGlobalAlert,
    currentCsrQuery.data,
    resetDismissedGlobalAlert,
    setGlobalAlert,
  ])

  async function handleLogout() {
    clearWorkflow()
    queryClient.clear()
    await auth.logout()
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden">
      <div className="z-40 w-full shrink-0">
        {environmentStripClassName && (
          <div
            aria-hidden="true"
            className={`h-2 w-full shrink-0 ${environmentStripClassName}`}
          />
        )}
        <GlobalAlertRegion />
        <Header
          skipLinks={[{ href: '#main', label: 'Skip to main content' }]}
          sticky={false}
          title={headerTitle}
          titleAs="h1"
        >
          <div className="flex items-center gap-6">
            {auth.authenticated && auth.username && (
              <div className="flex min-w-0 flex-col items-end">
                <OfficeSwitcher />
              </div>
            )}
            {auth.authenticated ? (
              <HeaderNavigationMenu
                currentOffice={currentOffice}
                currentRoleCode={currentRoleCode}
                onLogout={handleLogout}
                username={getNavigationUsername(
                  auth.displayName,
                  auth.username,
                )}
              />
            ) : (
              <Button onClick={() => void auth.login()}>Login</Button>
            )}
          </div>
        </Header>
        {showQueueSubheader && (
          <QueueSubheader
            currentOffice={currentOffice}
            currentRoleCode={currentRoleCode}
          />
        )}
      </div>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden" id="main">
        <Routes>
          <Route element={<HomePage />} path="/" />
          <Route
            element={<QueueRoute supportUrl={supportUrl} />}
            path="/queue"
          />
          <Route
            element={<AppointmentsRoute supportUrl={supportUrl} />}
            path="/appointments"
          />
          <Route
            element={<BookingsRoute supportUrl={supportUrl} />}
            path="/booking"
          />
          <Route
            element={<ExamsRoute supportUrl={supportUrl} />}
            path="/exams"
          />
          <Route
            element={
              <AdminRoute adminBaseUrl={adminBaseUrl} supportUrl={supportUrl} />
            }
            path="/admin"
          />
          <Route element={<Navigate replace to="/queue" />} path="*" />
        </Routes>
      </main>
    </div>
  )
}

function QueueSubheader({
  currentOffice,
  currentRoleCode,
}: {
  currentOffice: Office | null
  currentRoleCode: string | null
}) {
  const apiClient = useApiClient()
  const currentCsrId = useWorkflowStore((state) => state.currentCsrId)
  const showAgenda = useWorkflowStore((state) => state.showAgenda)
  const setShowAgenda = useWorkflowStore((state) => state.setShowAgenda)
  const [isGaPanelOpen, setIsGaPanelOpen] = useState(false)
  const canOpenGaPanel =
    currentRoleCode === 'GA' || currentRoleCode === 'SUPPORT'
  const canShowAgenda =
    currentOffice !== null && appointmentsEnabled(currentOffice)

  const citizensQuery = useQuery({
    enabled: canOpenGaPanel,
    queryFn: ({ signal }) => getCitizens(apiClient, signal),
    queryKey: queryKeys.citizens,
  })

  const startItems =
    currentCsrId === null
      ? []
      : [
          <CsrStatusSwitch key="csr-status" />,
          <CounterSwitcher key="counter" />,
        ]
  const endItems = [
    canShowAgenda ? (
      <Button
        key="agenda"
        onClick={() => setShowAgenda(!showAgenda)}
        size="small"
        variant="secondary"
      >
        Agenda
      </Button>
    ) : null,
    canOpenGaPanel && currentOffice ? (
      <Button
        disabled={citizensQuery.isPending}
        key="ga-panel"
        onClick={() => setIsGaPanelOpen(true)}
        size="small"
        variant="secondary"
      >
        GA Panel
      </Button>
    ) : null,
  ]

  return (
    <>
      <Subheader
        ariaLabel="Queue management controls"
        endItems={endItems}
        size="medium"
        startItems={startItems}
      />
      {canShowAgenda && currentOffice && (
        <AgendaPanel
          isOpen={showAgenda}
          office={currentOffice}
          onClose={() => setShowAgenda(false)}
        />
      )}
      {canOpenGaPanel && currentOffice && (
        <GaPanel
          citizens={citizensQuery.data ?? []}
          isOpen={isGaPanelOpen}
          office={currentOffice}
          onClose={() => setIsGaPanelOpen(false)}
        />
      )}
    </>
  )
}

function HomePage() {
  const auth = useAuth()

  if (auth.authenticated) {
    return <Navigate replace to="/queue" />
  }

  return (
    <section className="flex flex-col gap-6 p-6">
      <div className="max-w-3xl">
        <h2 className="text-bc-h4 mt-0 mb-3 font-bold">
          Staff queue management
        </h2>
        <p className="text-bc-body text-bc-secondary m-0">
          Sign in to open the staff queue workspace.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void auth.login()}>Login</Button>
      </div>

      {auth.error && (
        <p className="border-bc-gold-60 bg-bc-light-gray text-bc-body m-0 border-l-4 p-4">
          {auth.error}
        </p>
      )}
    </section>
  )
}

function QueueRoute({ supportUrl }: { supportUrl: string }) {
  const auth = useAuth()
  const location = useLocation()

  if (!auth.authenticated) {
    return <UnauthenticatedQueue />
  }

  return <AuthenticatedQueue key={location.key} supportUrl={supportUrl} />
}

function UnauthenticatedQueue() {
  return <UnauthenticatedStaffRoute title="Queue" />
}

function AppointmentsRoute({ supportUrl }: { supportUrl: string }) {
  const auth = useAuth()
  const location = useLocation()

  if (!auth.authenticated) {
    return <UnauthenticatedStaffRoute title="Appointments" />
  }

  return (
    <AuthenticatedAppointments key={location.key} supportUrl={supportUrl} />
  )
}

function BookingsRoute({ supportUrl }: { supportUrl: string }) {
  const auth = useAuth()
  const location = useLocation()

  if (!auth.authenticated) {
    return <UnauthenticatedStaffRoute title="Room Bookings" />
  }

  return <AuthenticatedBookings key={location.key} supportUrl={supportUrl} />
}

function ExamsRoute({ supportUrl }: { supportUrl: string }) {
  const auth = useAuth()
  const location = useLocation()

  if (!auth.authenticated) {
    return <UnauthenticatedStaffRoute title="Exams" />
  }

  return <AuthenticatedExams key={location.key} supportUrl={supportUrl} />
}

function UnauthenticatedStaffRoute({ title }: { title: string }) {
  const auth = useAuth()

  return (
    <section className="flex flex-col gap-5 p-6">
      <div>
        <h2 className="text-bc-h4 mt-0 mb-3 font-bold">{title}</h2>
        <p className="text-bc-body text-bc-secondary m-0">
          You must be signed in before accessing the staff application.
        </p>
      </div>
      <Button onClick={() => void auth.login()}>Login</Button>
    </section>
  )
}

function AuthenticatedQueue({ supportUrl }: { supportUrl: string }) {
  const apiClient = useApiClient()
  const clearWorkflow = useWorkflowStore((state) => state.clearWorkflow)
  const currentOffice = useWorkflowStore((state) => state.currentOffice)
  const setCurrentCsr = useWorkflowStore((state) => state.setCurrentCsr)

  const currentCsrQuery = useQuery({
    queryFn: ({ signal }) => getCurrentCsr(apiClient, signal),
    queryKey: queryKeys.csrs.me,
    refetchOnMount: 'always',
    retry: false,
  })

  useQuery({
    enabled: currentCsrQuery.isSuccess,
    queryFn: ({ signal }) => getOffices(apiClient, signal),
    queryKey: queryKeys.offices,
  })

  const citizensQuery = useQuery({
    enabled: currentCsrQuery.isSuccess,
    queryFn: ({ signal }) => getCitizens(apiClient, signal),
    queryKey: queryKeys.citizens,
  })

  useEffect(() => {
    if (currentCsrQuery.data) {
      setCurrentCsr(currentCsrQuery.data.csr)
    } else if (currentCsrQuery.isError) {
      clearWorkflow()
    }
  }, [
    clearWorkflow,
    currentCsrQuery.data,
    currentCsrQuery.isError,
    setCurrentCsr,
  ])

  if (currentCsrQuery.isPending) {
    return (
      <section className="p-6">
        <p className="text-bc-body text-bc-secondary m-0">
          Loading your staff profile...
        </p>
      </section>
    )
  }

  if (currentCsrQuery.isError) {
    return (
      <UserNotConfigured
        error={currentCsrQuery.error}
        supportUrl={supportUrl}
      />
    )
  }

  const csr = currentCsrQuery.data.csr
  const office = currentOffice ?? csr.office

  return (
    <QueueWorkspace
      citizens={citizensQuery.data ?? []}
      errorMessage={
        citizensQuery.isError
          ? getRouteErrorMessage(citizensQuery.error, 'Unable to load queue.')
          : null
      }
      isLoading={citizensQuery.isPending}
      office={office}
      csrId={csr.csr_id}
    />
  )
}

function AuthenticatedAppointments({ supportUrl }: { supportUrl: string }) {
  const apiClient = useApiClient()
  const clearWorkflow = useWorkflowStore((state) => state.clearWorkflow)
  const currentOffice = useWorkflowStore((state) => state.currentOffice)
  const setCurrentCsr = useWorkflowStore((state) => state.setCurrentCsr)

  const currentCsrQuery = useQuery({
    queryFn: ({ signal }) => getCurrentCsr(apiClient, signal),
    queryKey: queryKeys.csrs.me,
    refetchOnMount: 'always',
    retry: false,
  })

  useEffect(() => {
    if (currentCsrQuery.data) {
      setCurrentCsr(currentCsrQuery.data.csr)
    } else if (currentCsrQuery.isError) {
      clearWorkflow()
    }
  }, [
    clearWorkflow,
    currentCsrQuery.data,
    currentCsrQuery.isError,
    setCurrentCsr,
  ])

  if (currentCsrQuery.isPending) {
    return (
      <section className="p-6">
        <p className="text-bc-body text-bc-secondary m-0">
          Loading your staff profile...
        </p>
      </section>
    )
  }

  if (currentCsrQuery.isError) {
    return (
      <UserNotConfigured
        error={currentCsrQuery.error}
        supportUrl={supportUrl}
      />
    )
  }

  const csr = currentCsrQuery.data.csr
  const office = currentOffice ?? csr.office

  return (
    <AppointmentsWorkspace
      office={office}
      recurringFeatureFlag={currentCsrQuery.data.recurring_feature_flag}
      roleCode={csr.role.role_code}
      username={csr.username}
    />
  )
}

function AuthenticatedBookings({ supportUrl }: { supportUrl: string }) {
  const apiClient = useApiClient()
  const clearWorkflow = useWorkflowStore((state) => state.clearWorkflow)
  const currentOffice = useWorkflowStore((state) => state.currentOffice)
  const setCurrentCsr = useWorkflowStore((state) => state.setCurrentCsr)

  const currentCsrQuery = useQuery({
    queryFn: ({ signal }) => getCurrentCsr(apiClient, signal),
    queryKey: queryKeys.csrs.me,
    refetchOnMount: 'always',
    retry: false,
  })

  useEffect(() => {
    if (currentCsrQuery.data) {
      setCurrentCsr(currentCsrQuery.data.csr)
    } else if (currentCsrQuery.isError) {
      clearWorkflow()
    }
  }, [
    clearWorkflow,
    currentCsrQuery.data,
    currentCsrQuery.isError,
    setCurrentCsr,
  ])

  if (currentCsrQuery.isPending) {
    return (
      <section className="p-6">
        <p className="text-bc-body text-bc-secondary m-0">
          Loading your staff profile...
        </p>
      </section>
    )
  }

  if (currentCsrQuery.isError) {
    return (
      <UserNotConfigured
        error={currentCsrQuery.error}
        supportUrl={supportUrl}
      />
    )
  }

  const csr = currentCsrQuery.data.csr
  const office = currentOffice ?? csr.office

  if (office.exams_enabled_ind !== 1) {
    return (
      <section className="flex flex-col gap-4 p-6" role="alert">
        <h2 className="text-bc-h4 mt-0 mb-0 font-bold">Access unavailable</h2>
        <p className="text-bc-body text-bc-secondary m-0">
          Room bookings are not enabled for this office.
        </p>
      </section>
    )
  }

  return (
    <BookingsWorkspace
      office={office}
      recurringFeatureFlag={currentCsrQuery.data.recurring_feature_flag}
      roleCode={csr.role.role_code}
      username={csr.username}
    />
  )
}

function AuthenticatedExams({ supportUrl }: { supportUrl: string }) {
  const apiClient = useApiClient()
  const clearWorkflow = useWorkflowStore((state) => state.clearWorkflow)
  const currentOffice = useWorkflowStore((state) => state.currentOffice)
  const setCurrentCsr = useWorkflowStore((state) => state.setCurrentCsr)

  const currentCsrQuery = useQuery({
    queryFn: ({ signal }) => getCurrentCsr(apiClient, signal),
    queryKey: queryKeys.csrs.me,
    refetchOnMount: 'always',
    retry: false,
  })

  useEffect(() => {
    if (currentCsrQuery.data) {
      setCurrentCsr(currentCsrQuery.data.csr)
    } else if (currentCsrQuery.isError) {
      clearWorkflow()
    }
  }, [
    clearWorkflow,
    currentCsrQuery.data,
    currentCsrQuery.isError,
    setCurrentCsr,
  ])

  if (currentCsrQuery.isPending) {
    return (
      <section className="p-6">
        <p className="text-bc-body text-bc-secondary m-0">
          Loading your staff profile...
        </p>
      </section>
    )
  }

  if (currentCsrQuery.isError) {
    return (
      <UserNotConfigured
        error={currentCsrQuery.error}
        supportUrl={supportUrl}
      />
    )
  }

  const csr = currentCsrQuery.data.csr
  const office = currentOffice ?? csr.office

  if (office.exams_enabled_ind !== 1) {
    return (
      <section className="flex flex-col gap-4 p-6">
        <h2 className="text-bc-h4 mt-0 mb-0 font-bold">Coming Soon!</h2>
      </section>
    )
  }

  return <ExamsWorkspace csr={csr} office={office} />
}

function getRouteErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

function AdminRoute({
  adminBaseUrl,
  supportUrl,
}: {
  adminBaseUrl: string
  supportUrl: string
}) {
  const auth = useAuth()
  const apiClient = useApiClient()
  const setCurrentCsr = useWorkflowStore((state) => state.setCurrentCsr)
  const [selectedAdminView, setSelectedAdminView] = useState<AdminView | null>(
    null,
  )

  const currentCsrQuery = useQuery({
    enabled: auth.authenticated,
    queryFn: ({ signal }) => getCurrentCsr(apiClient, signal),
    queryKey: queryKeys.csrs.me,
    retry: false,
  })

  const roleCode = currentCsrQuery.data?.csr.role.role_code ?? null
  const adminOptions = getAdminOptions(roleCode)
  const adminView = selectedAdminView ?? getDefaultAdminView(roleCode)

  useEffect(() => {
    if (currentCsrQuery.data) {
      setCurrentCsr(currentCsrQuery.data.csr)
    }
  }, [currentCsrQuery.data, setCurrentCsr])

  const adminSessionQuery = useQuery({
    enabled: auth.authenticated && isAdminRole(roleCode),
    queryFn: ({ signal }) => loginAdminSession(apiClient, signal),
    queryKey: ['admin-session'],
    retry: false,
    staleTime: Infinity,
  })

  if (!auth.authenticated) {
    return <UnauthenticatedStaffRoute title="Admin" />
  }

  if (currentCsrQuery.isPending) {
    return (
      <section className="p-6">
        <h2 className="text-bc-h4 mt-0 mb-3 font-bold">Admin</h2>
        <p className="text-bc-body text-bc-secondary m-0">
          Loading your staff profile...
        </p>
      </section>
    )
  }

  if (currentCsrQuery.isError) {
    return (
      <UserNotConfigured
        error={currentCsrQuery.error}
        supportUrl={supportUrl}
      />
    )
  }

  if (!isAdminRole(roleCode)) {
    return (
      <section className="flex flex-col gap-4 p-6" role="alert">
        <h2 className="text-bc-h4 mt-0 mb-0 font-bold">Access unavailable</h2>
        <p className="text-bc-body text-bc-secondary m-0">
          Your account does not have access to the administration console.
        </p>
      </section>
    )
  }

  if (adminSessionQuery.isPending) {
    return (
      <section className="p-6">
        <h2 className="text-bc-h4 mt-0 mb-3 font-bold">Admin</h2>
        <p className="text-bc-body text-bc-secondary m-0">
          Opening the administration console...
        </p>
      </section>
    )
  }

  if (adminSessionQuery.isError) {
    return (
      <section className="flex flex-col gap-4 p-6" role="alert">
        <h2 className="text-bc-h4 mt-0 mb-0 font-bold">Admin unavailable</h2>
        <p className="text-bc-body text-bc-secondary m-0">
          The administration console could not be opened. Please try again.
        </p>
        <p className="text-bc-small text-bc-secondary m-0">
          Admin session request failed.
        </p>
      </section>
    )
  }

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
      <div className="flex w-full shrink-0 items-center gap-4">
        {adminOptions.length > 0 ? (
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-bc-body font-bold">Editing:</span>
            <Select
              aria-label="Admin section"
              className="w-72"
              items={adminOptions}
              onSelectionChange={(key) => {
                if (key !== null) {
                  setSelectedAdminView(keyToAdminView(key))
                }
              }}
              selectedKey={adminView}
              size="small"
            />
          </div>
        ) : (
          <p className="text-bc-body m-0 font-bold">
            Editing: {roleCode === 'ANALYTICS' ? 'Provided Services' : 'CSRs'}
          </p>
        )}
      </div>
      <iframe
        className="border-bc-border min-h-0 w-full flex-1 rounded-lg border py-6"
        src={buildAdminFrameUrl(adminBaseUrl, adminView)}
        title="Admin"
      />
    </section>
  )
}

function UserNotConfigured({
  error,
  supportUrl,
}: {
  error: Error
  supportUrl: string
}) {
  const status =
    error instanceof ApiError && error.status ? ` (${error.status})` : ''
  const opensInNewWindow = /^https?:/i.test(supportUrl)

  return (
    <section className="flex flex-col gap-4 p-6" role="alert">
      <h2 className="text-bc-h4 mt-0 mb-0 font-bold">Access unavailable</h2>
      <p className="text-bc-body text-bc-secondary m-0">
        Your account is not set up. Please{' '}
        <a
          className="text-bc-link underline"
          href={supportUrl}
          rel={opensInNewWindow ? 'noreferrer' : undefined}
          target={opensInNewWindow ? '_blank' : undefined}
        >
          contact support
        </a>{' '}
        to request access.
      </p>
      <p className="text-bc-small text-bc-secondary m-0">
        Staff profile request failed{status}.
      </p>
    </section>
  )
}

export default App
