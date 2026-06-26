import { useEffect, useMemo, useState } from 'react'
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
  getBookings,
  getExams,
  getInvigilators,
  getRooms,
} from '@/api/endpoints'
import type { Exam, Office } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import AlertBanner from '@/components/AlertBanner'
import Button from '@/components/Button'
import { DialogTitle } from '@/components/Dialog'
import ModalLayout from '@/components/ModalLayout'
import SplitAction from '@/components/SplitAction'
import { queryKeys } from '@/query/query-keys'
import { useWorkflowStore } from '@/store/workflow-store'

import BookingBlackoutModal from './BookingBlackoutModal'
import BookingEventModal from './BookingEventModal'
import {
  bookingToCalendarEvent,
  buildRoomResources,
  canSelectBookingSlot,
  filterBookingEvents,
  getExamDurationMinutes,
  isAfterExamExpiry,
  type BookingCalendarEvent,
  type RoomResource,
} from './booking-utils'
import { addMinutes } from '@/lib/datetime'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({
  format,
  getDay,
  locales,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
})

const emptyBookings: never[] = []
const emptyRooms: never[] = []
const emptyExams: never[] = []
const emptyInvigilators: never[] = []

interface BookingsWorkspaceProps {
  office: Office
  recurringFeatureFlag: unknown
  roleCode: string | null
  username: string
}

type LocationMode = 'onsite' | 'offsite' | 'both'
type EventModalMode = 'other' | 'exam' | 'edit' | 'reschedule'

