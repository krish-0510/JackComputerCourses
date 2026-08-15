import { CalendarClock, CalendarDays, Clock3, Layers3, PlayCircle, Tag, Users } from 'lucide-react'
import { getCourseAccessDisplay, isCourseAccessEnded } from './courseAccess'
import { getCourseLengthLabel } from './courseDuration'

const getCount = (value) => {
  const count = Number(value)

  return Number.isFinite(count) && count > 0 ? count : 0
}

const pluralize = (value, unit) => `${value} ${unit}${value === 1 ? '' : 's'}`

// The admin, faculty and student cards each show their own subset of these, but a course
// that reads "3 videos" on one of them should never read "3" or "Videos: 3" on another, so
// the wording and the icon for a given stat are decided once here rather than per card.
// Values are worded to stand on their own because the cards no longer caption them.
export const chapterMeta = (course) => ({
  key: 'chapters',
  icon: Layers3,
  label: 'Chapters',
  value: pluralize(getCount(course.chapterCount), 'chapter'),
})

export const videoMeta = (course) => ({
  key: 'videos',
  icon: PlayCircle,
  label: 'Videos',
  value: pluralize(getCount(course.videoCount), 'video'),
})

// How much video a course holds, worded rather than clocked — the cards put this on the
// thumbnail, and the admin header reads it beside the counts it belongs with.
export const lengthMeta = (course) => ({
  key: 'length',
  icon: Clock3,
  label: 'Total length',
  value: getCourseLengthLabel(course),
})

// Nothing in the app puts a currency on a price yet, so a paid course still shows the bare
// figure it always has and leans on the tag icon to say what the number is.
export const priceMeta = (course) => {
  const price = Number(course.price)

  if (!Number.isFinite(price)) {
    return { key: 'price', icon: Tag, label: 'Price', value: 'Price not set' }
  }

  return {
    key: 'price',
    icon: Tag,
    label: 'Price',
    value: price === 0 ? 'Free' : String(price),
  }
}

// An open course has nothing to expire, so the months an enrolment lasts only mean anything
// on a restricted one.
export const accessLengthMeta = (course) => ({
  key: 'accessLength',
  icon: CalendarClock,
  label: 'Access length',
  value: course.isOpenToAll || !course.duration ? 'Unlimited access' : `${course.duration} mo access`,
})

export const accessCountMeta = (course) => ({
  key: 'accessCount',
  icon: Users,
  label: 'Learners with access',
  value: course.isOpenToAll ? 'Open to all' : pluralize(getCount(course.accessUserCount), 'learner'),
})

// A student is told when their own access runs out rather than how the course is shared,
// so this is the one stat whose wording changes with the viewer — and once the date is
// behind them it is read as history rather than as a plan, so it is worded that way.
export const accessEndsMeta = (course) => {
  const { value } = getCourseAccessDisplay(course)

  if (course.isOpenToAll) {
    return { key: 'access', icon: Users, label: 'Access', value: 'Open to all' }
  }

  const hasEnded = isCourseAccessEnded(course)

  return {
    key: 'access',
    icon: CalendarDays,
    label: hasEnded ? 'Access ended' : 'Access ends',
    value: value === 'N/A' ? 'No end date' : `${hasEnded ? 'Ended' : 'Ends'} ${value}`,
  }
}
