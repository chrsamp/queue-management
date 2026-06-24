import { Fragment, useMemo, useState } from 'react'
import {
  Calendar,
  dateFnsLocalizer,
  type SlotInfo,
  type View,
} from 'react-big-calendar'
import { format, getDay, parse, startOfWeek } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import { useQuery } from '@tanstack/react-query'
import 'react-big-calendar/lib/css/react-big-calendar.css'

import {
  createDraftAppointment,
  deleteDraftAppointment,
  getAppointments,
  getServices,
} from '@/api/endpoints'
import type { Office } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import AlertBanner from '@/components/AlertBanner'
import Button from '@/components/Button'
import { queryKeys } from '@/query/query-keys'

import AppointmentBlackoutModal from './AppointmentBlackoutModal'
import AppointmentCheckInModal from './AppointmentCheckInModal'
import AppointmentModal from './AppointmentModal'
import {
  addMinutes,
  appointmentToCalendarEvent,
  formatDateInputValue,
  getNextAppointmentDate,
  getNextValidAppointmentStart,
  isPast,
  officeDateToUtcIso,
  type AppointmentCalendarEvent,
} from './appointment-utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const locales = { 'en-US': enUS }
const emptyAppointments: never[] = []
const emptyServices: never[] = []
const localizer = dateFnsLocalizer({
  format,
  getDay,
  locales,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
})

interface AppointmentsWorkspaceProps {
  office: Office
  recurringFeatureFlag: unknown
  roleCode: string | null
  username: string
}

export default function AppointmentsWorkspace({
  office,
  recurringFeatureFlag,
  roleCode,
  username,
}: AppointmentsWorkspaceProps) {
  const apiClient = useApiClient()
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState<View>('work_week')
  const [search, setSearch] = useState('')
  const [clickedTime, setClickedTime] = useState<Date | null>(null)
  const [clickedEvent, setClickedEvent] =
    useState<AppointmentCalendarEvent | null>(null)
  const [draftId, setDraftId] = useState<number | null>(null)
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false)
  const [checkInModalOpen, setCheckInModalOpen] = useState(false)
  const [blackoutModalOpen, setBlackoutModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const appointmentsQuery = useQuery({
    queryFn: ({ signal }) => getAppointments(apiClient, signal),
    queryKey: queryKeys.appointments.office(office.office_id),
  })
  const servicesQuery = useQuery({
    queryFn: ({ signal }) => getServices(apiClient, office.office_id, signal),
    queryKey: queryKeys.services(office.office_id),
  })
  const services = servicesQuery.data ?? emptyServices
  const appointments = appointmentsQuery.data ?? emptyAppointments
  const appointmentError = appointmentsQuery.isError
    ? getErrorMessage(appointmentsQuery.error, 'Unable to load appointments.')
    : servicesQuery.isError
      ? getErrorMessage(
          servicesQuery.error,
          'Unable to load appointment services.',
        )
      : null
  const events = useMemo(
    () =>
      appointments.map((appointment) =>
        appointmentToCalendarEvent(appointment, services),
      ),
    [appointments, services],
  )
  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) {
      return events
    }

    return events.filter((event) =>
      [
        event.title,
        event.serviceName,
        event.comments,
        event.contact_information,
      ].some((value) => value?.toLowerCase().includes(term)),
    )
  }, [events, search])

  async function cleanupDraft() {
    if (!draftId) {
      return
    }

    try {
      await deleteDraftAppointment(apiClient, draftId)
      setDraftId(null)
    } catch {
      setDraftId(null)
    }
  }

  async function handleSelectSlot({ start }: SlotInfo) {
    if (isPast(start)) {
      return
    }

    setErrorMessage(null)
    await cleanupDraft()

    const end = addMinutes(start, 15)

    try {
      const draft = await createDraftAppointment(apiClient, {
        end_time: officeDateToUtcIso(end, office.timezone.timezone_name),
        office_id: office.office_id,
        start_time: officeDateToUtcIso(start, office.timezone.timezone_name),
      })
      setDraftId(draft.appointment_id)
      setClickedEvent(null)
      setClickedTime(start)
      setAppointmentModalOpen(true)
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Unable to reserve appointment slot.'),
      )
    }
  }

  function handleSelectEvent(event: AppointmentCalendarEvent) {
    setClickedEvent({ ...event, color: '#e91e63' })
    setClickedTime(null)
    setCheckInModalOpen(true)
  }

  function navigate(direction: 'next' | 'prev') {
    if (view === 'day') {
      setDate((current) => getNextAppointmentDate(current, direction))
      return
    }

    setDate((current) => {
      const next = new Date(current)
      next.setDate(next.getDate() + (direction === 'next' ? 7 : -7))
      return next
    })
  }

  function openEditModal(editSeries: boolean) {
    setCheckInModalOpen(false)
    setAppointmentModalOpen(true)
    if (editSeries) {
      // The edit-series checkbox is visible inside the modal; opening the same
      // modal keeps the flow equivalent without adding separate state.
    }
  }

  return (
    <section className="flex h-full min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden p-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setDate(new Date())}>Today</Button>
          <Button
            onClick={() => setView(view === 'day' ? 'work_week' : 'day')}
            variant="secondary"
          >
            {view === 'day' ? 'Week View' : 'Day View'}
          </Button>
          <Button
            onClick={() => setBlackoutModalOpen(true)}
            variant="secondary"
          >
            Create Blackout
          </Button>
          <Button
            onClick={() => {
              setClickedEvent(null)
              setClickedTime(getNextValidAppointmentStart())
              setAppointmentModalOpen(true)
            }}
          >
            New Appointment
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => navigate('prev')} variant="secondary">
            <ChevronLeft />
          </Button>
          <h2 className="text-bc-h4 m-0 min-w-64 text-center font-bold">
            {format(date, view === 'day' ? 'MMMM d, yyyy' : 'MMMM yyyy')}
          </h2>
          <Button onClick={() => navigate('next')} variant="secondary">
            <ChevronRight />
          </Button>
        </div>
      </div>

      <form
        className="flex shrink-0 flex-wrap items-center gap-2"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="font-bold" htmlFor="appointment-search">
          Filter Appointments
        </label>
        <input
          className="border-bc-border rounded-sm border px-3 py-2"
          id="appointment-search"
          onChange={(event) => setSearch(event.target.value)}
          value={search}
        />
        {search && (
          <Button
            onClick={() => setSearch('')}
            size="small"
            variant="secondary"
          >
            Clear
          </Button>
        )}
      </form>

      {errorMessage && (
        <AlertBanner
          isCloseable={false}
          role="alert"
          size="small"
          variant="danger"
        >
          {errorMessage}
        </AlertBanner>
      )}
      {appointmentError && (
        <AlertBanner
          isCloseable={false}
          role="alert"
          size="small"
          variant="danger"
        >
          {appointmentError}
        </AlertBanner>
      )}
      {appointmentsQuery.isPending || servicesQuery.isPending ? (
        <p className="text-bc-secondary m-0" role="status">
          Loading appointments...
        </p>
      ) : appointmentError ? null : search ? (
        <AppointmentList
          events={filteredEvents}
          onSelectDate={(nextDate) => {
            setDate(nextDate)
            setView('day')
            setSearch('')
          }}
        />
      ) : (
        <div className="border-bc-border min-h-0 flex-1 overflow-hidden border bg-white p-2">
          <Calendar
            date={date}
            dayLayoutAlgorithm="no-overlap"
            defaultView="work_week"
            endAccessor="end"
            eventPropGetter={(event) => ({
              style: {
                backgroundColor:
                  event.color === 'cal-events-default'
                    ? '#2e6f40'
                    : event.color,
              },
            })}
            events={filteredEvents}
            formats={{ eventTimeRangeFormat: () => '' }}
            localizer={localizer}
            max={new Date(1970, 0, 1, 17, 0)}
            min={new Date(1970, 0, 1, 8, 30)}
            onNavigate={setDate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={(slot) => void handleSelectSlot(slot)}
            onView={setView}
            selectable
            startAccessor="start"
            step={15}
            timeslots={1}
            toolbar={false}
            view={view}
            views={['work_week', 'day']}
          />
        </div>
      )}

      <AppointmentCheckInModal
        clickedEvent={clickedEvent}
        isOpen={checkInModalOpen}
        onClose={() => setCheckInModalOpen(false)}
        onEdit={openEditModal}
        roleCode={roleCode}
      />
      <AppointmentModal
        clickedEvent={clickedEvent}
        clickedTime={clickedTime}
        isOpen={appointmentModalOpen}
        office={office}
        onClose={() => {
          setAppointmentModalOpen(false)
          setClickedEvent(null)
          setClickedTime(null)
        }}
        onDraftCleanup={cleanupDraft}
        roleCode={roleCode}
        services={services}
      />
      <AppointmentBlackoutModal
        appointments={appointments}
        isOpen={blackoutModalOpen}
        office={office}
        onClose={() => setBlackoutModalOpen(false)}
        recurringEnabled={recurringFeatureFlag === 'On'}
        roleCode={roleCode}
        username={username}
      />
    </section>
  )
}

