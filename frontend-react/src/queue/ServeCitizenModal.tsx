import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import {
  getCategories,
  getChannels,
  getServices,
  updateCitizen,
  updateServiceRequest,
} from '@/api/endpoints'
import type { Citizen, Office, Service, ServiceRequest } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import AlertBanner from '@/components/AlertBanner'
import Button from '@/components/Button'
import { DialogTitle } from '@/components/Dialog'
import ModalLayout from '@/components/ModalLayout'
import { cx } from '@/lib/cx'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/query/query-keys'
import { useWorkflowStore } from '@/store/workflow-store'

import AddCitizenModal from './AddCitizenModal'
import {
  createAddCitizenModalState,
  type AddCitizenModalState,
} from './add-citizen-modal-state'
import { getDefaultChannelId } from './add-citizen-utils'
import {
  formatQueueTime,
  getActiveService,
  getActiveServiceRequests,
  isReceptionOffice,
} from './queue-utils'
import {
  useServeCitizenLifecycleMutation,
  type ServeCitizenLifecycleAction,
} from './queue-mutations'

interface ServeCitizenModalProps {
  citizen: Citizen | null
  office: Office
}

interface ServeCitizenForm {
  accurateTimeInd: number
  activeQuantity: string
  comments: string
  counterId: number | null
  priority: number
}

