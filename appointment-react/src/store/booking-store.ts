import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type BookingStep = 'location' | 'service' | 'date' | 'login' | 'summary'

export interface SelectedSlot {
  dateKey: string
  startTime: string
  endTime: string
}

interface BookingState {
  selectedOfficeId: number | null
  selectedServiceId: number | null
  selectedSlot: SelectedSlot | null
  draftAppointmentId: number | null
  editAppointmentId: number | null
  currentStep: BookingStep
  pendingPostLoginPath: string | null
  setOfficeId: (officeId: number | null) => void
  setServiceId: (serviceId: number | null) => void
  setSelectedSlot: (slot: SelectedSlot | null) => void
  setDraftAppointmentId: (appointmentId: number | null) => void
  setEditAppointmentId: (appointmentId: number | null) => void
  setCurrentStep: (step: BookingStep) => void
  setPendingPostLoginPath: (path: string | null) => void
  clearBooking: () => void
}

const initialState = {
  selectedOfficeId: null,
  selectedServiceId: null,
  selectedSlot: null,
  draftAppointmentId: null,
  editAppointmentId: null,
  currentStep: 'location' as BookingStep,
  pendingPostLoginPath: null,
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      ...initialState,
      setOfficeId: (officeId) =>
        set((state) =>
          state.selectedOfficeId === officeId
            ? state
            : {
                selectedOfficeId: officeId,
                selectedServiceId: null,
                selectedSlot: null,
                draftAppointmentId: null,
                currentStep: officeId === null ? 'location' : state.currentStep,
              },
        ),
      setServiceId: (serviceId) =>
        set((state) =>
          state.selectedServiceId === serviceId
            ? state
            : {
                selectedServiceId: serviceId,
                selectedSlot: null,
                draftAppointmentId: null,
                currentStep:
                  serviceId === null && state.currentStep !== 'location'
                    ? 'service'
                    : state.currentStep,
              },
        ),
      setSelectedSlot: (selectedSlot) => set({ selectedSlot }),
      setDraftAppointmentId: (draftAppointmentId) =>
        set({ draftAppointmentId }),
      setEditAppointmentId: (editAppointmentId) => set({ editAppointmentId }),
      setCurrentStep: (currentStep) => set({ currentStep }),
      setPendingPostLoginPath: (pendingPostLoginPath) =>
        set({ pendingPostLoginPath }),
      clearBooking: () => set(initialState),
    }),
    {
      name: 'appointment-booking',
      version: 1,
      storage: createJSONStorage(() => window.sessionStorage),
      partialize: (state) => ({
        selectedOfficeId: state.selectedOfficeId,
        selectedServiceId: state.selectedServiceId,
        selectedSlot: state.selectedSlot,
        draftAppointmentId: state.draftAppointmentId,
        editAppointmentId: state.editAppointmentId,
        currentStep: state.currentStep,
        pendingPostLoginPath: state.pendingPostLoginPath,
      }),
    },
  ),
)
