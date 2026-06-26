import { useMemo, useState } from 'react'
import { RRule } from 'rrule'
import { useQueryClient } from '@tanstack/react-query'

import {
  createAppointment,
  createBooking,
  getOffices,
  getRooms,
} from '@/api/endpoints'
import type { Office, Room } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import AlertBanner from '@/components/AlertBanner'
import Button from '@/components/Button'
import Dialog, { DialogTitle } from '@/components/Dialog'
import Modal from '@/components/Modal'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/query/query-keys'

import {
  buildRecurringBookingWindows,
  createUuid,
  isWithinBookingHours,
  offsiteResource,
  type BookingWindow,
} from './booking-utils'
import {
  addMinutes,
  formatDateInputValue,
  mergeDateAndTime,
  officeDateToUtcIso,
} from '@/lib/datetime'

interface BookingBlackoutModalProps {
  isOpen: boolean
  office: Office
  onClose: () => void
  recurringEnabled: boolean
  roleCode: string | null
  rooms: Room[]
  username: string
}

type BlackoutMode = 'single' | 'recurring' | 'stat'

const weekdayOptions = [
  { label: 'Mon.', value: 'MO', weekday: RRule.MO },
  { label: 'Tues.', value: 'TU', weekday: RRule.TU },
  { label: 'Wed.', value: 'WE', weekday: RRule.WE },
  { label: 'Thurs.', value: 'TH', weekday: RRule.TH },
  { label: 'Fri.', value: 'FR', weekday: RRule.FR },
]

