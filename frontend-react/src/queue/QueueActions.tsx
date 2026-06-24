import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  type Key,
} from 'react-aria-components'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addCitizen,
  beginCitizenService,
  createServiceRequest,
  getCategories,
  getChannels,
  getServices,
  updateCitizen,
} from '@/api/endpoints'
import type { Category, Channel, Citizen, Office, Service } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import Button from '@/components/Button'
import { queryKeys } from '@/query/query-keys'
import { useWorkflowStore } from '@/store/workflow-store'

import AddCitizenModal, {
  createAddCitizenModalState,
  type AddCitizenModalState,
} from './AddCitizenModal'
import {
  type AddCitizenMode,
  getAvailableQuickItems,
  getDefaultChannelId,
} from './add-citizen-utils'
import { getWaitingCitizens, isReceptionOffice } from './queue-utils'

interface QueueActionsProps {
  citizens: Citizen[]
  office: Office
}

export default function QueueActions({ citizens, office }: QueueActionsProps) {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const currentReceptionist = useWorkflowStore(
    (state) => state.currentReceptionist,
  )
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
    } catch (error) {
      setActionAlert(getErrorMessage(error, 'Unable to begin service.'))
    } finally {
      setIsPerformingAction(false)
    }
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
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        {actionAlert && (
          <p
            className="bg-bc-danger-surface text-bc-danger border-bc-danger m-0 mr-auto border-l-4 px-3 py-2"
            role="alert"
          >
            {actionAlert}
          </p>
        )}

        <SplitAction
          disabled={isBusy}
          items={quickListItems}
          label="Add Citizen"
          onAction={(key) => handleQuickAction('add-citizen', key)}
          onPrimary={() => void openModal('add-citizen')}
        />
        <SplitAction
          disabled={isBusy}
          items={backOfficeItems}
          label="Back Office"
          onAction={(key) => handleQuickAction('back-office', key)}
          onPrimary={() => void openModal('back-office')}
        />
      </div>

      <AddCitizenModal
        categories={categoriesQuery.data ?? []}
        channels={channelsQuery.data ?? []}
        citizens={citizens}
        isOpen={modalState !== null}
        office={office}
        onClose={() => setModalState(null)}
        services={servicesQuery.data ?? []}
        state={modalState}
      />
    </>
  )
}

function SplitAction({
  disabled,
  items,
  label,
  onAction,
  onPrimary,
}: {
  disabled: boolean
  items: Array<{ service_id: number; service_name: string }>
  label: string
  onAction: (key: Key) => void
  onPrimary: () => void
}) {
  return (
    <div className="inline-flex items-stretch">
      <Button
        className="rounded-r-none"
        disabled={disabled}
        onClick={onPrimary}
      >
        {label}
      </Button>
      {items.length > 0 && (
        <MenuTrigger>
          <Button
            aria-label={`${label} quick services`}
            className="border-l-bc-button-primary-hover rounded-l-none border-l"
            disabled={disabled}
            isIconButton
          >
            <ChevronDown aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Popover
            className="border-bc-border bg-bc-white shadow-bc-popover z-50 min-w-64 overflow-hidden rounded-sm border p-1"
            offset={4}
          >
            <Menu
              className="max-h-80 overflow-auto outline-hidden"
              items={items}
              onAction={onAction}
            >
              {(item) => (
                <MenuItem
                  className="data-[focused]:bg-bc-button-secondary-hover data-[hovered]:bg-bc-button-secondary-hover text-bc-body cursor-pointer rounded-sm px-3 py-2 outline-hidden"
                  id={item.service_id}
                  textValue={item.service_name}
                >
                  {item.service_name}
                </MenuItem>
              )}
            </Menu>
          </Popover>
        </MenuTrigger>
      )}
    </div>
  )
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message
  }

  return fallback
}
