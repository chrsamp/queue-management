import { useEffect, useMemo, useRef, useState } from 'react'
import { HandHelping, UserRoundPlus } from 'lucide-react'

import type { Category, Channel, Citizen, Office, Service } from '@/api/schemas'
import {
  addCitizenToQueue,
  beginCitizenService,
  createServiceRequest,
  markCitizenLeft,
  updateCitizen,
  updateServiceRequest,
} from '@/api/endpoints'
import { useApiClient } from '@/api/use-api-client'
import AlertBanner from '@/components/AlertBanner'
import Button from '@/components/Button'
import Dialog, { DialogTitle } from '@/components/Dialog'
import Modal from '@/components/Modal'
import ServicePicker from '@/components/ServicePicker'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/query/query-keys'
import { useQueryClient } from '@tanstack/react-query'

import {
  formatNotificationPhone,
  getModeServices,
  isValidNotificationEmail,
  isValidNotificationPhone,
} from './add-citizen-utils'
import { createUuid } from '@/lib/uuid'
import type { AddCitizenModalState } from './add-citizen-modal-state'
import { getWaitingCitizens, isReceptionOffice } from './queue-utils'

interface AddCitizenModalProps {
  categories: Category[]
  channels: Channel[]
  citizens: Citizen[]
  isOpen: boolean
  office: Office
  onClose: () => void
  onBeginService?: (citizenId: number) => void
  onReturnToServe?: () => void
  services: Service[]
  state: AddCitizenModalState | null
}

