import { useMemo, useState } from 'react'
import { RRule } from 'rrule'

import {
  createAppointment,
  createBooking,
  getOffices,
  getRooms,
} from '@/api/endpoints'
import type { Appointment, Office } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import AlertBanner from '@/components/AlertBanner'
import Button from '@/components/Button'
import Dialog, { DialogTitle } from '@/components/Dialog'
import Modal from '@/components/Modal'
import { getErrorMessage } from '@/lib/errors'
import { createUuid } from '@/lib/uuid'

import {
  buildRecurringWindows,
  countOverlappingAppointments,
  isWithinAppointmentHours,
} from './appointment-utils'
import {
  addMinutes,
  formatDateInputValue,
  mergeDateAndTime,
  officeDateToUtcIso,
} from '@/lib/datetime'
import { useCreateAppointmentBlackoutMutation } from './appointment-mutations'

interface AppointmentBlackoutModalProps {
  appointments: Appointment[]
  isOpen: boolean
  office: Office
  onClose: () => void
  recurringEnabled: boolean
  roleCode: string | null
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

export default function AppointmentBlackoutModal({
  appointments,
  isOpen,
  office,
  onClose,
  recurringEnabled,
  roleCode,
  username,
}: AppointmentBlackoutModalProps) {
  const apiClient = useApiClient()
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
  const [notes, setNotes] = useState('')
  const [statDates, setStatDates] = useState([
    { date: formatDateInputValue(new Date()), note: '' },
  ])
  const [onlyThisOffice, setOnlyThisOffice] = useState(false)
  const [onlyAppointments, setOnlyAppointments] = useState(false)
  const [confirmOverlap, setConfirmOverlap] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const createBlackoutMutation = useCreateAppointmentBlackoutMutation()
  const isSaving = createBlackoutMutation.isPending

  const support = roleCode === 'SUPPORT'
  const windows = useMemo(() => {
    if (mode === 'stat') {
      return statDates
        .filter((entry) => entry.date)
        .map((entry) => {
          const start = mergeDateAndTime(entry.date, '00:00')
          return { start, end: addMinutes(start, 24 * 60 - 1) }
        })
    }

    const start = mergeDateAndTime(dateValue, startTimeValue)
    const end = mergeDateAndTime(dateValue, endTimeValue)

    if (mode === 'single') {
      return [{ start, end }]
    }

    return buildRecurringWindows({
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
  const overlapCount = countOverlappingAppointments(appointments, windows)

  if (!isOpen) {
    return null
  }

  function resetAndClose() {
    setMode('single')
    setConfirmOverlap(false)
    setErrorMessage(null)
    onClose()
  }

  function validate() {
    if (mode === 'stat') {
      return true
    }

    const start = mergeDateAndTime(dateValue, startTimeValue)
    const end = mergeDateAndTime(dateValue, endTimeValue)

    if (!isWithinAppointmentHours(start, end) || end <= start) {
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

  async function handleSubmit(force = false) {
    if (!validate()) {
      return
    }

    if (!force && mode !== 'stat' && overlapCount > 0) {
      setConfirmOverlap(true)
      return
    }

    setErrorMessage(null)

    try {
      await createBlackoutMutation.mutateAsync(async () => {
        if (mode === 'stat') {
          await createStatRecords()
          return
        }

        const recurringUuid = mode === 'recurring' ? createUuid() : null

        for (const window of windows) {
          await createAppointment(apiClient, {
            blackout_flag: 'Y',
            citizen_name: 'BLACKOUT PERIOD',
            comments: notes || null,
            contact_information: username,
            end_time: officeDateToUtcIso(
              window.end,
              office.timezone.timezone_name,
            ),
            office_id: office.office_id,
            recurring_uuid: recurringUuid,
            start_time: officeDateToUtcIso(
              window.start,
              office.timezone.timezone_name,
            ),
          })
        }
      })
      resetAndClose()
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to create blackout.'))
    }
  }

  async function createStatRecords() {
    const recurringUuid = createUuid()
    const offices = onlyThisOffice ? [office] : await getOffices(apiClient)

    for (const targetOffice of offices) {
      for (const entry of statDates.filter((item) => item.date)) {
        const start = mergeDateAndTime(entry.date, '00:00')
        const end = addMinutes(start, 24 * 60 - 1)
        const appointmentPayload = {
          citizen_name: `STAT PERIOD_${targetOffice.office_name}`,
          comments: entry.note || null,
          contact_information: username,
          end_time: officeDateToUtcIso(
            end,
            targetOffice.timezone.timezone_name,
          ),
          office_id: targetOffice.office_id,
          recurring_uuid: recurringUuid,
          start_time: officeDateToUtcIso(
            start,
            targetOffice.timezone.timezone_name,
          ),
          stat_flag: true,
        }

        await createAppointment(apiClient, appointmentPayload)

        if (!onlyAppointments) {
          const rooms = await getRooms(apiClient, targetOffice.office_id)

          for (const room of rooms) {
            await createBooking(apiClient, {
              blackout_notes: entry.note,
              booking_contact_information: username,
              booking_name: `STAT PERIOD_${targetOffice.office_name}`,
              end_time: appointmentPayload.end_time,
              for_stat: true,
              office_id: targetOffice.office_id,
              recurring_uuid: recurringUuid,
              room_id: room.room_id,
              start_time: appointmentPayload.start_time,
              stat_flag: true,
            })
          }
        }
      }
    }
  }

  return (
    <Modal className="max-w-3xl overflow-hidden" isDismissable={false} isOpen>
      <Dialog className="p-0" isCloseable={false}>
        <div className="border-bc-border bg-bc-light-gray border-b px-6 py-4">
          <DialogTitle className="text-bc-h4 m-0 font-bold">
            Schedule Appointment Blackout
          </DialogTitle>
        </div>
        <div className="flex flex-col gap-4 p-6">
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
          {confirmOverlap && (
            <div
              className="border-bc-gold-60 bg-bc-light-gray border-l-4 p-4"
              role="alert"
            >
              <p className="mt-0">
                There is {overlapCount} appointment(s) which is overlapping with
                this Blackout. Are you sure you want to create the Blackout?
              </p>
              <div className="flex gap-3">
                <Button onClick={() => void handleSubmit(true)}>Yes</Button>
                <Button
                  onClick={() => setConfirmOverlap(false)}
                  variant="secondary"
                >
                  No
                </Button>
              </div>
            </div>
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
                    <legend className="font-bold">Select Weekdays:</legend>
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
                      Number of Occurences(optional):
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
              <label className="flex flex-col gap-1">
                <span className="font-bold">Event Notes</span>
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
                      setOnlyAppointments(false)
                    }
                  }}
                  type="checkbox"
                />
                Only this Office
              </label>
              {onlyThisOffice && (
                <label className="flex items-center gap-2">
                  <input
                    checked={onlyAppointments}
                    onChange={(event) =>
                      setOnlyAppointments(event.target.checked)
                    }
                    type="checkbox"
                  />
                  Only appointment
                </label>
              )}
            </div>
          )}
        </div>
        <div className="bg-bc-light-gray flex justify-end gap-3 border-t px-6 py-4">
          <Button
            disabled={isSaving}
            onClick={resetAndClose}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button disabled={isSaving} onClick={() => void handleSubmit(false)}>
            Submit
          </Button>
        </div>
      </Dialog>
    </Modal>
  )
}
