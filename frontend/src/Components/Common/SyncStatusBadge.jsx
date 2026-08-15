// What a sync status looks like is decided here once, so a chapter that reads "Pending"
// on the panel that opens it cannot read as a green dot on the list beside it.
const STATUS_STYLES = {
  synced: {
    label: 'Synced',
    className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
    dotClassName: 'bg-emerald-500',
  },
  failed: {
    label: 'Sync Failed',
    className: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
    dotClassName: 'bg-amber-500',
  },
  pending: {
    label: 'Pending',
    className: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    dotClassName: 'bg-slate-400 dark:bg-slate-600',
  },
}

// A dense list has no room for the word, so it carries the same status as a dot that
// names itself to a pointer and to a screen reader.
const SyncStatusBadge = ({ status, variant = 'badge' }) => {
  const { label, className, dotClassName } = STATUS_STYLES[status] || STATUS_STYLES.pending

  if (variant === 'dot') {
    return (
      <span
        title={label}
        aria-label={label}
        role="img"
        className={`h-2 w-2 shrink-0 rounded-full ${dotClassName}`}
      />
    )
  }

  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}

export default SyncStatusBadge