export default function AddCitizenModal({
  categories,
  channels,
  citizens,
  isOpen,
  office,
  onClose,
  onBeginService,
  onReturnToServe,
  services,
  state,
}: AddCitizenModalProps) {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const commentsRef = useRef<HTMLTextAreaElement | null>(null)
  const [form, setForm] = useState(state)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [isPerformingAction, setIsPerformingAction] = useState(false)

  useEffect(() => {
    // The modal keeps editable local form state and must reset when a new
    // citizen/service workflow opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(state)
    setAlertMessage(null)
    setIsPerformingAction(false)
  }, [state])

  useEffect(() => {
    if (!isOpen || !form) {
      return
    }

    window.setTimeout(() => {
      if (isReceptionOffice(office)) {
        commentsRef.current?.focus()
      } else {
        searchInputRef.current?.focus()
      }
    }, 0)
  }, [form, isOpen, office])

  const isReception = isReceptionOffice(office)
  const showNotifications = office.check_in_notification === 1
  const modeServices = useMemo(
    () => (form ? getModeServices(services, form.mode) : []),
    [form, services],
  )
  const selectedService = form?.selectedServiceId
    ? services.find((service) => service.service_id === form.selectedServiceId)
    : null
  const serviceModalMode =
    form?.mode === 'add-next-service' || form?.mode === 'edit-service'
  const commentsTooLong = (form?.comments.length ?? 0) > 1000
  const hasInvalidNotification =
    !!form &&
    (!isValidNotificationPhone(form.notificationPhone) ||
      !isValidNotificationEmail(form.notificationEmail))
  const baseActionDisabled =
    isPerformingAction ||
    commentsTooLong ||
    hasInvalidNotification ||
    !form?.citizen.citizen_id
  const actionDisabled =
    baseActionDisabled || !form?.selectedServiceId || !form?.channelId

  function updateForm(updates: Partial<AddCitizenModalState>) {
    setForm((current) => (current ? { ...current, ...updates } : current))
  }

  function setNotificationPhone(value: string) {
    const notificationPhone = formatNotificationPhone(value)
    updateForm({
      notificationPhone,
      walkinUniqueId:
        notificationPhone || form?.notificationEmail ? createUuid() : '',
    })
  }

  function setNotificationEmail(notificationEmail: string) {
    updateForm({
      notificationEmail,
      walkinUniqueId:
        form?.notificationPhone || notificationEmail ? createUuid() : '',
    })
  }

  function selectService(service: Service) {
    updateForm({
      search: service.service_name,
      selectedServiceId: service.service_id,
    })
  }

  async function saveCitizenBase(current: AddCitizenModalState) {
    await updateCitizen(apiClient, current.citizen.citizen_id, {
      citizen_comments: current.comments,
      counter_id: current.counterId,
      notification_email: current.notificationEmail,
      notification_phone: current.notificationPhone,
      priority: current.priority,
      walkin_unique_id: current.walkinUniqueId,
    })
  }

  async function createSelectedServiceRequest(current: AddCitizenModalState) {
    if (!current.selectedServiceId || !current.channelId) {
      return
    }

    await createServiceRequest(apiClient, {
      channel_id: current.channelId,
      citizen_id: current.citizen.citizen_id,
      priority: current.priority,
      quantity: 1,
      service_id: current.selectedServiceId,
    })
  }

  function validateRequired(current: AddCitizenModalState) {
    if (!current.selectedServiceId) {
      setAlertMessage('You must select a service')
      return false
    }

    if (!current.channelId) {
      setAlertMessage('You must select a channel')
      return false
    }

    return true
  }

  async function handleAddToQueue(nextForm = form) {
    if (!nextForm || !validateRequired(nextForm)) {
      return
    }

    setIsPerformingAction(true)
    setAlertMessage(null)

    try {
      await saveCitizenBase(nextForm)
      await createSelectedServiceRequest(nextForm)
      await addCitizenToQueue(apiClient, nextForm.citizen.citizen_id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.citizens })
      onClose()
    } catch (error) {
      setAlertMessage(getErrorMessage(error, 'Unable to add citizen to queue.'))
      setIsPerformingAction(false)
    }
  }

  async function handleBeginService(nextForm = form) {
    if (!nextForm || !validateRequired(nextForm)) {
      return
    }

    setIsPerformingAction(true)
    setAlertMessage(null)

    try {
      await saveCitizenBase(nextForm)
      await createSelectedServiceRequest(nextForm)
      await beginCitizenService(apiClient, nextForm.citizen.citizen_id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.citizens })
      onBeginService?.(nextForm.citizen.citizen_id)
      onClose()
    } catch (error) {
      setAlertMessage(getErrorMessage(error, 'Unable to begin service.'))
      setIsPerformingAction(false)
    }
  }

  async function handleCancel() {
    if (!form) {
      onClose()
      return
    }

    if (serviceModalMode) {
      onClose()
      onReturnToServe?.()
      return
    }

    setIsPerformingAction(true)
    setAlertMessage(null)

    try {
      await markCitizenLeft(apiClient, form.citizen.citizen_id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.citizens })
      onClose()
    } catch (error) {
      setAlertMessage(getErrorMessage(error, 'Unable to cancel add citizen.'))
      setIsPerformingAction(false)
    }
  }

  async function handleApplyService(nextForm = form) {
    if (!nextForm || !validateRequired(nextForm)) {
      return
    }

    setIsPerformingAction(true)
    setAlertMessage(null)

    try {
      await saveCitizenBase(nextForm)

      if (nextForm.mode === 'edit-service' && nextForm.activeServiceRequestId) {
        await updateServiceRequest(apiClient, nextForm.activeServiceRequestId, {
          channel_id: nextForm.channelId ?? undefined,
          service_id: nextForm.selectedServiceId ?? undefined,
        })
      } else {
        await createSelectedServiceRequest(nextForm)
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.citizens })
      onClose()
      onReturnToServe?.()
    } catch (error) {
      setAlertMessage(getErrorMessage(error, 'Unable to save service.'))
      setIsPerformingAction(false)
    }
  }

  if (!form) {
    return null
  }

  const title =
    form.mode === 'back-office'
      ? 'Back Office'
      : form.mode === 'add-next-service'
        ? 'Add Next Service'
        : form.mode === 'edit-service'
          ? 'Edit Service'
          : 'Add Citizen'
  const waitingCount = getWaitingCitizens(citizens).length

  return (
    <Modal
      className="max-w-4xl overflow-hidden"
      isDismissable={false}
      isOpen={isOpen}
    >
      <Dialog className="p-0" isCloseable={false}>
        <div className="border-bc-border bg-bc-light-gray flex items-center justify-between border-b px-6 py-4">
          <div>
            <DialogTitle className="text-bc-h4 m-0 font-bold">
              {title}
            </DialogTitle>
            <p className="text-bc-small text-bc-secondary m-0">
              Citizens Waiting: {waitingCount}
            </p>
          </div>
          <Button
            danger
            disabled={isPerformingAction}
            onClick={() => void handleCancel()}
            size="small"
            variant="secondary"
          >
            Cancel
          </Button>
        </div>

        <div className="bg-bc-light-gray px-6 py-4">
          {alertMessage && (
            <AlertBanner
              className="mb-3"
              isCloseable={false}
              role="alert"
              size="small"
              variant="danger"
            >
              {alertMessage}
            </AlertBanner>
          )}
          {commentsTooLong && (
            <AlertBanner
              className="mb-3"
              isCloseable={false}
              role="alert"
              size="small"
              variant="danger"
            >
              You have entered more than the 1,000 characters allowed for
              comments.
            </AlertBanner>
          )}

          {isReception && (
            <div className="mb-2 grid grid-cols-[7rem_1fr] items-start gap-3">
              <label
                className="text-bc-small text-bc-secondary pt-2 text-right"
                htmlFor="add-citizen-comments"
              >
                Comments:
              </label>
              <textarea
                className="border-bc-border focus:border-bc-form-active focus:outline-bc-focus min-h-16 rounded-sm border bg-white px-3 py-2 focus:outline-2 focus:outline-offset-1"
                id="add-citizen-comments"
                maxLength={1000}
                onChange={(event) =>
                  updateForm({ comments: event.target.value })
                }
                placeholder="add comments here"
                ref={commentsRef}
                value={form.comments}
              />
            </div>
          )}

          {showNotifications && (
            <div className="mb-2 grid grid-cols-[7rem_1fr_1fr] items-start gap-3">
              <label className="text-bc-small text-bc-secondary pt-2 text-right">
                Notification:
              </label>
              <input
                aria-invalid={!isValidNotificationPhone(form.notificationPhone)}
                className="border-bc-border focus:border-bc-form-active focus:outline-bc-focus rounded-sm border bg-white px-3 py-2 focus:outline-2 focus:outline-offset-1"
                maxLength={14}
                onChange={(event) => setNotificationPhone(event.target.value)}
                placeholder="Phone Number : (xxx) xxx-xxxx"
                type="tel"
                value={form.notificationPhone}
              />
              <input
                aria-invalid={!isValidNotificationEmail(form.notificationEmail)}
                className="border-bc-border focus:border-bc-form-active focus:outline-bc-focus rounded-sm border bg-white px-3 py-2 focus:outline-2 focus:outline-offset-1"
                onChange={(event) => setNotificationEmail(event.target.value)}
                placeholder="Email Address"
                type="email"
                value={form.notificationEmail}
              />
            </div>
          )}

          <div className="mb-3 grid grid-cols-[7rem_1fr] items-start gap-3">
            <label
              className="text-bc-small text-bc-secondary pt-2 text-right"
              htmlFor="add-citizen-channel"
            >
              Channel:
            </label>
            <select
              className="border-bc-border focus:border-bc-form-active focus:outline-bc-focus h-10 rounded-sm border bg-white px-3 focus:outline-2 focus:outline-offset-1"
              id="add-citizen-channel"
              onChange={(event) =>
                updateForm({ channelId: Number(event.target.value) || null })
              }
              value={form.channelId ?? ''}
            >
              <option value="">Select delivery channel</option>
              {channels.map((channel) => (
                <option key={channel.channel_id} value={channel.channel_id}>
                  {channel.channel_name}
                </option>
              ))}
            </select>
          </div>

          <ServicePicker
            actionColumns={[
              ...(isReception && !serviceModalMode
                ? [
                    {
                      header: 'To Q',
                      render: (service: Service) => (
                        <Button
                          aria-label={`Add ${service.service_name} to queue`}
                          disabled={baseActionDisabled || !form.channelId}
                          isIconButton
                          onClick={() => {
                            const nextForm = {
                              ...form,
                              search: service.service_name,
                              selectedServiceId: service.service_id,
                            }
                            setForm(nextForm)
                            void handleAddToQueue(nextForm)
                          }}
                          size="small"
                          variant="tertiary"
                        >
                          <UserRoundPlus
                            aria-hidden="true"
                            className="h-4 w-4"
                          />
                        </Button>
                      ),
                      widthClassName: 'w-20',
                    },
                  ]
                : []),
              {
                header: 'Serve',
                render: (service) => (
                  <Button
                    aria-label={
                      serviceModalMode
                        ? `Apply ${service.service_name}`
                        : `Begin ${service.service_name}`
                    }
                    disabled={baseActionDisabled || !form.channelId}
                    isIconButton
                    onClick={() => {
                      const nextForm = {
                        ...form,
                        search: service.service_name,
                        selectedServiceId: service.service_id,
                      }
                      setForm(nextForm)
                      if (serviceModalMode) {
                        void handleApplyService(nextForm)
                      } else {
                        void handleBeginService(nextForm)
                      }
                    }}
                    size="small"
                    variant="tertiary"
                  >
                    <HandHelping aria-hidden="true" className="h-4 w-4" />
                  </Button>
                ),
                widthClassName: 'w-24',
              },
            ]}
            categories={categories}
            categoryId={form.categoryId}
            onCategoryChange={(categoryId) => updateForm({ categoryId })}
            onSearchChange={(search) => updateForm({ search })}
            onSelectService={selectService}
            search={form.search}
            searchInputRef={searchInputRef}
            selectedServiceId={form.selectedServiceId}
            services={modeServices}
          />
        </div>

        <div className="border-bc-border flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            {isReception && (
              <select
                aria-label="Counter"
                className="border-bc-border focus:border-bc-form-active focus:outline-bc-focus h-10 rounded-sm border bg-white px-3 focus:outline-2 focus:outline-offset-1"
                onChange={(event) =>
                  updateForm({ counterId: Number(event.target.value) || null })
                }
                value={form.counterId ?? ''}
              >
                {[...office.counters]
                  .sort((left, right) =>
                    left.counter_name.localeCompare(right.counter_name),
                  )
                  .map((counter) => (
                    <option key={counter.counter_id} value={counter.counter_id}>
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
          </div>

          <div className="flex items-center gap-2">
            <Button
              danger
              disabled={isPerformingAction}
              onClick={() => void handleCancel()}
              variant="secondary"
            >
              Cancel
            </Button>
            {isReception && !serviceModalMode && (
              <Button
                disabled={actionDisabled}
                onClick={() => void handleAddToQueue()}
                variant="secondary"
              >
                Add to queue
              </Button>
            )}
            {serviceModalMode ? (
              <Button
                disabled={actionDisabled}
                onClick={() => void handleApplyService()}
              >
                Apply
              </Button>
            ) : (
              <Button
                disabled={actionDisabled}
                onClick={() => void handleBeginService()}
              >
                Begin service
              </Button>
            )}
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {selectedService ? `${selectedService.service_name} selected` : ''}
        </p>
      </Dialog>
    </Modal>
  )
}
