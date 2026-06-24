import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  Category,
  Channel,
  Citizen,
  Office,
  Service,
} from '@/api/schemas'
import {
  addCitizenToQueue,
  beginCitizenService,
  createServiceRequest,
  markCitizenLeft,
  updateCitizen,
} from '@/api/endpoints'
import { useApiClient } from '@/api/use-api-client'
import Button from '@/components/Button'
import Dialog from '@/components/Dialog'
import Modal from '@/components/Modal'
import { queryKeys } from '@/query/query-keys'
import { useQueryClient } from '@tanstack/react-query'

import {
  type AddCitizenMode,
  createWalkinUniqueId,
  filterServices,
  formatNotificationPhone,
  getCategoryOptions,
  getDefaultChannelId,
  getModeServices,
  isValidNotificationEmail,
  isValidNotificationPhone,
} from './add-citizen-utils'
import { getWaitingCitizens, isReceptionOffice } from './queue-utils'

interface AddCitizenModalState {
  categoryId: number | null
  channelId: number | null
  citizen: Citizen
  comments: string
  counterId: number | null
  mode: AddCitizenMode
  notificationEmail: string
  notificationPhone: string
  priority: number
  search: string
  selectedServiceId: number | null
  walkinUniqueId: string
}

interface AddCitizenModalProps {
  categories: Category[]
  channels: Channel[]
  citizens: Citizen[]
  isOpen: boolean
  office: Office
  onClose: () => void
  services: Service[]
  state: AddCitizenModalState | null
}

export type { AddCitizenModalState }

export function createAddCitizenModalState({
  channels,
  citizen,
  mode,
  office,
  preselectedService,
}: {
  channels: Channel[]
  citizen: Citizen
  mode: AddCitizenMode
  office: Office
  preselectedService?: Pick<Service, 'service_id' | 'service_name'> | null
}): AddCitizenModalState {
  const sortedCounters = [...office.counters].sort((left, right) =>
    left.counter_name.localeCompare(right.counter_name),
  )

  return {
    categoryId: null,
    channelId: getDefaultChannelId(channels, mode),
    citizen,
    comments: '',
    counterId: sortedCounters[0]?.counter_id ?? null,
    mode,
    notificationEmail: '',
    notificationPhone: '',
    priority: 2,
    search: preselectedService?.service_name ?? '',
    selectedServiceId: preselectedService?.service_id ?? null,
    walkinUniqueId: '',
  }
}

