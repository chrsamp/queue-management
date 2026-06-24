import { create } from 'zustand'

import type { Csr, CsrState, Office } from '@/api/schemas'

export type GlobalAlertVariant =
  | 'black'
  | 'danger'
  | 'info'
  | 'success'
  | 'warning'

export interface GlobalAlert {
  id: string
  isCloseable?: boolean
  message: string
  role?: 'alert' | 'status'
  variant?: GlobalAlertVariant
}

export type RealtimeConnectionStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'idle'
  | 'reconnecting'

export type RealtimeRoomStatus = 'failed' | 'idle' | 'joined'

interface WorkflowState {
  activeCitizenId: number | null
  activeServiceRequestId: number | null
  citizenInvited: boolean
  currentCounterId: number | null
  currentCsrId: number | null
  currentRoleCode: string | null
  currentUsername: string | null
  globalAlert: GlobalAlert | null
  currentCsrState: CsrState | null
  currentOffice: Office | null
  currentReceptionist: boolean | null
  realtimeConnectionStatus: RealtimeConnectionStatus
  realtimeLastError: string | null
  realtimeLastEvent: string | null
  realtimeRoomStatus: RealtimeRoomStatus
  serveModalAlert: string | null
  serviceBegun: boolean
  showServiceModal: boolean
  showDayAgenda: boolean
  showTimeTrackingIcon: boolean
  terminalClearedCitizenId: number | null
  clearWorkflow: () => void
  clearGlobalAlert: () => void
  clearCurrentOffice: () => void
  clearServeCitizen: () => void
  clearTerminalServeCitizen: (citizenId: number) => void
  closeServiceModal: () => void
  openServiceModal: () => void
  resetTerminalClearedCitizen: () => void
  setActiveServiceCitizen: (
    citizenId: number | null,
    serviceRequestId: number | null,
    serviceBegun: boolean,
  ) => void
  setCounterReceptionistState: (
    counterId: number | null,
    receptionist: boolean | null,
  ) => void
  setCurrentCsr: (csr: Csr) => void
  setCurrentCsrState: (csrState: CsrState) => void
  setCurrentOffice: (office: Office) => void
  setGlobalAlert: (alert: GlobalAlert) => void
  setRealtimeConnectionStatus: (status: RealtimeConnectionStatus) => void
  setRealtimeError: (message: string | null) => void
  setRealtimeEvent: (eventName: string) => void
  setRealtimeRoomStatus: (status: RealtimeRoomStatus) => void
  setServeModalAlert: (message: string | null) => void
  setShowDayAgenda: (show: boolean) => void
  setShowTimeTrackingIcon: (show: boolean) => void
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  activeCitizenId: null,
  activeServiceRequestId: null,
  citizenInvited: false,
  currentCounterId: null,
  currentCsrId: null,
  currentRoleCode: null,
  currentUsername: null,
  globalAlert: null,
  currentCsrState: null,
  currentOffice: null,
  currentReceptionist: null,
  realtimeConnectionStatus: 'idle',
  realtimeLastError: null,
  realtimeLastEvent: null,
  realtimeRoomStatus: 'idle',
  serveModalAlert: null,
  serviceBegun: false,
  showServiceModal: false,
  showDayAgenda: false,
  showTimeTrackingIcon: false,
  terminalClearedCitizenId: null,
  clearWorkflow: () =>
    set({
      activeCitizenId: null,
      activeServiceRequestId: null,
      citizenInvited: false,
      currentCounterId: null,
      currentCsrId: null,
      currentRoleCode: null,
      currentUsername: null,
      globalAlert: null,
      currentCsrState: null,
      currentOffice: null,
      currentReceptionist: null,
      realtimeConnectionStatus: 'idle',
      realtimeLastError: null,
      realtimeLastEvent: null,
      realtimeRoomStatus: 'idle',
      serveModalAlert: null,
      serviceBegun: false,
      showServiceModal: false,
      showDayAgenda: false,
      showTimeTrackingIcon: false,
      terminalClearedCitizenId: null,
    }),
  clearCurrentOffice: () => set({ currentOffice: null }),
  clearGlobalAlert: () => set({ globalAlert: null }),
  clearServeCitizen: () =>
    set({
      activeCitizenId: null,
      activeServiceRequestId: null,
      citizenInvited: false,
      serveModalAlert: null,
      serviceBegun: false,
      showServiceModal: false,
      showTimeTrackingIcon: false,
      terminalClearedCitizenId: null,
    }),
  clearTerminalServeCitizen: (citizenId) =>
    set({
      activeCitizenId: null,
      activeServiceRequestId: null,
      citizenInvited: false,
      serveModalAlert: null,
      serviceBegun: false,
      showServiceModal: false,
      showTimeTrackingIcon: false,
      terminalClearedCitizenId: citizenId,
    }),
  closeServiceModal: () => set({ showServiceModal: false }),
  openServiceModal: () =>
    set({
      showServiceModal: true,
      showTimeTrackingIcon: false,
    }),
  setActiveServiceCitizen: (citizenId, serviceRequestId, serviceBegun) =>
    set({
      activeCitizenId: citizenId,
      activeServiceRequestId: serviceRequestId,
      citizenInvited: citizenId !== null && !serviceBegun,
      serviceBegun,
      terminalClearedCitizenId: null,
    }),
  resetTerminalClearedCitizen: () => set({ terminalClearedCitizenId: null }),
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
      currentUsername: csr.username,
      currentCsrState: csr.csr_state ?? null,
      currentOffice: csr.office,
      currentReceptionist: csr.receptionist_ind === 1,
    }),
  setCurrentCsrState: (csrState) => set({ currentCsrState: csrState }),
  setCurrentOffice: (office) => set({ currentOffice: office }),
  setGlobalAlert: (alert) => set({ globalAlert: alert }),
  setRealtimeConnectionStatus: (status) =>
    set({ realtimeConnectionStatus: status }),
  setRealtimeError: (message) => set({ realtimeLastError: message }),
  setRealtimeEvent: (eventName) => set({ realtimeLastEvent: eventName }),
  setRealtimeRoomStatus: (status) => set({ realtimeRoomStatus: status }),
  setServeModalAlert: (message) => set({ serveModalAlert: message }),
  setShowDayAgenda: (show) => set({ showDayAgenda: show }),
  setShowTimeTrackingIcon: (show) => set({ showTimeTrackingIcon: show }),
}))
