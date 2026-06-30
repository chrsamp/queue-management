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
      currentStep: 'service',
      draftAppointmentId: null,
      selectedOfficeId: 11,
      selectedServiceId: null,
      selectedSlot: null,
    })
  })

  it('persists only resumable workflow data', () => {
    useBookingStore.getState().setOfficeId(10)
    useBookingStore.getState().setPendingPostLoginPath('/account-settings')

    const persisted = window.sessionStorage.getItem('appointment-booking')

    expect(persisted).toContain('"selectedOfficeId":10')
    expect(persisted).toContain('/account-settings')
    expect(persisted).not.toContain('token')
  })
})