export default function ServeCitizenModal({
  citizen,
  office,
}: ServeCitizenModalProps) {
  const apiClient = useApiClient()
  const activeServiceRequestId = useWorkflowStore(
    (state) => state.activeServiceRequestId,
  )
  const clearTerminalServeCitizen = useWorkflowStore(
    (state) => state.clearTerminalServeCitizen,
  )
  const closeServiceModal = useWorkflowStore((state) => state.closeServiceModal)
  const openServiceModal = useWorkflowStore((state) => state.openServiceModal)
  const serviceBegun = useWorkflowStore((state) => state.serviceBegun)
  const serveModalAlert = useWorkflowStore((state) => state.serveModalAlert)
  const setActiveServiceCitizen = useWorkflowStore(
    (state) => state.setActiveServiceCitizen,
  )
  const setServeModalAlert = useWorkflowStore(
    (state) => state.setServeModalAlert,
  )
  const showServiceModal = useWorkflowStore((state) => state.showServiceModal)
  const [serviceFormState, setServiceFormState] =
    useState<AddCitizenModalState | null>(null)
  const lifecycleMutation = useServeCitizenLifecycleMutation()
  const isPerformingAction = lifecycleMutation.isPending

  const categoriesQuery = useQuery({
    queryFn: ({ signal }) => getCategories(apiClient, signal),
    queryKey: queryKeys.categories,
  })
  const channelsQuery = useQuery({
    queryFn: ({ signal }) => getChannels(apiClient, signal),
    queryKey: queryKeys.channels,
  })
  const servicesQuery = useQuery({
    queryFn: ({ signal }) => getServices(apiClient, office.office_id, signal),
    queryKey: queryKeys.services(office.office_id),
  })

  const activeService =
    citizen?.service_reqs.find(
      (serviceRequest) => serviceRequest.sr_id === activeServiceRequestId,
    ) ?? (citizen ? getActiveService(citizen) : null)
  const serviceRequests = citizen ? getActiveServiceRequests(citizen) : []
  const [form, setForm] = useState<ServeCitizenForm>(() =>
    createFormState(citizen, activeService),
  )
  const commentsTooLong = form.comments.length > 1000
  const combinedAlert = [
    serveModalAlert,
    commentsTooLong ? commentsTooLongAlert : null,
  ]
    .filter(Boolean)
    .join('  ')

  useEffect(() => {
    // The modal keeps editable local form state and must reset when the active
    // service changes after a queue workflow transition.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(createFormState(citizen, activeService))
    setServeModalAlert(null)
  }, [activeService, citizen, setServeModalAlert])

  if (!citizen) {
    return null
  }

  function updateForm(updates: Partial<ServeCitizenForm>) {
    setForm((current) => ({ ...current, ...updates }))
  }

  async function saveBeforeLifecycle() {
    if (!citizen || !activeService) {
      throw new Error(
        'An error occurred loading citizen, please try refreshing the page.',
      )
    }

    const quantity = Number(form.activeQuantity)

    if (!/^\+?\d+$/.test(form.activeQuantity) || quantity <= 0) {
      setServeModalAlert('Quantity must be a number and greater than 0')
      throw new Error('Quantity must be a number and greater than 0')
    }

    if (quantity !== activeService.quantity) {
      await updateServiceRequest(apiClient, activeService.sr_id, {
        quantity,
      })
    }

    await updateCitizen(apiClient, citizen.citizen_id, {
      accurate_time_ind: form.accurateTimeInd,
      citizen_comments: withAppointmentPrefix(citizen, form.comments),
      counter_id: form.counterId,
      notification_email: citizen.notification_email ?? '',
      notification_phone: citizen.notification_phone ?? '',
      priority: form.priority,
      walkin_unique_id: citizen.walkin_unique_id ?? '',
    })
    setServeModalAlert(null)
  }

  async function runLifecycle(
    action: ServeCitizenLifecycleAction,
    options: {
      clear?: boolean
      reminder?: boolean
      serviceBegun?: boolean
    } = {},
  ) {
    if (!citizen) {
      return
    }

    try {
      await lifecycleMutation.mutateAsync({
        action,
        reminderCitizenId: options.reminder ? citizen.citizen_id : null,
        save: saveBeforeLifecycle,
      })

      if (options.clear) {
        clearTerminalServeCitizen(citizen.citizen_id)
      } else {
        setActiveServiceCitizen(
          citizen.citizen_id,
          activeService?.sr_id ?? null,
          options.serviceBegun ?? serviceBegun,
        )
      }
    } catch (error) {
      setServeModalAlert(getErrorMessage(error, 'Unable to update citizen.'))
    }
  }

  function openServiceForm(mode: 'add-next-service' | 'edit-service') {
    if (!citizen || !activeService || channelsQuery.isPending) {
      return
    }

    const channels = channelsQuery.data ?? []
    const services = servicesQuery.data ?? []
    const selectedService = findServiceForRequest(activeService, services)
    const nextState = createAddCitizenModalState({
      channels,
      citizen,
      mode,
      office,
      preselectedService: selectedService,
    })

    setServiceFormState({
      ...nextState,
      activeServiceRequestId:
        mode === 'edit-service' ? activeService.sr_id : null,
      channelId:
        activeService.channel_id ??
        getDefaultChannelId(channels, 'add-citizen'),
      comments: form.comments,
      counterId: form.counterId,
      notificationEmail: citizen.notification_email ?? '',
      notificationPhone: citizen.notification_phone ?? '',
      priority: form.priority,
      walkinUniqueId: citizen.walkin_unique_id ?? '',
    })
    closeServiceModal()
  }

  const actionDisabled = isPerformingAction || commentsTooLong
  const beginDisabled = actionDisabled || serviceBegun
  const serviceActionDisabled = actionDisabled || !serviceBegun

  return (
    <>
      {showServiceModal && (
        <ModalLayout
          className="max-w-5xl"
          closeDisabled={isPerformingAction}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {isReceptionOffice(office) && (
                  <select
                    aria-label="Counter"
                    className="border-bc-border focus:border-bc-form-active focus:outline-bc-focus h-10 rounded-sm border bg-white px-3 focus:outline-2 focus:outline-offset-1"
                    onChange={(event) =>
                      updateForm({
                        counterId: Number(event.target.value) || null,
                      })
                    }
                    value={form.counterId ?? ''}
                  >
                    {[...office.counters]
                      .sort((left, right) =>
                        left.counter_name.localeCompare(right.counter_name),
                      )
                      .map((counter) => (
                        <option
                          key={counter.counter_id}
                          value={counter.counter_id}
                        >
                          {counter.counter_name}
                        </option>
                      ))}
                  </select>
                )}
                <select
                  aria-label="Priority"
                  className="border-bc-border focus:border-bc-form-active focus:outline-bc-focus h-10 rounded-sm border bg-white px-3 focus:outline-2 focus:outline-offset-1"
                  onChange={(event) =>
                    updateForm({ priority: Number(event.target.value) })
                  }
                  value={form.priority}
                >
                  <option value={1}>High Priority</option>
                  <option value={2}>Default Priority</option>
                  <option value={3}>Low Priority</option>
                </select>
                <Button
                  disabled={serviceActionDisabled}
                  onClick={() => openServiceForm('add-next-service')}
                >
                  Add Next Service
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="text-bc-white flex items-center gap-2">
                  <input
                    checked={form.accurateTimeInd === 0}
                    disabled={!serviceBegun || isPerformingAction}
                    onChange={(event) =>
                      updateForm({
                        accurateTimeInd: event.target.checked ? 0 : 1,
                      })
                    }
                    type="checkbox"
                  />
                  Inaccurate Time
                </label>
                <Button
                  disabled={serviceActionDisabled}
                  onClick={() =>
                    void runLifecycle(
                      {
                        citizenId: citizen.citizen_id,
                        inaccurate: form.accurateTimeInd === 0,
                        type: 'finish-service',
                      },
                      { clear: true },
                    )
                  }
                  id="serve-citizen-finish-button"
                >
                  Finish
                </Button>
                <Button
                  disabled={serviceActionDisabled}
                  onClick={() =>
                    void runLifecycle(
                      {
                        citizenId: citizen.citizen_id,
                        type: 'place-on-hold',
                      },
                      { clear: true },
                    )
                  }
                  variant="secondary"
                  id="serve-citizen-place-on-hold-button"
                >
                  Place on Hold
                </Button>
              </div>
            </div>
          }
          footerClassName="bg-bc-secondary"
          header={
            <DialogTitle className="text-bc-h4 text-bc-secondary m-0 font-bold">
              Serve Citizen
            </DialogTitle>
          }
          onClose={closeServiceModal}
        >
          <div className="bg-bc-light-gray px-6 py-4">
            {combinedAlert && (
              <AlertBanner
                className="mb-3"
                isCloseable={false}
                role="alert"
                size="small"
                variant="warning"
              >
                {combinedAlert}
              </AlertBanner>
            )}

            <div className="grid grid-cols-[minmax(12rem,1fr)_auto_minmax(0,2fr)] gap-4">
              <div>
                {citizen.citizen_name && (
                  <p className="m-0 font-bold">{citizen.citizen_name}</p>
                )}
                <p className="m-0">
                  Ticket #: <strong>{citizen.ticket_number}</strong>
                </p>
                <p className="m-0">
                  Channel:{' '}
                  <strong>{activeService?.channel?.channel_name ?? ''}</strong>
                </p>
                <p className="m-0">
                  Created At:{' '}
                  <strong>{formatQueueTime(citizen.start_time)}</strong>
                </p>
              </div>
              <label
                className="text-bc-small text-bc-secondary pt-2 font-bold"
                htmlFor="serve-citizen-comments"
              >
                Comments:
              </label>
              <textarea
                className="border-bc-border focus:border-bc-form-active focus:outline-bc-focus min-h-24 rounded-sm border bg-white px-3 py-2 focus:outline-2 focus:outline-offset-1"
                id="serve-citizen-comments"
                maxLength={1000}
                onChange={(event) =>
                  updateForm({ comments: event.target.value })
                }
                value={form.comments}
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex gap-2">
                {isReceptionOffice(office) && (
                  <Button
                    className={cx(
                      !serviceBegun &&
                        'animate-pulse border border-yellow-700 bg-yellow-300 text-black hover:bg-yellow-300',
                    )}
                    disabled={beginDisabled}
                    onClick={() =>
                      void runLifecycle(
                        {
                          citizenId: citizen.citizen_id,
                          type: 'begin-service',
                        },
                        { reminder: true, serviceBegun: true },
                      )
                    }
                    id="serve-citizen-begin-service-button"
                  >
                    Begin Service
                  </Button>
                )}
                {isReceptionOffice(office) && (
                  <Button
                    disabled={actionDisabled}
                    onClick={() =>
                      void runLifecycle(
                        {
                          citizenId: citizen.citizen_id,
                          type: 'add-to-queue',
                        },
                        { clear: true },
                      )
                    }
                    variant="secondary"
                    id="serve-citizen-return-to-queue-button"
                  >
                    Return to Queue
                  </Button>
                )}
              </div>
              {isReceptionOffice(office) && (
                <Button
                  danger
                  disabled={actionDisabled}
                  onClick={() =>
                    void runLifecycle(
                      {
                        citizenId: citizen.citizen_id,
                        type: 'citizen-left',
                      },
                      { clear: true, reminder: true },
                    )
                  }
                  id="serve-citizen-citizen-left-button"
                >
                  Citizen Left
                </Button>
              )}
            </div>
          </div>

          <ServiceRequestsTable
            activeServiceRequestId={activeService?.sr_id ?? null}
            activeQuantity={form.activeQuantity}
            disabled={isPerformingAction}
            onActivate={(serviceRequestId) =>
              void runLifecycle(
                {
                  serviceRequestId,
                  type: 'activate-service-request',
                },
                { serviceBegun },
              )
            }
            onEdit={() => openServiceForm('edit-service')}
            onQuantityChange={(activeQuantity) =>
              updateForm({ activeQuantity })
            }
            serviceRequests={serviceRequests}
          />
        </ModalLayout>
      )}

      <AddCitizenModal
        categories={categoriesQuery.data ?? []}
        channels={channelsQuery.data ?? []}
        isOpen={serviceFormState !== null}
        office={office}
        onClose={() => setServiceFormState(null)}
        onReturnToServe={openServiceModal}
        services={servicesQuery.data ?? []}
        state={serviceFormState}
      />
    </>
  )
}

