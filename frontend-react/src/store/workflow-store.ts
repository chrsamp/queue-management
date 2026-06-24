import { create } from 'zustand'

import type { Csr, CsrState, Office } from '@/api/schemas'

export type RealtimeConnectionStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'idle'
  | 'reconnecting'

export type RealtimeRoomStatus = 'failed' | 'idle' | 'joined'

interface WorkflowState {
  currentCounterId: number | null
  currentCsrId: number | null
  currentRoleCode: string | null
  currentCsrState: CsrState | null
  currentOffice: Office | null
  currentReceptionist: boolean | null
  realtimeConnectionStatus: RealtimeConnectionStatus
  realtimeLastError: string | null
  realtimeLastEvent: string | null
  realtimeRoomStatus: RealtimeRoomStatus
  clearWorkflow: () => void
  clearCurrentOffice: () => void
  setCounterReceptionistState: (
    counterId: number | null,
    receptionist: boolean | null,
  ) => void
  setCurrentCsr: (csr: Csr) => void
  setCurrentCsrState: (csrState: CsrState) => void
  setCurrentOffice: (office: Office) => void
  setRealtimeConnectionStatus: (status: RealtimeConnectionStatus) => void
  setRealtimeError: (message: string | null) => void
  setRealtimeEvent: (eventName: string) => void
  setRealtimeRoomStatus: (status: RealtimeRoomStatus) => void
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  currentCounterId: null,
  currentCsrId: null,
  currentRoleCode: null,
  currentCsrState: null,
  currentOffice: null,
  currentReceptionist: null,
  realtimeConnectionStatus: 'idle',
  realtimeLastError: null,
  realtimeLastEvent: null,
  realtimeRoomStatus: 'idle',
  clearWorkflow: () =>
    set({
      currentCounterId: null,
      currentCsrId: null,
      currentRoleCode: null,
      currentCsrState: null,
      currentOffice: null,
      currentReceptionist: null,
      realtimeConnectionStatus: 'idle',
      realtimeLastError: null,
      realtimeLastEvent: null,
      realtimeRoomStatus: 'idle',
    }),
  clearCurrentOffice: () => set({ currentOffice: null }),
  setCounterReceptionistState: (counterId, receptionist) =>
    set({
      currentCounterId: counterId,
      currentReceptionist: receptionist,
    }),
  setCurrentCsr: (csr) =>
    set({
      currentCounterId: csr.counter_id ?? null,
      currentCsrId: csr.csr_id,
      currentRoleCode: csr.role.role_code,
      currentCsrState: csr.csr_state ?? null,
      currentOffice: csr.office,
      currentReceptionist: csr.receptionist_ind === 1,
    }),
  setCurrentCsrState: (csrState) => set({ currentCsrState: csrState }),
  setCurrentOffice: (office) => set({ currentOffice: office }),
  setRealtimeConnectionStatus: (status) =>
    set({ realtimeConnectionStatus: status }),
  setRealtimeError: (message) => set({ realtimeLastError: message }),
  setRealtimeEvent: (eventName) => set({ realtimeLastEvent: eventName }),
  setRealtimeRoomStatus: (status) => set({ realtimeRoomStatus: status }),
}))
