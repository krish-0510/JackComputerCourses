import { CalendarClock } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  EXPIRY_DATE_FORMAT,
  EXPIRY_TIME_FORMAT,
  formatAccessDate,
  formatCustomExpiryInput,
  parseCustomExpiryInput,
} from '../../utils/courseAccess'

const INPUT_CLASS = 'mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-indigo-900/40 dark:disabled:bg-slate-800'

// One person's own end date for a course, which stands in for the duration everyone else
// on it runs on. It is optional by design: an empty form is not an error but the way the
// override is taken off again, so the two buttons below say plainly which of the two
// clocks the person will be on when the dialog closes.
const AdminCustomExpiryModal = ({ user, courseTitle, busy, onSubmit, onClose }) => {
  const hasCustomExpiry = user.accessType === 'custom'
  // Only a window the admin set is worth putting back in the boxes. A window the course
  // duration worked out would read as an override that was never made, and saving the
  // form unchanged would freeze a moving deadline into a fixed one. The dialog is mounted
  // per grant, so the form it opens with is the grant it opens on.
  const [expiryInput] = useState(() => (
    formatCustomExpiryInput(hasCustomExpiry ? user.accessEndsAt : null)
  ))
  const [dateInput, setDateInput] = useState(expiryInput.date)
  const [timeInput, setTimeInput] = useState(expiryInput.time)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSubmit = (event) => {
    event.preventDefault()

    const { expiresAt, error: parseError } = parseCustomExpiryInput(dateInput, timeInput)

    if (parseError) {
      setError(parseError)
      return
    }

    setError('')
    onSubmit(expiresAt.toISOString())
  }

  const userName = String(user.name || '').trim()
  // The date the course itself would land on, so the admin can see what they are
  // overriding — and what the person goes back to if the override is cleared.
  const durationEndDate = hasCustomExpiry ? '' : formatAccessDate(user.accessEndsOn)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close custom expiry"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-expiry-title"
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-start gap-3 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:ring-indigo-900/50">
            <CalendarClock className="h-5 w-5" />
          </span>

          <div className="min-w-0">
            <h2 id="custom-expiry-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Custom Expiry
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
              {userName || 'Unnamed user'} · {user.phone}
            </p>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            Set when
            {' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">{courseTitle || 'this course'}</span>
            {' '}
            expires for this user only.
            {durationEndDate
              ? ` Leave it unset to keep the course duration, which ends ${durationEndDate}.`
              : ' Leave it unset to keep the course duration.'}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="custom-expiry-date" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Date
              </label>
              <input
                id="custom-expiry-date"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={dateInput}
                onChange={(event) => setDateInput(event.target.value)}
                disabled={busy}
                placeholder={EXPIRY_DATE_FORMAT}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="custom-expiry-time" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Time
              </label>
              <input
                id="custom-expiry-time"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={timeInput}
                onChange={(event) => setTimeInput(event.target.value)}
                disabled={busy}
                placeholder={EXPIRY_TIME_FORMAT}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            {EXPIRY_DATE_FORMAT} and {EXPIRY_TIME_FORMAT} in 24-hour form, in your own timezone.
          </p>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-end dark:border-slate-800 dark:bg-slate-950/50">
          {hasCustomExpiry ? (
            <button
              type="button"
              onClick={() => onSubmit(null)}
              disabled={busy}
              className="mr-auto rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:text-red-300 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:border-red-700 dark:hover:bg-red-950/60 dark:disabled:text-red-500"
            >
              Clear Custom Expiry
            </button>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:disabled:text-slate-600"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {busy ? 'Saving...' : 'Save Expiry'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AdminCustomExpiryModal