function ServiceRequestsTable({
  activeQuantity,
  activeServiceRequestId,
  disabled,
  onActivate,
  onEdit,
  onQuantityChange,
  serviceRequests,
}: {
  activeQuantity: string
  activeServiceRequestId: number | null
  disabled: boolean
  onActivate: (serviceRequestId: number) => void
  onEdit: () => void
  onQuantityChange: (quantity: string) => void
  serviceRequests: ServiceRequest[]
}) {
  return (
    <div className="bg-bc-light-gray px-6 py-4">
      <div className="border-bc-border max-h-72 overflow-auto border bg-white">
        <table className="w-full border-collapse text-center">
          <thead className="bg-bc-secondary text-bc-white sticky top-0">
            <tr>
              <th className="border-bc-border border-b px-3 py-2 font-normal">
                Status
              </th>
              <th className="border-bc-border border-b px-3 py-2 font-normal">
                Category
              </th>
              <th className="border-bc-border border-b px-3 py-2 font-normal">
                Service
              </th>
              <th className="border-bc-border border-b px-3 py-2 font-normal">
                Quantity
              </th>
              <th className="border-bc-border border-b px-3 py-2 font-normal">
                Change Service
              </th>
            </tr>
          </thead>
          <tbody>
            {serviceRequests.map((serviceRequest) => {
              const active = serviceRequest.sr_id === activeServiceRequestId

              return (
                <tr
                  className={active ? 'bg-blue-50' : undefined}
                  key={serviceRequest.sr_id}
                >
                  <td className="border-bc-border border-t px-3 py-2 font-bold">
                    {active ? 'Active' : 'Inactive'}
                  </td>
                  <td className="border-bc-border border-t px-3 py-2">
                    {serviceRequest.service.parent?.service_name ?? ''}
                  </td>
                  <td className="border-bc-border border-t px-3 py-2">
                    {serviceRequest.service.service_name}
                  </td>
                  <td className="border-bc-border border-t px-3 py-2">
                    {active ? (
                      <input
                        aria-label="Active service quantity"
                        className="border-bc-border focus:border-bc-form-active focus:outline-bc-focus h-8 w-20 rounded-sm border px-2 text-center focus:outline-2 focus:outline-offset-1"
                        onChange={(event) =>
                          onQuantityChange(event.target.value)
                        }
                        value={activeQuantity}
                      />
                    ) : (
                      (serviceRequest.quantity ?? '')
                    )}
                  </td>
                  <td className="border-bc-border border-t px-3 py-2">
                    {active ? (
                      <Button
                        disabled={disabled}
                        onClick={onEdit}
                        size="small"
                        variant="link"
                      >
                        edit
                      </Button>
                    ) : (
                      <Button
                        disabled={disabled}
                        onClick={() => onActivate(serviceRequest.sr_id)}
                        size="small"
                        variant="link"
                      >
                        make active
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const commentsTooLongAlert =
  'You have entered more than the 1,000 characters allowed for comments.'

function createFormState(
  citizen: Citizen | null,
  activeService: ServiceRequest | null | undefined,
): ServeCitizenForm {
  return {
    accurateTimeInd: citizen?.accurate_time_ind ?? 1,
    activeQuantity: String(activeService?.quantity ?? 1),
    comments: getEditableComments(citizen),
    counterId: citizen?.counter_id ?? null,
    priority: citizen?.priority ?? 2,
  }
}

function getEditableComments(citizen: Citizen | null) {
  const comments = citizen?.citizen_comments ?? ''

  if (!comments.includes('|||')) {
    return comments
  }

  return comments.split('|||')[1] ?? ''
}

function withAppointmentPrefix(citizen: Citizen, comments: string) {
  const previous = citizen.citizen_comments ?? ''

  if (!previous.includes('|||')) {
    return comments
  }

  return `${previous.split('|||')[0]}|||${comments}`
}

function findServiceForRequest(
  serviceRequest: ServiceRequest,
  services: Service[],
) {
  const serviceId = serviceRequest.service_id
  const service =
    services.find((item) => item.service_id === serviceId) ??
    services.find(
      (item) => item.service_name === serviceRequest.service.service_name,
    )

  if (!service) {
    return null
  }

  return {
    service_id: service.service_id,
    service_name: service.service_name,
  }
}
