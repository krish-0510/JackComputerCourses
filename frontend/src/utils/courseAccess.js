// How long a course stays open is read the same way wherever a course is shown: the
// catalogue card and the home list both ask this, so one of them can never start
// naming a different date than the other.
export const formatAccessDate = (value) => {
  const dateValue = String(value || '').slice(0, 10)
  const [year, month, day] = dateValue.split('-').map(Number)

  if (!year || !month || !day) {
    return ''
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

// Custom expiry is typed rather than picked, so the shape it is typed in is fixed here
// instead of being left to the browser's locale — a native date field shows DD/MM/YYYY to
// one admin and MM/DD/YYYY to another, and the two would be reading the same box
// differently. Both halves are required together: a date without a time has no moment to
// close at, and a time without a date has no day to close on.
const EXPIRY_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
const EXPIRY_TIME_PATTERN = /^(\d{1,2}):(\d{2})$/

export const EXPIRY_DATE_FORMAT = 'DD/MM/YYYY'
export const EXPIRY_TIME_FORMAT = 'HH:MM'

const padNumber = (value) => String(value).padStart(2, '0')

// Read as a wall clock, not as UTC: the admin types the moment the course should close
// where they are, and it is stored as that exact instant so a learner in another
// timezone loses access at the same moment rather than on a different day.
export const parseCustomExpiryInput = (dateInput, timeInput) => {
  const dateMatch = EXPIRY_DATE_PATTERN.exec(String(dateInput || '').trim())

  if (!dateMatch) {
    return { error: `Enter the expiry date as ${EXPIRY_DATE_FORMAT}.` }
  }

  const timeMatch = EXPIRY_TIME_PATTERN.exec(String(timeInput || '').trim())

  if (!timeMatch) {
    return { error: `Enter the expiry time as ${EXPIRY_TIME_FORMAT} in 24-hour form.` }
  }

  const [, day, month, year] = dateMatch.map(Number)
  const [, hours, minutes] = timeMatch.map(Number)

  if (hours > 23 || minutes > 59) {
    return { error: `Enter the expiry time as ${EXPIRY_TIME_FORMAT} in 24-hour form.` }
  }

  const expiresAt = new Date(year, month - 1, day, hours, minutes, 0, 0)

  // A day that does not exist rolls forward into one that does, so the parts are read
  // back to catch 31/02 rather than silently closing the course on the 3rd of March.
  if (
    expiresAt.getDate() !== day
    || expiresAt.getMonth() !== month - 1
    || expiresAt.getFullYear() !== year
  ) {
    return { error: 'That date does not exist. Check the day and month.' }
  }

  return { expiresAt }
}

export const formatCustomExpiryInput = (value) => {
  const date = value ? new Date(value) : null

  if (!date || Number.isNaN(date.getTime())) {
    return { date: '', time: '' }
  }

  return {
    date: `${padNumber(date.getDate())}/${padNumber(date.getMonth() + 1)}/${date.getFullYear()}`,
    time: `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`,
  }
}

// A deadline the site worked out lands on midnight, so it is a date and nothing more. One
// an admin set lands on a time they chose, and dropping that time would let a course that
// closes at 18:00 read as though it had the whole day left.
export const formatAccessDateTime = (value) => {
  const date = value ? new Date(value) : null

  if (!date || Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

// The one question every surface asks about when a window closes, so the catalogue card,
// the player, the admin table and the enrolment list can never disagree about the same
// grant — and a hand-set expiry keeps its time of day wherever it is shown.
export const formatAccessEnd = (access) => (
  access?.accessType === 'custom'
    ? formatAccessDateTime(access.accessEndsAt)
    : formatAccessDate(access?.accessEndsOn || access?.accessEndsAt)
)

export const getCourseAccessDisplay = (course) => {
  if (course.isOpenToAll) {
    return {
      label: 'Access',
      value: 'Open to all',
    }
  }

  return {
    label: 'Access Ends',
    value: formatAccessEnd(course) || 'N/A',
  }
}

// A deadline is only worth raising once it is close enough to act on, so a window is
// graded by the days left on it rather than being read as a bare date everywhere. A month
// out is a heads-up, two weeks is enough notice to arrange a renewal, and the last three
// days are the ones worth interrupting someone over — each step louder than the last so
// the same course escalates rather than shouting at one volume for a month. Every surface
// asks this, so the card, the home list and the player can never disagree about how
// urgent the same course is.
const EXPIRY_NOTICE_DAYS = 30
const EXPIRY_WARNING_DAYS = 14
const EXPIRY_CRITICAL_DAYS = 3

const EXPIRY_LEVEL_STYLES = {
  expired: {
    chipClassName: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    noticeClassName: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200',
  },
  critical: {
    chipClassName: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    noticeClassName: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200',
  },
  warning: {
    chipClassName: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    noticeClassName: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200',
  },
  notice: {
    chipClassName: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    noticeClassName: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200',
  },
}

const getExpiryLevel = (daysRemaining) => {
  if (daysRemaining <= EXPIRY_CRITICAL_DAYS) {
    return 'critical'
  }

  return daysRemaining <= EXPIRY_WARNING_DAYS ? 'warning' : 'notice'
}

// The count includes the day being read, so one day left is the day you are on. The chip
// has a row to fit into and the notice is read as a sentence, so each gets its own wording
// off the same number rather than one being bent into the other's shape.
const getRemainingLabel = (daysRemaining) => {
  if (daysRemaining <= 1) {
    return 'Ends today'
  }

  if (daysRemaining === 2) {
    return 'Ends tomorrow'
  }

  return `${daysRemaining} days left`
}

const getRemainingTitle = (daysRemaining) => {
  if (daysRemaining <= 1) {
    return 'Your access ends today'
  }

  if (daysRemaining === 2) {
    return 'Your access ends tomorrow'
  }

  return `Your access ends in ${daysRemaining} days`
}

// A closed window is the one thing that changes what a course *is* on the student's shelf
// rather than only what it says: it keeps its card and opens nothing. Every surface that
// has to tell an ended course from a running one asks here, so a card, a row and a sort
// order can never disagree about which is which.
export const isCourseAccessEnded = (course) => (
  Boolean(course?.isAccessExpired) && !course?.isOpenToAll
)

export const getCourseExpiryWarning = (course) => {
  if (!course || course.isOpenToAll) {
    return null
  }

  const endDate = formatAccessEnd(course)

  if (isCourseAccessEnded(course)) {
    return {
      level: 'expired',
      daysRemaining: 0,
      chipLabel: 'Access ended',
      title: 'Your access to this course has ended',
      detail: endDate ? `Access ended on ${endDate}.` : '',
      ...EXPIRY_LEVEL_STYLES.expired,
    }
  }

  const daysRemaining = Number(course.accessDaysRemaining)

  if (!Number.isFinite(daysRemaining) || daysRemaining > EXPIRY_NOTICE_DAYS) {
    return null
  }

  const level = getExpiryLevel(daysRemaining)

  return {
    level,
    daysRemaining,
    chipLabel: getRemainingLabel(daysRemaining),
    title: getRemainingTitle(daysRemaining),
    detail: endDate ? `Access ends on ${endDate}.` : '',
    ...EXPIRY_LEVEL_STYLES[level],
  }
}

// The shelf is summed up above itself rather than left to be pieced together card by card,
// and the two kinds of deadline are summed up apart because they ask for different things:
// a course that has ended needs the admin, one that is about to end needs nothing but the
// date. Each line is written off the same warning the cards below it carry, so the banner
// can never name an urgency the cards disagree with.
const EXPIRY_SUMMARY_GROUPS = [
  {
    isMember: (warning) => warning.level === 'expired',
    getManyTitle: (count) => `${count} of your courses have ended`,
    getManyDetail: () => '',
    ask: 'Click a course to ask the admin for more time on it.',
  },
  {
    isMember: (warning) => warning.level !== 'expired',
    getManyTitle: (count) => `${count} of your courses are ending soon`,
    getManyDetail: (mostUrgent) => (
      `${mostUrgent.course.title} is the first to close (${mostUrgent.warning.chipLabel.toLowerCase()}).`
    ),
    ask: '',
  },
]

// One course is named outright; several are counted, and led by the one closing first.
const summarizeExpiryGroup = (entries, { getManyTitle, getManyDetail, ask }) => {
  if (!entries.length) {
    return null
  }

  const [mostUrgent] = entries
  const isOnlyOne = entries.length === 1

  return {
    warning: mostUrgent.warning,
    title: isOnlyOne
      ? `${mostUrgent.course.title}: ${mostUrgent.warning.chipLabel.toLowerCase()}`
      : getManyTitle(entries.length),
    detail: [isOnlyOne ? mostUrgent.warning.detail : getManyDetail(mostUrgent), ask]
      .filter(Boolean)
      .join(' '),
  }
}

// Read off every course rather than a filtered grid: a deadline does not stop mattering
// because a search is narrowing the page.
export const getCourseExpirySummaries = (courses) => {
  const entries = (courses || [])
    .map((course) => ({ course, warning: getCourseExpiryWarning(course) }))
    .filter((entry) => entry.warning)
    .sort((first, second) => first.warning.daysRemaining - second.warning.daysRemaining)

  return EXPIRY_SUMMARY_GROUPS
    .map((group) => summarizeExpiryGroup(entries.filter((entry) => group.isMember(entry.warning)), group))
    .filter(Boolean)
}
