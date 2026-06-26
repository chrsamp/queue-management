import type { ReactNode } from 'react'

import AlertBanner from '@/components/AlertBanner'
import Button from '@/components/Button'
import { DialogTitle } from '@/components/Dialog'

export function ModalHeader({ title }: { title: string }) {
  return <DialogTitle className="text-bc-h4 m-0 font-bold">{title}</DialogTitle>
}

export function ModalFooter({
  isSaving,
  onSubmit,
  submitDisabled = false,
  submitText = 'Submit',
}: {
  isSaving: boolean
  onSubmit: () => void
  submitDisabled?: boolean
  submitText?: string
}) {
  return (
    <div className="flex justify-end gap-3">
      <Button disabled={isSaving || submitDisabled} onClick={onSubmit}>
        {submitText}
      </Button>
    </div>
  )
}

export function Alert({ message }: { message: string }) {
  return (
    <AlertBanner
      className="sm:col-span-2"
      isCloseable={false}
      role="alert"
      size="small"
      variant="danger"
    >
      {message}
    </AlertBanner>
  )
}

export function TextField({
  className,
  disabled = false,
  label,
  maxLength,
  onChange,
  type = 'text',
  value,
}: {
  className?: string
  disabled?: boolean
  label: string
  maxLength?: number
  onChange: (value: string) => void
  type?: string
  value: number | string
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className="font-bold">{label}</span>
      <input
        className="border-bc-border rounded-sm border px-3 py-2"
        disabled={disabled}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  )
}

export function TextAreaField({
  className,
  label,
  maxLength,
  onChange,
  value,
}: {
  className?: string
  label: string
  maxLength?: number
  onChange: (value: string) => void
  value: number | string
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className="font-bold">{label}</span>
      <textarea
        className="border-bc-border min-h-20 rounded-sm border px-3 py-2"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  )
}

export function SelectField({
  children,
  className,
  label,
  onChange,
  value,
}: {
  children: ReactNode
  className?: string
  label: string
  onChange: (value: string) => void
  value: number | string
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className="font-bold">{label}</span>
      <select
        className="border-bc-border rounded-sm border px-3 py-2"
        onChange={(event) => onChange(event.target.value)}
        value={String(value)}
      >
        {children}
      </select>
    </label>
  )
}

export function ReadOnlyField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <span className="font-bold">{label}</span>
      <div className="border-bc-border bg-bc-light-gray rounded-sm border px-3 py-2">
        {value}
      </div>
    </div>
  )
}
