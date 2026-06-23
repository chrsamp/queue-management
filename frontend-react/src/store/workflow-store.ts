import { create } from 'zustand'

import type { Csr, CsrState, Office } from '@/api/schemas'

interface WorkflowState {
  currentCsrId: number | null
  currentCsrState: CsrState | null
  currentOffice: Office | null
  clearWorkflow: () => void
  clearCurrentOffice: () => void
  setCurrentCsr: (csr: Csr) => void
  setCurrentCsrState: (csrState: CsrState) => void
  setCurrentOffice: (office: Office) => void
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  currentCsrId: null,
  currentCsrState: null,
  currentOffice: null,
  clearWorkflow: () =>
    set({
      currentCsrId: null,
      currentCsrState: null,
      currentOffice: null,
    }),
  clearCurrentOffice: () => set({ currentOffice: null }),
  setCurrentCsr: (csr) =>
    set({
      currentCsrId: csr.csr_id,
      currentCsrState: csr.csr_state ?? null,
      currentOffice: csr.office,
    }),
  setCurrentCsrState: (csrState) => set({ currentCsrState: csrState }),
  setCurrentOffice: (office) => set({ currentOffice: office }),
}))
