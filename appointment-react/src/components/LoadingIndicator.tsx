export default function LoadingIndicator({
  label = 'Loading',
}: {
  label?: string
}) {
  return (
    <div className="flex items-center justify-center gap-3 p-8" role="status">
      <span
        aria-hidden="true"
        className="border-bc-border border-t-bc-button-primary size-8 animate-spin rounded-full border-4 motion-reduce:animate-none"
      />
      <span>{label}</span>
    </div>
  )
}
