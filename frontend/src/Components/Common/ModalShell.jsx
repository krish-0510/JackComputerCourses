import { AlertCircle, X } from 'lucide-react'
import { useId } from 'react'
import { useDialogBehaviour } from '../../utils/modal'

// Every dialog in the app is the same object: a scrim, a panel held in the middle of the
// screen, a header that says what it is and offers one way out, a body that takes the
// scrollbar when there is more of it than fits, and a row of buttons along the bottom.
// The chrome lives here once, so a new dialog is a body and a footer rather than another
// copy of it — and so Escape, the backdrop and the page frozen behind all behave the same
// wherever one is opened.
const PANEL_WIDTHS = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
}

const ModalShell = ({
  title,
  subtitle,
  icon: Icon,
  size = 'md',
  busy = false,
  error = '',
  footer,
  bodyClassName = '',
  closeLabel = 'Close dialog',
  onClose,
  onSubmit,
  children,
}) => {
  const headingId = useId()
  // A dialog that carries a form is the form, so Enter in any field above does the same
  // thing as the submit button in the footer below.
  const Panel = onSubmit ? 'form' : 'div'

  useDialogBehaviour({ onClose, busy })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={closeLabel}
        disabled={busy}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm disabled:cursor-not-allowed"
        onClick={onClose}
      />

      <Panel
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onSubmit={onSubmit}
        className={`relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 ${PANEL_WIDTHS[size] || PANEL_WIDTHS.md}`}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          {Icon ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:ring-indigo-900/50">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}

          <div className="min-w-0 flex-1">
            <h2 id={headingId} className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={closeLabel}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100 dark:disabled:text-slate-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto px-6 py-6 ${bodyClassName}`}>
          {children}
        </div>

        {/* Whatever went wrong sits against the footer rather than at the top of a body
            that may be scrolled away from it. */}
        {error ? (
          <p className="flex shrink-0 items-center gap-2 border-t border-red-200 bg-red-50 px-6 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        {footer ? (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
            {footer}
          </div>
        ) : null}
      </Panel>
    </div>
  )
}

export default ModalShell