export default function BookingsWorkspace({
  office,
  recurringFeatureFlag,
  roleCode,
  username,
}: BookingsWorkspaceProps) {
  const apiClient = useApiClient()
  const clearExamSchedulingRequest = useWorkflowStore(
    (state) => state.clearExamSchedulingRequest,
  )
  const examSchedulingRequest = useWorkflowStore(
    (state) => state.examSchedulingRequest,
  )
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState<View>('work_week')
  const [search, setSearch] = useState('')
  const [locationMode, setLocationMode] = useState<LocationMode>('onsite')
  const [schedulingMode, setSchedulingMode] = useState<
    null | 'other' | 'exam' | 'reschedule'
  >(null)
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const [selectedEvent, setSelectedEvent] =
    useState<BookingCalendarEvent | null>(null)
  const [slotStart, setSlotStart] = useState<Date | null>(null)
  const [slotEnd, setSlotEnd] = useState<Date | null>(null)
  const [slotResource, setSlotResource] = useState<RoomResource | null>(null)
  const [eventModalMode, setEventModalMode] = useState<EventModalMode>('other')
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [examPickerOpen, setExamPickerOpen] = useState(false)
  const [blackoutModalOpen, setBlackoutModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const bookingsQuery = useQuery({
    queryFn: ({ signal }) => getBookings(apiClient, signal),
    queryKey: queryKeys.bookings.office(office.office_id),
  })
  const roomsQuery = useQuery({
    queryFn: ({ signal }) => getRooms(apiClient, office.office_id, signal),
    queryKey: queryKeys.rooms(office.office_id),
  })
  const examsQuery = useQuery({
    queryFn: ({ signal }) => getExams(apiClient, signal),
    queryKey: queryKeys.exams.all,
  })
  const invigilatorsQuery = useQuery({
    queryFn: ({ signal }) => getInvigilators(apiClient, signal),
    queryKey: queryKeys.invigilators,
  })

  const bookings = bookingsQuery.data ?? emptyBookings
  const rooms = roomsQuery.data ?? emptyRooms
  const exams = examsQuery.data ?? emptyExams
  const invigilators = invigilatorsQuery.data ?? emptyInvigilators
  const resources = useMemo(() => buildRoomResources(rooms), [rooms])
  const events = useMemo(
    () =>
      bookings
        .map((booking) => bookingToCalendarEvent(booking, exams))
        .filter((event): event is BookingCalendarEvent => event !== null),
    [bookings, exams],
  )
  const filteredEvents = useMemo(
    () => filterBookingEvents({ events, mode: locationMode, search }),
    [events, locationMode, search],
  )
  const visibleResources = useMemo(() => {
    if (locationMode === 'onsite') {
      return resources.filter((resource) => resource.id !== '_offsite')
    }

    if (locationMode === 'offsite') {
      return resources.filter((resource) => resource.id === '_offsite')
    }

    return resources
  }, [locationMode, resources])
  const unscheduledExams = useMemo(
    () => exams.filter((exam) => exam.booking_id == null && !exam.booking),
    [exams],
  )
  const recurringEnabled = recurringFeatureFlag === 'On'
  const routeError =
    bookingsQuery.isError || roomsQuery.isError || examsQuery.isError
      ? 'Unable to load room booking data.'
      : null

  useEffect(() => {
    if (!examSchedulingRequest) {
      return
    }

    openExamScheduling(examSchedulingRequest)
    clearExamSchedulingRequest()
  }, [examSchedulingRequest, clearExamSchedulingRequest])

  function resetScheduling() {
    setSchedulingMode(null)
    setSelectedExam(null)
    setSelectedEvent(null)
    setSlotStart(null)
    setSlotEnd(null)
    setSlotResource(null)
    setErrorMessage(null)
  }

  function openOtherScheduling() {
    setSelectedExam(null)
    setSelectedEvent(null)
    setSchedulingMode('other')
    setLocationMode('onsite')
    setErrorMessage('Select a room and time on the calendar.')
  }

  function openExamScheduling(exam: Exam) {
    setSelectedExam(exam)
    setSelectedEvent(null)
    setSchedulingMode('exam')
    setLocationMode('onsite')
    setExamPickerOpen(false)
    setErrorMessage('Select a room and time on the calendar.')
  }

  function openReschedule(event: BookingCalendarEvent) {
    setSelectedEvent(event)
    setSelectedExam(event.exam)
    setSchedulingMode('reschedule')
    setLocationMode('onsite')
    setEventModalOpen(false)
    setErrorMessage('Select a new room and time on the calendar.')
  }

  function handleSelectSlot(slot: SlotInfo) {
    const resourceId = slot.resourceId as number | '_offsite' | undefined

    if (view === 'month') {
      setDate(slot.start)
      setView('day')
      return
    }

    if (
      !canSelectBookingSlot({
        resourceId,
        scheduling: schedulingMode !== null,
        start: slot.start,
      })
    ) {
      return
    }

    const resource =
      resources.find((candidate) => candidate.id === resourceId) ?? null
    const start = slot.start
    const end =
      schedulingMode === 'exam' && selectedExam
        ? addMinutes(start, getExamDurationMinutes(selectedExam))
        : schedulingMode === 'reschedule' && selectedEvent
          ? addMinutes(
              start,
              selectedEvent.end.getTime() > selectedEvent.start.getTime()
                ? Math.round(
                    (selectedEvent.end.getTime() -
                      selectedEvent.start.getTime()) /
                      60000,
                  )
                : 30,
            )
          : slot.end

    if (selectedExam && isAfterExamExpiry(start, selectedExam)) {
      setErrorMessage(
        `This exam has expired on ${format(new Date(selectedExam.expiry_date ?? ''), 'MMMM dd, yyyy')}. Scheduling past expiry date is not allowed.`,
      )
      return
    }

    setSlotStart(start)
    setSlotEnd(end)
    setSlotResource(resource)
    setEventModalMode(
      schedulingMode === 'exam'
        ? 'exam'
        : schedulingMode === 'reschedule'
          ? 'reschedule'
          : 'other',
    )
    setEventModalOpen(true)
  }

  function handleSelectEvent(event: BookingCalendarEvent) {
    if (schedulingMode || event.resourceId === '_offsite') {
      return
    }

    if (view === 'month') {
      setDate(event.start)
      setView('day')
      setSearch('')
      return
    }

    setSelectedEvent(event)
    setSelectedExam(event.exam)
    setSlotStart(null)
    setSlotEnd(null)
    setSlotResource(null)
    setEventModalMode('edit')
    setEventModalOpen(true)
  }

  function closeEventModal() {
    setEventModalOpen(false)
    resetScheduling()
  }

  return (
    <section className="flex h-full min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden p-6">
      <div className="flex items-center justify-between gap-3">
        <form
          className="flex shrink-0 flex-wrap items-center gap-3"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="font-bold" htmlFor="booking-search">
            Filter Exams
          </label>
          <input
            className="border-bc-border rounded-sm border px-3 py-2"
            id="booking-search"
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
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-bold">Show Bookings in</span>
            {(['onsite', 'offsite', 'both'] as const).map((mode) => (
              <Button
                key={mode}
                onClick={() => setLocationMode(mode)}
                size="small"
                variant={locationMode === mode ? 'primary' : 'secondary'}
              >
                {mode === 'onsite'
                  ? 'On-site'
                  : mode === 'offsite'
                    ? 'Off-site'
                    : 'Both'}
              </Button>
            ))}
          </div>
        </form>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <SplitAction
              items={[
                { id: 'exam', label: 'Exam Event' },
                { id: 'other', label: 'Non-Exam Event' },
                { id: 'blackout', label: 'Blackout' },
              ]}
              label="Create new..."
              onAction={(key) => {
                if (key === 'exam') {
                  setExamPickerOpen(true)
                }

                if (key === 'other') {
                  openOtherScheduling()
                }

                if (key === 'blackout') {
                  setBlackoutModalOpen(true)
                }
              }}
            />
            {schedulingMode && (
              <Button onClick={resetScheduling} variant="secondary">
                Cancel Scheduling
              </Button>
            )}
          </div>
        </div>
      </div>

      {(errorMessage || routeError) && (
        <AlertBanner
          isCloseable={false}
          role="alert"
          size="small"
          variant="danger"
        >
          {errorMessage ?? routeError}
        </AlertBanner>
      )}

      {schedulingMode && !eventModalOpen && (
        <p className="border-bc-border bg-bc-light-gray m-0 border px-3 py-2">
          {schedulingMode === 'exam' && selectedExam
            ? `Scheduling ${selectedExam.exam_name || 'exam'}`
            : schedulingMode === 'reschedule'
              ? 'Rescheduling booking'
              : 'Scheduling non-exam event'}
        </p>
      )}

      <div className="border-bc-border min-h-0 flex-1 overflow-hidden rounded-sm border bg-white p-3">
        <Calendar
          date={date}
          endAccessor="end"
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: event.color,
              borderColor: event.color,
              color: event.color === '#000000' ? '#fff' : undefined,
            },
          })}
          events={filteredEvents}
          localizer={localizer}
          onNavigate={setDate}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          onView={setView}
          resourceIdAccessor="id"
          resources={visibleResources}
          resourceTitleAccessor="title"
          selectable
          startAccessor="start"
          step={30}
          titleAccessor="title"
          view={view}
          views={['day', 'work_week', 'month', 'agenda']}
        />
      </div>

      <div className="flex shrink-0 flex-wrap gap-x-5 gap-y-2">
        {visibleResources.map((resource) => (
          <div className="flex items-center gap-2" key={String(resource.id)}>
            <span
              aria-hidden="true"
              className="inline-block h-4 w-4 rounded-sm"
              style={{ backgroundColor: resource.eventColor }}
            />
            <span>{resource.title}</span>
          </div>
        ))}
      </div>

      <BookingEventModal
        event={eventModalMode === 'reschedule' ? selectedEvent : selectedEvent}
        exam={selectedExam}
        invigilators={invigilators}
        isOpen={eventModalOpen}
        mode={eventModalMode}
        office={office}
        onClose={closeEventModal}
        onReschedule={openReschedule}
        resource={slotResource}
        roleCode={roleCode}
        rooms={rooms}
        slotEnd={slotEnd}
        slotStart={slotStart}
      />

      <BookingBlackoutModal
        isOpen={blackoutModalOpen}
        office={office}
        onClose={() => setBlackoutModalOpen(false)}
        recurringEnabled={recurringEnabled}
        roleCode={roleCode}
        rooms={rooms}
        username={username}
      />

      {examPickerOpen && (
        <ExamPickerModal
          exams={unscheduledExams}
          onClose={() => setExamPickerOpen(false)}
          onSelect={openExamScheduling}
        />
      )}
    </section>
  )
}