export default function BookingBlackoutModal({
  isOpen,
  office,
  onClose,
  recurringEnabled,
  roleCode,
  rooms,
  username,
}: BookingBlackoutModalProps) {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<BlackoutMode>('single')
  const [dateValue, setDateValue] = useState(formatDateInputValue(new Date()))
  const [startTimeValue, setStartTimeValue] = useState('08:30')
  const [endTimeValue, setEndTimeValue] = useState('17:00')
  const [endDateValue, setEndDateValue] = useState(
    formatDateInputValue(new Date()),
  )
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('weekly')
  const [weekdays, setWeekdays] = useState(['MO'])
  const [count, setCount] = useState('')
  const [selectedRoomIds, setSelectedRoomIds] = useState<
    Array<number | '_offsite'>
  >([])
  const [notes, setNotes] = useState('')
  const [contact, setContact] = useState(username)
  const [statDates, setStatDates] = useState([
    { date: formatDateInputValue(new Date()), note: '' },
  ])
  const [onlyThisOffice, setOnlyThisOffice] = useState(false)
  const [onlyBookings, setOnlyBookings] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [progress, setProgress] = useState<{
    done: number
    total: number
  } | null>(null)

  const support = roleCode === 'SUPPORT'
  const roomOptions = [
    ...rooms.map((room) => ({ label: room.room_name, value: room.room_id })),
    { label: offsiteResource.title, value: offsiteResource.id },
  ]
  const windows = useMemo(() => {
    if (mode === 'stat') {
      return statDates
        .filter((entry) => entry.date)
        .map((entry) => {
          const start = mergeDateAndTime(entry.date, '00:00')
          return {
            start,
            end: addMinutes(start, 24 * 60 - 1),
            note: entry.note,
          }
        })
    }

    const start = mergeDateAndTime(dateValue, startTimeValue)
    const end = mergeDateAndTime(dateValue, endTimeValue)

    if (mode === 'single') {
      return [{ start, end }]
    }

    return buildRecurringBookingWindows({
      count: count ? Number(count) : null,
      endDate: mergeDateAndTime(endDateValue, endTimeValue),
      endTime: end,
      frequency,
      startDate: start,
      startTime: start,
      weekdays: weekdayOptions
        .filter((option) => weekdays.includes(option.value))
        .map((option) => option.weekday),
    })
  }, [
    count,
    dateValue,
    endDateValue,
    endTimeValue,
    frequency,
    mode,
    startTimeValue,
    statDates,
    weekdays,
  ])

  if (!isOpen) {
    return null
  }

  function resetAndClose() {
    setMode('single')
    setErrorMessage(null)
    setIsSaving(false)
    setProgress(null)
    onClose()
  }

  function validate() {
    if (mode === 'stat') {
      if (!statDates.some((entry) => entry.date)) {
        setErrorMessage('Select at least one STAT date.')
        return false
      }

      return true
    }

    if (selectedRoomIds.length === 0) {
      setErrorMessage('Select at least one room.')
      return false
    }

    const start = mergeDateAndTime(dateValue, startTimeValue)
    const end = mergeDateAndTime(dateValue, endTimeValue)

    if (!isWithinBookingHours(start, end)) {
      setErrorMessage('Time not allowed')
      return false
    }

    if (mode === 'recurring') {
      const days =
        (mergeDateAndTime(endDateValue, endTimeValue).getTime() -
          mergeDateAndTime(dateValue, startTimeValue).getTime()) /
        86400000

      if (days > 365) {
        setErrorMessage('Cannot blackout more that 1 year at Once.')
        return false
      }
    }

    setErrorMessage(null)
    return true
  }

  async function handleSubmit() {
    if (!validate()) {
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      if (mode === 'stat') {
        await createStatRecords()
      } else {
        await createBlackoutBookings(windows)
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all }),
      ])
      resetAndClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to create blackout.'))
      setIsSaving(false)
    }
  }

  async function createBlackoutBookings(targetWindows: BookingWindow[]) {
    const recurringUuid = mode === 'recurring' ? createUuid() : null
    const total = targetWindows.length * selectedRoomIds.length
    let done = 0

    setProgress({ done, total })

    for (const roomId of selectedRoomIds) {
      for (const window of targetWindows) {
        await createBooking(apiClient, {
          blackout_flag: 'Y',
          blackout_notes: notes || null,
          booking_contact_information: contact || username,
          booking_name: 'BLACKOUT PERIOD',
          end_time: officeDateToUtcIso(
            window.end,
            office.timezone.timezone_name,
          ),
          office_id: office.office_id,
          recurring_uuid: recurringUuid,
          room_id: roomId === '_offsite' ? null : roomId,
          start_time: officeDateToUtcIso(
            window.start,
            office.timezone.timezone_name,
          ),
        })
        done += 1
        setProgress({ done, total })
      }
    }
  }

  async function createStatRecords() {
    const recurringUuid = createUuid()
    const targetOffices = onlyThisOffice
      ? [office]
      : await getOffices(apiClient)
    const dateEntries = statDates.filter((entry) => entry.date)
    const officeRoomEntries = []

    for (const targetOffice of targetOffices) {
      officeRoomEntries.push({
        office: targetOffice,
        rooms:
          targetOffice.office_id === office.office_id
            ? rooms
            : await getRooms(apiClient, targetOffice.office_id),
      })
    }

    const appointmentTotal = onlyBookings
      ? 0
      : dateEntries.length * targetOffices.length
    const roomTotal =
      dateEntries.length *
      officeRoomEntries.reduce((total, entry) => total + entry.rooms.length, 0)
    const total = appointmentTotal + roomTotal

    let done = 0
    setProgress({ done, total })

    for (const {
      office: targetOffice,
      rooms: officeRooms,
    } of officeRoomEntries) {
      for (const entry of dateEntries) {
        const start = mergeDateAndTime(entry.date, '00:00')
        const end = addMinutes(start, 24 * 60 - 1)
        const startIso = officeDateToUtcIso(
          start,
          targetOffice.timezone.timezone_name,
        )
        const endIso = officeDateToUtcIso(
          end,
          targetOffice.timezone.timezone_name,
        )

        if (!onlyBookings) {
          await createAppointment(apiClient, {
            citizen_name: `STAT PERIOD_${targetOffice.office_name}`,
            comments: entry.note || null,
            contact_information: contact || username,
            end_time: endIso,
            office_id: targetOffice.office_id,
            recurring_uuid: recurringUuid,
            start_time: startIso,
            stat_flag: true,
          })
          done += 1
          setProgress({ done, total })
        }

        for (const room of officeRooms) {
          await createBooking(apiClient, {
            blackout_notes: entry.note,
            booking_contact_information: contact || username,
            booking_name: `STAT PERIOD_${targetOffice.office_name}`,
            end_time: endIso,
            for_stat: true,
            office_id: targetOffice.office_id,
            recurring_uuid: recurringUuid,
            room_id: room.room_id,
            start_time: startIso,
            stat_flag: true,
          })
          done += 1
          setProgress({ done, total })
        }
      }
    }
  }

  return (
    <Modal className="max-w-4xl overflow-hidden" isDismissable={false} isOpen>
      <Dialog className="p-0" isCloseable={false}>
        <div className="border-bc-border bg-bc-light-gray border-b px-6 py-4">
          <DialogTitle className="text-bc-h4 m-0 font-bold">
            Schedule Booking Blackout
          </DialogTitle>
        </div>
        <div className="flex max-h-[75vh] flex-col gap-4 overflow-auto p-6">
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
          {progress && (
            <p className="border-bc-border bg-bc-light-gray m-0 border px-3 py-2">
              Submitting {progress.done} of {progress.total}
            </p>
          )}
          <fieldset className="border-bc-border rounded-sm border p-4">
            <legend className="px-1 font-bold">
              Step 1: Select Event Type
            </legend>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setMode('single')}
                variant={mode === 'single' ? 'primary' : 'secondary'}
              >
                Create Single Blackout
              </Button>
              {recurringEnabled && (
                <Button
                  onClick={() => setMode('recurring')}
                  variant={mode === 'recurring' ? 'primary' : 'secondary'}
                >
                  Create Recurring Blackout
                </Button>
              )}
              {support && (
                <Button
                  onClick={() => setMode('stat')}
                  variant={mode === 'stat' ? 'primary' : 'secondary'}
                >
                  Create STAT
                </Button>
              )}
            </div>
          </fieldset>
          {mode !== 'stat' ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-1">
                  <span className="font-bold">Blackout Date</span>
                  <input
                    className="border-bc-border rounded-sm border px-3 py-2"
                    onChange={(event) => setDateValue(event.target.value)}
                    type="date"
                    value={dateValue}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-bold">Blackout Start Time</span>
                  <input
                    className="border-bc-border rounded-sm border px-3 py-2"
                    onChange={(event) => setStartTimeValue(event.target.value)}
                    type="time"
                    value={startTimeValue}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-bold">Blackout End Time</span>
                  <input
                    className="border-bc-border rounded-sm border px-3 py-2"
                    onChange={(event) => setEndTimeValue(event.target.value)}
                    type="time"
                    value={endTimeValue}
                  />
                </label>
              </div>
              {mode === 'recurring' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="font-bold">Blackout End Date</span>
                    <input
                      className="border-bc-border rounded-sm border px-3 py-2"
                      onChange={(event) => setEndDateValue(event.target.value)}
                      type="date"
                      value={endDateValue}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-bold">Frequency</span>
                    <select
                      className="border-bc-border rounded-sm border px-3 py-2"
                      onChange={(event) =>
                        setFrequency(event.target.value as 'daily' | 'weekly')
                      }
                      value={frequency}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="daily">Daily</option>
                    </select>
                  </label>
                  <fieldset className="sm:col-span-2">
                    <legend className="font-bold">Select Weekdays</legend>
                    <div className="flex flex-wrap gap-3">
                      {weekdayOptions.map((option) => (
                        <label
                          className="flex items-center gap-2"
                          key={option.value}
                        >
                          <input
                            checked={weekdays.includes(option.value)}
                            onChange={(event) =>
                              setWeekdays((current) =>
                                event.target.checked
                                  ? [...current, option.value]
                                  : current.filter(
                                      (value) => value !== option.value,
                                    ),
                              )
                            }
                            type="checkbox"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="flex flex-col gap-1">
                    <span className="font-bold">
                      Number of Occurences (optional)
                    </span>
                    <input
                      className="border-bc-border rounded-sm border px-3 py-2"
                      onChange={(event) => setCount(event.target.value)}
                      type="number"
                      value={count}
                    />
                  </label>
                </div>
              )}
              <fieldset className="border-bc-border rounded-sm border p-4">
                <legend className="px-1 font-bold">Select Room(s)</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {roomOptions.map((room) => (
                    <label
                      className="flex items-center gap-2"
                      key={String(room.value)}
                    >
                      <input
                        checked={selectedRoomIds.includes(room.value)}
                        onChange={(event) =>
                          setSelectedRoomIds((current) =>
                            event.target.checked
                              ? [...current, room.value]
                              : current.filter((value) => value !== room.value),
                          )
                        }
                        type="checkbox"
                      />
                      {room.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex flex-col gap-1">
                <span className="font-bold">Blackout Notes (optional)</span>
                <textarea
                  className="border-bc-border min-h-24 rounded-sm border px-3 py-2"
                  maxLength={255}
                  onChange={(event) => setNotes(event.target.value)}
                  value={notes}
                />
              </label>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              {statDates.map((entry, index) => (
                <div
                  className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                  key={index}
                >
                  <input
                    aria-label="STAT Date"
                    className="border-bc-border rounded-sm border px-3 py-2"
                    onChange={(event) =>
                      setStatDates((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, date: event.target.value }
                            : item,
                        ),
                      )
                    }
                    type="date"
                    value={entry.date}
                  />
                  <input
                    aria-label="STAT Note"
                    className="border-bc-border rounded-sm border px-3 py-2"
                    maxLength={255}
                    onChange={(event) =>
                      setStatDates((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, note: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="Note"
                    value={entry.note}
                  />
                  <Button
                    disabled={statDates.length === 1}
                    onClick={() =>
                      setStatDates((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    variant="secondary"
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                onClick={() =>
                  setStatDates((current) => [
                    ...current,
                    { date: formatDateInputValue(new Date()), note: '' },
                  ])
                }
                variant="secondary"
              >
                Add STAT Date
              </Button>
              <label className="flex items-center gap-2">
                <input
                  checked={onlyThisOffice}
                  onChange={(event) => {
                    setOnlyThisOffice(event.target.checked)
                    if (!event.target.checked) {
                      setOnlyBookings(false)
                    }
                  }}
                  type="checkbox"
                />
                Only this Office
              </label>
              {onlyThisOffice && (
                <label className="flex items-center gap-2">
                  <input
                    checked={onlyBookings}
                    onChange={(event) => setOnlyBookings(event.target.checked)}
                    type="checkbox"
                  />
                  Only bookings
                </label>
              )}
            </div>
          )}
          <label className="flex max-w-md flex-col gap-1">
            <span className="font-bold">Contact Information (optional)</span>
            <input
              className="border-bc-border rounded-sm border px-3 py-2"
              onChange={(event) => setContact(event.target.value)}
              value={contact}
            />
          </label>
        </div>
        <div className="bg-bc-light-gray flex justify-end gap-3 border-t px-6 py-4">
          <Button
            disabled={isSaving}
            onClick={resetAndClose}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button disabled={isSaving} onClick={() => void handleSubmit()}>
            Submit
          </Button>
        </div>
      </Dialog>
    </Modal>
  )
}

