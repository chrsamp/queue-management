import { beforeEach, describe, expect, it } from 'vitest'

import { useBookingStore } from './booking-store'

describe('booking store', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    useBookingStore.getState().clearBooking()
  })

  it('clears dependent state when an office changes', () => {
    const store = useBookingStore.getState()
    store.setOfficeId(10)
    store.setServiceId(20)
    store.setSelectedSlot({
      dateKey: '07/15/2030',
      endTime: '09:30',
      startTime: '09:00',
    })
    store.setDraftAppointmentId(40)

    useBookingStore.getState().setOfficeId(11)

    expect(useBookingStore.getState()).toMatchObject({
      currentStep: 'location',
      draftAppointmentId: null,
      selectedOfficeId: 11,
      selectedServiceId: null,
      selectedSlot: null,
    })
  })

  it('does not navigate when a selection changes', () => {
    const store = useBookingStore.getState()

    store.setOfficeId(10)
    expect(useBookingStore.getState().currentStep).toBe('location')

    store.setCurrentStep('service')
    useBookingStore.getState().setServiceId(20)
    expect(useBookingStore.getState().currentStep).toBe('service')
  })

  it('persists only resumable workflow data', () => {
    useBookingStore.getState().setOfficeId(10)
    useBookingStore.getState().setPendingPostLoginPath('/account-settings')

    const persisted = window.sessionStorage.getItem('appointment-booking')

    expect(persisted).toContain('"selectedOfficeId":10')
    expect(persisted).toContain('/account-settings')
    expect(persisted).not.toContain('token')
  })

  it('stores and clears a draft reservation atomically', () => {
    const slot = {
      dateKey: '07/15/2030',
      endTime: '2030-07-15T16:30:00.000Z',
      startTime: '2030-07-15T16:00:00.000Z',
    }

    useBookingStore.getState().setReservation(slot, 40)

    expect(useBookingStore.getState()).toMatchObject({
      draftAppointmentId: 40,
      selectedSlot: slot,
    })
    expect(window.sessionStorage.getItem('appointment-booking')).toContain(
      '2030-07-15T16:00:00.000Z',
    )

    useBookingStore.getState().clearReservation()
    expect(useBookingStore.getState()).toMatchObject({
      draftAppointmentId: null,
      selectedSlot: null,
    })
  })

  it('hydrates and clears appointment edit state atomically', () => {
    const slot = {
      dateKey: '07/15/2030',
      endTime: '2030-07-15T16:30:00.000Z',
      startTime: '2030-07-15T16:00:00.000Z',
    }

    useBookingStore.getState().startAppointmentEdit({
      appointmentId: 41,
      officeId: 10,
      serviceId: 20,
      slot,
    })

    expect(useBookingStore.getState()).toMatchObject({
      currentStep: 'date',
      draftAppointmentId: null,
      editAppointmentId: 41,
      selectedOfficeId: 10,
      selectedServiceId: 20,
      selectedSlot: slot,
    })

    useBookingStore.getState().startNewBooking()
    expect(useBookingStore.getState()).toMatchObject({
      currentStep: 'location',
      editAppointmentId: null,
      selectedOfficeId: null,
      selectedServiceId: null,
      selectedSlot: null,
    })
  })
})
