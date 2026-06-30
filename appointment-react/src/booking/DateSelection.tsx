import { useMemo, useState, type RefObject } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Button as AriaButton,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
} from 'react-aria-components'

import {
  createDraft,
  deleteDraft,
  getOffices,
  getServices,
  getSlots,
} from '@/api/endpoints'
import { ApiError } from '@/api/errors'
import { useApiClient } from '@/api/use-api-client'
import { useAuth } from '@/auth/use-auth'
import {
  apiDateKeyToCalendarDate,
  calendarDateToApiKey,
  formatOfficeDate,
  formatSelectedSlot,
  formatSlotTime,
  officeSlotToUtcIso,
} from '@/booking/booking-datetime'
import { getVisibleOffices, getVisibleServices } from '@/booking/booking-utils'
import { RequestError, StepHeader } from '@/booking/BookingStepLayout'
import AlertBanner from '@/components/AlertBanner'
import Button from '@/components/Button'
import LoadingIndicator from '@/components/LoadingIndicator'
import { queryKeys } from '@/query/query-keys'
import { useBookingStore } from '@/store/booking-store'

export default function DateSelection({
  headingRef,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>
}) {
  const apiClient = useApiClient()
  const auth = useAuth()
  const selectedOfficeId = useBookingStore((state) => state.selectedOfficeId)
  const selectedServiceId = useBookingStore((state) => state.selectedServiceId)
  const selectedSlot = useBookingStore((state) => state.selectedSlot)
  const draftAppointmentId = useBookingStore(
    (state) => state.draftAppointmentId,
  )
  const setReservation = useBookingStore((state) => state.setReservation)
  const clearReservation = useBookingStore((state) => state.clearReservation)
  const setCurrentStep = useBookingStore((state) => state.setCurrentStep)
  const setPendingPostLoginPath = useBookingStore(
    (state) => state.setPendingPostLoginPath,
  )
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
    selectedSlot?.dateKey ?? null,
  )
  const [reservationError, setReservationError] = useState<string | null>(null)

  const officesQuery = useQuery({
    queryFn: ({ signal }) => getOffices(apiClient, signal),
    queryKey: queryKeys.offices,
  })
  const servicesQuery = useQuery({
    enabled: selectedOfficeId !== null,
    queryFn: ({ signal }) => getServices(apiClient, selectedOfficeId!, signal),
    queryKey: queryKeys.services.office(selectedOfficeId ?? 0),
  })
  const selectedOffice = getVisibleOffices(
    officesQuery.data?.offices ?? [],
  ).find((office) => office.office_id === selectedOfficeId)
  const selectedService = getVisibleServices(
    servicesQuery.data?.services ?? [],
  ).find((service) => service.service_id === selectedServiceId)
  const slotsQuery = useQuery({
    enabled: Boolean(selectedOffice && selectedService),
    queryFn: ({ signal }) =>
      getSlots(
        apiClient,
        selectedOffice!.office_id,
        selectedService!.service_id,
        signal,
      ),
    queryKey: queryKeys.slots(
      selectedOffice?.office_id ?? 0,
      selectedService?.service_id ?? 0,
    ),
  })
  const availableDateKeys = useMemo(
    () =>
      Object.entries(slotsQuery.data ?? {})
        .filter(([, slots]) => slots.length > 0)
        .map(([dateKey]) => dateKey)
        .toSorted((a, b) =>
          apiDateKeyToCalendarDate(a).compare(apiDateKeyToCalendarDate(b)),
        ),
    [slotsQuery.data],
  )
  const effectiveDateKey =
    selectedDateKey && availableDateKeys.includes(selectedDateKey)
      ? selectedDateKey
      : (availableDateKeys[0] ?? selectedSlot?.dateKey ?? null)
  const availableDateSet = useMemo(
    () => new Set(availableDateKeys),
    [availableDateKeys],
  )
  const selectedDateSlots =
    effectiveDateKey && slotsQuery.data
      ? (slotsQuery.data[effectiveDateKey] ?? [])
      : []

  const reserveMutation = useMutation({
    mutationFn: async ({
      dateKey,
      endTime,
      startTime,
    }: {
      dateKey: string
      endTime: string
      startTime: string
    }) => {
      if (!selectedOffice || !selectedService) {
        throw new Error('Office and service selections are required')
      }
      if (draftAppointmentId !== null) {
        try {
          await deleteDraft(apiClient, draftAppointmentId)
        } catch {
          // Draft cleanup is best effort; server expiry remains the fallback.
        }
      }
      clearReservation()
      const slot = {
        dateKey,
        endTime: officeSlotToUtcIso(
          dateKey,
          endTime,
          selectedOffice.timezone.timezone_name,
        ),
        startTime: officeSlotToUtcIso(
          dateKey,
          startTime,
          selectedOffice.timezone.timezone_name,
        ),
      }
      const response = await createDraft(apiClient, {
        comments: '',
        end_time: slot.endTime,
        is_draft: true,
        office_id: selectedOffice.office_id,
        service_id: selectedService.service_id,
        start_time: slot.startTime,
      })
      return { appointmentId: response.appointment.appointment_id, slot }
    },
    onError: (error) => {
      clearReservation()
      if (error instanceof ApiError && error.kind === 'conflict') {
        setReservationError(
          'That time is no longer available. Please choose another time.',
        )
        void slotsQuery.refetch()
      } else {
        setReservationError(
          'Unable to reserve that appointment time. Please try again.',
        )
      }
    },
    onSuccess: ({ appointmentId, slot }) => {
      setReservation(slot, appointmentId)
      setReservationError(null)
      if (auth.authenticated && auth.authorized) {
        setCurrentStep('summary')
      } else {
        setPendingPostLoginPath('/appointment')
        setCurrentStep('login')
      }
      window.scrollTo({ top: 0 })
    },
  })

  if (selectedOfficeId === null || selectedServiceId === null) {
    return (
      <>
        <StepHeader headingRef={headingRef} title="Select a Date" />
        <RequestError
          message="Select an office and service before choosing a date."
          onRetry={() =>
            setCurrentStep(selectedOfficeId === null ? 'location' : 'service')
          }
        />
      </>
    )
  }

  const isLoading =
    officesQuery.isPending || servicesQuery.isPending || slotsQuery.isPending
  const hasError =
    officesQuery.isError || servicesQuery.isError || slotsQuery.isError
  const timezone = selectedOffice?.timezone.timezone_name

  return (
    <>
      <StepHeader
        headingRef={headingRef}
        onBack={() => setCurrentStep('service')}
        subtitle="Available days can be selected in the calendar."
        title="Select a Date"
      />
      <div className="p-4 sm:p-6">
        {isLoading && <LoadingIndicator label="Loading available times" />}
        {hasError && (
          <RequestError
            message="Unable to load available appointment times."
            onRetry={() => {
              void officesQuery.refetch()
              void servicesQuery.refetch()
              void slotsQuery.refetch()
            }}
          />
        )}
        {!isLoading && !hasError && selectedOffice && selectedService && (
          <>
            {reservationError && (
              <AlertBanner
                className="mb-5"
                isCloseable
                onClose={() => setReservationError(null)}
                role="alert"
                variant="danger"
              >
                {reservationError}
              </AlertBanner>
            )}
            {selectedSlot && draftAppointmentId && timezone && (
              <AlertBanner className="mb-5" isCloseable={false}>
                Reserved appointment:{' '}
                {formatSelectedSlot(selectedSlot, timezone)}
              </AlertBanner>
            )}
            {availableDateKeys.length === 0 ? (
              <AlertBanner isCloseable={false} variant="warning">
                No appointment times are currently available.
              </AlertBanner>
            ) : (
              <div className="grid gap-8 md:grid-cols-2">
                <Calendar
                  aria-label="Appointment date"
                  className="border-bc-border mx-auto w-full max-w-md rounded-sm border p-4"
                  defaultFocusedValue={apiDateKeyToCalendarDate(
                    effectiveDateKey!,
                  )}
                  isDateUnavailable={(date) =>
                    !availableDateSet.has(calendarDateToApiKey(date))
                  }
                  maxValue={apiDateKeyToCalendarDate(availableDateKeys.at(-1)!)}
                  minValue={apiDateKeyToCalendarDate(availableDateKeys[0]!)}
                  onChange={(date) =>
                    setSelectedDateKey(calendarDateToApiKey(date))
                  }
                  value={apiDateKeyToCalendarDate(effectiveDateKey!)}
                >
                  <header className="mb-3 flex items-center justify-between">
                    <AriaButton
                      className="focus-visible:outline-bc-focus rounded-sm p-2 focus-visible:outline-2"
                      slot="previous"
                    >
                      <ChevronLeft aria-hidden="true" className="size-5" />
                      <span className="sr-only">Previous month</span>
                    </AriaButton>
                    <Heading className="m-0 font-bold" />
                    <AriaButton
                      className="focus-visible:outline-bc-focus rounded-sm p-2 focus-visible:outline-2"
                      slot="next"
                    >
                      <ChevronRight aria-hidden="true" className="size-5" />
                      <span className="sr-only">Next month</span>
                    </AriaButton>
                  </header>
                  <CalendarGrid className="w-full border-separate border-spacing-1">
                    <CalendarGridHeader>
                      {(day) => (
                        <CalendarHeaderCell className="text-bc-small text-bc-secondary">
                          {day}
                        </CalendarHeaderCell>
                      )}
                    </CalendarGridHeader>
                    <CalendarGridBody>
                      {(date) => (
                        <CalendarCell
                          className="data-[unavailable]:text-bc-disabled-text data-[selected]:bg-bc-button-primary data-[focus-visible]:outline-bc-focus mx-auto flex size-10 items-center justify-center rounded-full data-[focus-visible]:outline-2 data-[selected]:text-white data-[unavailable]:line-through"
                          date={date}
                        />
                      )}
                    </CalendarGridBody>
                  </CalendarGrid>
                </Calendar>
                <div aria-live="polite" className="text-center">
                  <p className="mt-0">
                    <strong>Date Selected:</strong>{' '}
                    {effectiveDateKey && timezone
                      ? formatOfficeDate(effectiveDateKey, timezone)
                      : ''}
                  </p>
                  <h4>Available Time Slots</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedDateSlots.map((slot) => (
                      <Button
                        disabled={reserveMutation.isPending}
                        key={`${slot.start_time}-${slot.end_time}`}
                        onClick={() =>
                          reserveMutation.mutate({
                            dateKey: effectiveDateKey!,
                            endTime: slot.end_time,
                            startTime: slot.start_time,
                          })
                        }
                        size="large"
                        variant="secondary"
                      >
                        {formatSlotTime(slot.start_time)} –{' '}
                        {formatSlotTime(slot.end_time)}
                      </Button>
                    ))}
                  </div>
                  {selectedDateSlots.length === 0 && (
                    <p className="text-bc-danger font-bold">
                      No time slots available on the selected date
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
