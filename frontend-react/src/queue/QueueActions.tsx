import { useState } from 'react'
import { type Key } from 'react-aria-components'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addCitizen,
  beginCitizenService,
  createServiceRequest,
  getCategories,
  getChannels,
  getServices,
  inviteNextCitizen,
  updateCitizen,
} from '@/api/endpoints'
import type { Category, Channel, Citizen, Office, Service } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import AlertBanner from '@/components/AlertBanner'
import Button from '@/components/Button'
import SplitAction from '@/components/SplitAction'
import { cx } from '@/lib/cx'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/query/query-keys'
import { useWorkflowStore } from '@/store/workflow-store'

import AddCitizenModal from './AddCitizenModal'
import {
  createAddCitizenModalState,
  type AddCitizenModalState,
} from './add-citizen-modal-state'
import {
  type AddCitizenMode,
  getAvailableQuickItems,
  getDefaultChannelId,
} from './add-citizen-utils'
import {
  getActiveService,
  getWaitingCitizens,
  isReceptionOffice,
} from './queue-utils'

interface QueueActionsProps {
  citizens: Citizen[]
  hasActiveServiceCitizen: boolean
  office: Office
}

export default function QueueActions({
  citizens,
  hasActiveServiceCitizen,
  office,
}: QueueActionsProps) {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const currentReceptionist = useWorkflowStore(
    (state) => state.currentReceptionist,
  )
  const clearServeCitizen = useWorkflowStore((state) => state.clearServeCitizen)
  const currentCounterId = useWorkflowStore((state) => state.currentCounterId)
  const openServiceModal = useWorkflowStore((state) => state.openServiceModal)
  const setActiveServiceCitizen = useWorkflowStore(
    (state) => state.setActiveServiceCitizen,
  )
  const showServiceModal = useWorkflowStore((state) => state.showServiceModal)
  const [modalState, setModalState] = useState<AddCitizenModalState | null>(
    null,
  )
  const [isPerformingAction, setIsPerformingAction] = useState(false)
  const [actionAlert, setActionAlert] = useState<string | null>(null)

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

  const quickListItems = getAvailableQuickItems(office.quick_list)
  const backOfficeItems = getAvailableQuickItems(office.back_office_list)
  const isBusy =
    isPerformingAction ||
    categoriesQuery.isPending ||
    channelsQuery.isPending ||
    servicesQuery.isPending
  const canOpenPrefilledModal =
    currentReceptionist === true && isReceptionOffice(office)

  async function ensureReferenceData() {
    const [categories, channels, services] = await Promise.all([
      queryClient.ensureQueryData({
        queryFn: ({ signal }) => getCategories(apiClient, signal),
        queryKey: queryKeys.categories,
      }),
      queryClient.ensureQueryData({
        queryFn: ({ signal }) => getChannels(apiClient, signal),
        queryKey: queryKeys.channels,
      }),
      queryClient.ensureQueryData({
        queryFn: ({ signal }) =>
          getServices(apiClient, office.office_id, signal),
        queryKey: queryKeys.services(office.office_id),
      }),
    ])

    return {
      categories: categories as Category[],
      channels: channels as Channel[],
      services: services as Service[],
    }
  }

  async function openModal(
    mode: AddCitizenMode,
    preselectedService?: Pick<Service, 'service_id' | 'service_name'> | null,
  ) {
    setIsPerformingAction(true)
    setActionAlert(null)

    try {
      const { channels } = await ensureReferenceData()
      const citizen = await addCitizen(
        apiClient,
        getWaitingCitizens(citizens).length,
      )

      setModalState(
        createAddCitizenModalState({
          channels,
          citizen,
          mode,
          office,
          preselectedService,
        }),
      )
    } catch (error) {
      setActionAlert(
        getErrorMessage(error, 'An error occurred adding a citizen.'),
      )
    } finally {
      setIsPerformingAction(false)
    }
  }

  async function quickBeginService({
    mode,
    serviceId,
  }: {
    mode: AddCitizenMode
    serviceId: number
  }) {
    setIsPerformingAction(true)
    setActionAlert(null)

    try {
      const { channels } = await ensureReferenceData()
      const citizen = await addCitizen(
        apiClient,
        getWaitingCitizens(citizens).length,
      )
      const sortedCounters = [...office.counters].sort((left, right) =>
        left.counter_name.localeCompare(right.counter_name),
      )
      const channelId = getDefaultChannelId(channels, mode)

      if (!channelId) {
        throw new Error('You must select a channel')
      }

      await updateCitizen(apiClient, citizen.citizen_id, {
        citizen_comments: '',
        counter_id: sortedCounters[0]?.counter_id ?? null,
        notification_email: '',
        notification_phone: '',
        priority: 2,
        walkin_unique_id: '',
      })
      await createServiceRequest(apiClient, {
        channel_id: channelId,
        citizen_id: citizen.citizen_id,
        priority: 2,
        quantity: 1,
        service_id: serviceId,
      })
      await beginCitizenService(apiClient, citizen.citizen_id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.citizens })
      openServiceModal()
      setActiveServiceCitizen(citizen.citizen_id, null, true)
    } catch (error) {
      setActionAlert(getErrorMessage(error, 'Unable to begin service.'))
    } finally {
      setIsPerformingAction(false)
    }
  }

  async function handleInviteNext() {
    if (hasActiveServiceCitizen || showServiceModal) {
      setActionAlert(
        'You are already serving a citizen.  Click Serve Now to resume.',
      )
      return
    }

    const nextCitizen = getWaitingCitizens(citizens)[0]

    if (!nextCitizen) {
      setActionAlert('The are currently no citizens to invite.')
      return
    }

    setIsPerformingAction(true)
    setActionAlert(null)

    try {
      await inviteNextCitizen(apiClient, currentCounterId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.citizens })
      openServiceModal()
      setActiveServiceCitizen(
        nextCitizen.citizen_id,
        getActiveService(nextCitizen)?.sr_id ?? null,
        false,
      )
    } catch (error) {
      setActionAlert(getErrorMessage(error, 'Unable to invite citizen.'))
    } finally {
      setIsPerformingAction(false)
    }
  }

  function handleServeNow() {
    if (hasActiveServiceCitizen) {
      openServiceModal()
      return
    }

    clearServeCitizen()
  }

  function handleQuickAction(mode: AddCitizenMode, key: Key) {
    const serviceId = Number(key)
    const list = mode === 'add-citizen' ? quickListItems : backOfficeItems
    const item = list.find((quickItem) => quickItem.service_id === serviceId)

    if (!item) {
      return
    }

    if (canOpenPrefilledModal) {
      void openModal(mode, {
        service_id: item.service_id,
        service_name: item.service_name,
      })
      return
    }

    void quickBeginService({ mode, serviceId })
  }

  return (
    <>
      {actionAlert && (
        <AlertBanner
          className="mb-4 w-fit"
          isCloseable={false}
          role="alert"
          size="small"
          variant="danger"
        >
          {actionAlert}
        </AlertBanner>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {isReceptionOffice(office) && (
            <Button
              disabled={isBusy || hasActiveServiceCitizen || showServiceModal}
              onClick={() => void handleInviteNext()}
            >
              Invite
            </Button>
          )}
          <Button
            className={cx(
              hasActiveServiceCitizen &&
                !showServiceModal &&
                'animate-pulse border border-yellow-700 bg-yellow-300 text-black hover:bg-yellow-300',
            )}
            disabled={!hasActiveServiceCitizen}
            id="serve-citizen-button"
            onClick={handleServeNow}
          >
            Serve Now
          </Button>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <SplitAction
            disabled={isBusy}
            items={backOfficeItems.map((item) => ({
              id: item.service_id,
              label: item.service_name,
            }))}
            label="Back Office"
            onAction={(key) => handleQuickAction('back-office', key)}
            onPrimary={() => void openModal('back-office')}
            variant="secondary"
          />
          <SplitAction
            disabled={isBusy}
            items={quickListItems.map((item) => ({
              id: item.service_id,
              label: item.service_name,
            }))}
            label="Add Citizen"
            onAction={(key) => handleQuickAction('add-citizen', key)}
            onPrimary={() => void openModal('add-citizen')}
          />
        </div>
      </div>

      <AddCitizenModal
        categories={categoriesQuery.data ?? []}
        channels={channelsQuery.data ?? []}
        citizens={citizens}
        isOpen={modalState !== null}
        office={office}
        onClose={() => setModalState(null)}
        onBeginService={(citizenId) => {
          openServiceModal()
          setActiveServiceCitizen(citizenId, null, true)
        }}
        services={servicesQuery.data ?? []}
        state={modalState}
      />
    </>
  )
}