export default function AddCitizenModal({
  categories,
  channels,
  citizens,
  isOpen,
  office,
  onClose,
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
  const categoryOptions = useMemo(
    () => getCategoryOptions(categories, modeServices),
    [categories, modeServices],
  )
  const filteredServices = useMemo(
    () =>
      form
        ? filterServices({
            categoryId: form.categoryId,
            mode: form.mode,
            search: form.search,
            services,
          })
        : [],
    [form, services],
  )
  const selectedService = form?.selectedServiceId
    ? services.find((service) => service.service_id === form.selectedServiceId)
    : null
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
      walkinUniqueId: notificationPhone || form?.notificationEmail ? createWalkinUniqueId() : '',
    })
  }

  function setNotificationEmail(notificationEmail: string) {
    updateForm({
      notificationEmail,
      walkinUniqueId:
        form?.notificationPhone || notificationEmail ? createWalkinUniqueId() : '',
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

  if (!form) {
    return null
  }

  const title = form.mode === 'back-office' ? 'Back Office' : 'Add Citizen'
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
            <h2 className="text-bc-h4 m-0 font-bold">{title}</h2>
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
            <p
              className="bg-bc-danger-surface text-bc-danger border-bc-danger m-0 mb-3 border-l-4 px-3 py-2"
              role="alert"
            >
              {alertMessage}
            </p>
          )}
          {commentsTooLong && (
            <p
              className="bg-bc-danger-surface text-bc-danger border-bc-danger m-0 mb-3 border-l-4 px-3 py-2"
              role="alert"
            >
              You have entered more than the 1,000 characters allowed for
              comments.
            </p>
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
                onChange={(event) => updateForm({ comments: event.target.value })}
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

          <div className="grid grid-cols-[minmax(0,7fr)_minmax(12rem,3fr)] gap-3">
            <label className="block">
              <span className="sr-only">Type service here</span>
              <input
                className="border-bc-border focus:border-bc-form-active focus:outline-bc-focus h-10 w-full rounded-sm border bg-white px-3 focus:outline-2 focus:outline-offset-1"
                onChange={(event) => updateForm({ search: event.target.value })}
                placeholder="Type service here"
                ref={searchInputRef}
                value={form.search}
              />
            </label>
            <select
              aria-label="Filter by category"
              className="border-bc-border focus:border-bc-form-active focus:outline-bc-focus h-10 rounded-sm border bg-white px-3 focus:outline-2 focus:outline-offset-1"
              onChange={(event) =>
                updateForm({ categoryId: Number(event.target.value) || null })
              }
              value={form.categoryId ?? ''}
            >
              <option value="">Categories</option>
              {categoryOptions.map((category) => (
                <option key={category.service_id} value={category.service_id}>
                  {category.service_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-bc-gray-110 px-6 py-4">
          <div className="border-bc-border max-h-64 overflow-auto border bg-white">
            <table className="w-full border-collapse text-left">
              <thead className="bg-bc-secondary text-bc-white sticky top-0">
                <tr>
                  {isReception && (
                    <th className="w-20 px-3 py-2 text-center font-normal">
                      To Q
                    </th>
                  )}
                  <th className="w-24 px-3 py-2 text-center font-normal">
                    Serve
                  </th>
                  <th className="px-3 py-2 font-normal">Service</th>
                  <th className="px-3 py-2 font-normal">Category</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((service) => {
                  const selected = service.service_id === form.selectedServiceId

                  return (
                    <tr
                      className={
                        selected
                          ? 'bg-bc-button-secondary-pressed'
                          : 'hover:bg-bc-button-secondary-hover'
                      }
                      key={service.service_id}
                    >
                      {isReception && (
                        <td className="border-bc-border border-t px-3 py-2 text-center">
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
                            <span aria-hidden="true">Q</span>
                          </Button>
                        </td>
                      )}
                      <td className="border-bc-border border-t px-3 py-2 text-center">
                        <Button
                          aria-label={`Begin ${service.service_name}`}
                          disabled={baseActionDisabled || !form.channelId}
                          isIconButton
                          onClick={() => {
                            const nextForm = {
                              ...form,
                              search: service.service_name,
                              selectedServiceId: service.service_id,
                            }
                            setForm(nextForm)
                            void handleBeginService(nextForm)
                          }}
                          size="small"
                          variant="tertiary"
                        >
                          <span aria-hidden="true">S</span>
                        </Button>
                      </td>
                      <td className="border-bc-border border-t px-3 py-2">
                        <button
                          className="focus-visible:outline-bc-focus w-full cursor-pointer bg-transparent p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
                          onClick={() =>
                            updateForm({
                              search: service.service_name,
                              selectedServiceId: service.service_id,
                            })
                          }
                          title={service.service_desc ?? undefined}
                          type="button"
                        >
                          {service.service_name}
                        </button>
                      </td>
                      <td className="border-bc-border border-t px-3 py-2">
                        {service.parent?.service_name ?? ''}
                      </td>
                    </tr>
                  )
                })}
                {filteredServices.length === 0 && (
                  <tr>
                    <td
                      className="text-bc-secondary px-3 py-6 text-center"
                      colSpan={isReception ? 4 : 3}
                    >
                      No services match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
            {isReception && (
              <Button
                disabled={actionDisabled}
                onClick={() => void handleAddToQueue()}
                variant="secondary"
              >
                Add to queue
              </Button>
            )}
            <Button
              disabled={actionDisabled}
              onClick={() => void handleBeginService()}
            >
              Begin service
            </Button>
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {selectedService ? `${selectedService.service_name} selected` : ''}
        </p>
      </Dialog>
    </Modal>
  )
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message
  }

  return fallback
}
