import { create } from 'zustand'

import type { Office } from '@/api/schemas'

interface WorkflowState {
  currentOffice: Office | null
  clearCurrentOffice: () => void
  setCurrentOffice: (office: Office) => void
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  currentOffice: null,
  clearCurrentOffice: () => set({ currentOffice: null }),
  setCurrentOffice: (office) => set({ currentOffice: office }),
}))
