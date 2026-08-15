import { AlertCircle, CheckCircle2, X } from 'lucide-react'

// Page-level outcomes only: anything raised while a dialog is open belongs beside the
// fields that caused it, not behind the backdrop.
const PageBanner = ({ tone, message, onDismiss, className = '' }) => {
  const isError = tone === 'error'
  const Icon = isError ? AlertCircle : CheckCircle2

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-medium ${
        isError
          ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
      } ${className}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss message"
        className="-my-1 -mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export default PageBanner
