import type { Exam, Invigilator } from '@/api/schemas'

import { readyDetails, stillRequires } from './exam-utils'

export default function ExamDetails({
  exam,
  invigilators,
}: {
  exam: Exam
  invigilators: Invigilator[]
}) {
  const requirements = stillRequires(exam)
  const details = readyDetails(exam, invigilators)

  return (
    <div className="flex flex-wrap gap-x-8 gap-y-2">
      {requirements.length > 0 && (
        <div>
          <strong>Still Requires:</strong>
          <ul className="my-1 pl-5">
            {requirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <strong>Details:</strong>
        {Object.keys(details).length === 0 ? (
          <span className="ml-2">-</span>
        ) : (
          <dl className="my-1 grid grid-cols-[max-content_1fr] gap-x-2">
            {Object.entries(details).map(([key, value]) => (
              <div className="contents" key={key}>
                <dt className="font-bold">{key}:</dt>
                <dd className="m-0">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  )
}
