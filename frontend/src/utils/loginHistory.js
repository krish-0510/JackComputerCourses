const pad = (value) => String(value).padStart(2, '0')

const toDate = (value) => {
  if (!value) {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// 1 Jan 2026
export const formatHistoryDate = (value) => {
  const date = toDate(value)

  if (!date) {
    return '—'
  }

  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

// HH:MM:SS
export const formatHistoryTime = (value) => {
  const date = toDate(value)

  if (!date) {
    return '—'
  }

  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// A session that was ended for the account rather than by it says which it was, so a
// student asking why they were signed out is answered by the history itself.
const LOGOUT_LABELS = {
  replaced: 'Signed out (new login)',
  blocked: 'Signed out (blocked)',
}

export const getLogoutLabel = (entry) => {
  if (!entry?.logoutAt) {
    return 'Still signed in'
  }

  return LOGOUT_LABELS[entry.logoutReason] || 'Signed out'
}
