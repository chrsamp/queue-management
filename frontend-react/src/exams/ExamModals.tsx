import type { ExamType, Invigilator, Office } from '@/api/schemas'

import AddExamModal from './AddExamModal'
import DeleteExamModal from './DeleteExamModal'
import EditExamModal from './EditExamModal'
import FinancialReportModal from './FinancialReportModal'
import GroupBookingModal from './GroupBookingModal'
import ReturnExamModal from './ReturnExamModal'
import SelectInvigilatorModal from './SelectInvigilatorModal'
import UploadPesticideExamModal from './UploadPesticideExamModal'
import type { ActiveExamModal } from './exam-modal-types'
import type { ExamPermissions } from './exam-utils'

interface ExamModalsProps {
  activeModal: ActiveExamModal
  examTypes: ExamType[]
  office: Office
  offices: Office[]
  offsiteInvigilators: Invigilator[]
  invigilators: Invigilator[]
  onClose: () => void
  onSaved: () => Promise<void>
  onSwitchModal: (modal: ActiveExamModal) => void
  permissions: ExamPermissions
}

export default function ExamModals({
  activeModal,
  examTypes,
  office,
  offices,
  offsiteInvigilators,
  invigilators,
  onClose,
  onSaved,
  onSwitchModal,
  permissions,
}: ExamModalsProps) {
  return (
    <>
      {activeModal?.type === 'add' && (
        <AddExamModal
          examTypes={examTypes}
          office={office}
          offices={offices}
          offsiteInvigilators={offsiteInvigilators}
          onClose={onClose}
          onSaved={onSaved}
          setup={activeModal.setup}
        />
      )}
      {activeModal?.type === 'edit' && (
        <EditExamModal
          exam={activeModal.exam}
          examTypes={examTypes}
          onClose={onClose}
          onDelete={() =>
            onSwitchModal({ exam: activeModal.exam, type: 'delete' })
          }
          onSaved={onSaved}
          permissions={permissions}
        />
      )}
      {activeModal?.type === 'group-booking' && (
        <GroupBookingModal
          exam={activeModal.exam}
          invigilators={invigilators}
          offsiteInvigilators={offsiteInvigilators}
          onClose={onClose}
          onSaved={onSaved}
          permissions={permissions}
        />
      )}
      {activeModal?.type === 'return' && (
        <ReturnExamModal
          exam={activeModal.exam}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
      {activeModal?.type === 'upload' && (
        <UploadPesticideExamModal
          exam={activeModal.exam}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
      {activeModal?.type === 'delete' && (
        <DeleteExamModal
          exam={activeModal.exam}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
      {activeModal?.type === 'financial-report' && (
        <FinancialReportModal onClose={onClose} />
      )}
      {activeModal?.type === 'select-invigilator' && (
        <SelectInvigilatorModal
          exam={activeModal.exam}
          invigilators={invigilators}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </>
  )
}