function AppointmentList({
  events,
  onSelectDate,
}: {
  events: AppointmentCalendarEvent[]
  onSelectDate: (date: Date) => void
}) {
  const grouped = events
    .slice()
    .sort((left, right) => left.start.getTime() - right.start.getTime())
    .reduce<Record<string, AppointmentCalendarEvent[]>>((output, event) => {
      const key = formatDateInputValue(event.start)
      output[key] = output[key] ?? []
      output[key].push(event)
      return output
    }, {})

  if (events.length === 0) {
    return <p className="m-0 p-4">No events found</p>
  }

  return (
    <div className="border-bc-border min-h-0 flex-1 overflow-auto border bg-white">
      <table
        className="w-full border-collapse"
        aria-label="Filtered appointments"
      >
        <tbody>
          {Object.entries(grouped).map(([dateKey, dayEvents]) => (
            <Fragment key={dateKey}>
              <tr
                className="bg-bc-light-gray cursor-pointer"
                key={`${dateKey}-heading`}
                onClick={() => onSelectDate(dayEvents[0].start)}
              >
                <th
                  className="border-bc-border border-b px-3 py-2 text-left"
                  colSpan={3}
                >
                  {format(dayEvents[0].start, 'MMMM dd, yyyy')}
                </th>
              </tr>
              {dayEvents.map((event) => (
                <tr
                  className="border-bc-border border-t"
                  key={event.appointment_id}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {format(event.start, 'hh:mm')} -{' '}
                    {format(event.end, 'hh:mm')}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{
                        backgroundColor:
                          event.color === 'cal-events-default'
                            ? '#2e6f40'
                            : event.color,
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <strong>Name:</strong> {event.title}{' '}
                    <strong>Service Name:</strong> {event.serviceName}{' '}
                    {event.comments && (
                      <>
                        <strong>Notes:</strong> {event.comments}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
