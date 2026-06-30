import { CircleAlert } from 'lucide-react'

export default function InlineError({ children }: { children: string }) {
  return (
    <p className="text-bc-danger flex items-center gap-2" role="alert">
      <CircleAlert aria-hidden="true" className="size-4" />
      {children}
    </p>
  )
}