function ExamPickerModal({
  exams,
  onClose,
  onSelect,
}: {
  exams: Exam[]
  onClose: () => void
  onSelect: (exam: Exam) => void
}) {
  return (
    <ModalLayout
      className="max-w-4xl"
      header={
        <DialogTitle className="text-bc-h4 m-0 font-bold">
          Select Exam
        </DialogTitle>
      }
      onClose={onClose}
    >
      <div className="p-6">
        {exams.length === 0 ? (
          <p className="m-0">No unscheduled exams are available.</p>
        ) : (
          <table className="border-bc-border w-full border-collapse border text-left">
            <thead className="bg-bc-light-gray">
              <tr>
                <th className="border-bc-border bg-bc-light-gray sticky top-0 z-10 border p-2">
                  Exam
                </th>
                <th className="border-bc-border bg-bc-light-gray sticky top-0 z-10 border p-2">
                  Writer
                </th>
                <th className="border-bc-border bg-bc-light-gray sticky top-0 z-10 border p-2">
                  Event ID
                </th>
                <th className="border-bc-border bg-bc-light-gray sticky top-0 z-10 border p-2">
                  Expiry
                </th>
                <th className="border-bc-border bg-bc-light-gray sticky top-0 z-10 border p-2">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.exam_id}>
                  <td className="border-bc-border border p-2">
                    {exam.exam_name || '-'}
                  </td>
                  <td className="border-bc-border border p-2">
                    {exam.examinee_name || '-'}
                  </td>
                  <td className="border-bc-border border p-2">
                    {exam.event_id || '-'}
                  </td>
                  <td className="border-bc-border border p-2">
                    {exam.expiry_date
                      ? format(new Date(exam.expiry_date), 'yyyy-MM-dd')
                      : '-'}
                  </td>
                  <td className="border-bc-border border p-2">
                    <Button onClick={() => onSelect(exam)} size="small">
                      Schedule
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ModalLayout>
  )
}
