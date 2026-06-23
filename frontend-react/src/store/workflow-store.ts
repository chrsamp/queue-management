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
  currentCsrId: number | null
  currentRoleCode: string | null
  currentCsrState: CsrState | null
  currentOffice: Office | null
  realtimeConnectionStatus: RealtimeConnectionStatus
  realtimeLastError: string | null
  realtimeLastEvent: string | null
  realtimeRoomStatus: RealtimeRoomStatus
  clearWorkflow: () => void
  clearCurrentOffice: () => void
  setCurrentCsr: (csr: Csr) => void
  setCurrentCsrState: (csrState: CsrState) => void
  setCurrentOffice: (office: Office) => void
  setRealtimeConnectionStatus: (status: RealtimeConnectionStatus) => void
  setRealtimeError: (message: string | null) => void
  setRealtimeEvent: (eventName: string) => void
  setRealtimeRoomStatus: (status: RealtimeRoomStatus) => void
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  currentCsrId: null,
  currentRoleCode: null,
  currentCsrState: null,
  currentOffice: null,
  realtimeConnectionStatus: 'idle',
  realtimeLastError: null,
  realtimeLastEvent: null,
  realtimeRoomStatus: 'idle',
  clearWorkflow: () =>
    set({
      currentCsrId: null,
      currentRoleCode: null,
      currentCsrState: null,
      currentOffice: null,
      realtimeConnectionStatus: 'idle',
      realtimeLastError: null,
      realtimeLastEvent: null,
      realtimeRoomStatus: 'idle',
    }),
  clearCurrentOffice: () => set({ currentOffice: null }),
  setCurrentCsr: (csr) =>
    set({
      currentCsrId: csr.csr_id,
      currentRoleCode: csr.role.role_code,
      currentCsrState: csr.csr_state ?? null,
      currentOffice: csr.office,
    }),
  setCurrentCsrState: (csrState) => set({ currentCsrState: csrState }),
  setCurrentOffice: (office) => set({ currentOffice: office }),
  setRealtimeConnectionStatus: (status) =>
    set({ realtimeConnectionStatus: status }),
  setRealtimeError: (message) => set({ realtimeLastError: message }),
  setRealtimeEvent: (eventName) => set({ realtimeLastEvent: eventName }),
  setRealtimeRoomStatus: (status) => set({ realtimeRoomStatus: status }),
}))
