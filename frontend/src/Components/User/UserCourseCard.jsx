import { AlertTriangle, Lock } from 'lucide-react'
import CourseCardFooter from '../Common/CourseCardFooter'
import CourseMetaList from '../Common/CourseMetaList'
import CourseThumbnail from '../Common/CourseThumbnail'
import { accessEndsMeta, chapterMeta, videoMeta } from '../../utils/courseMeta'
import { getCourseExpiryWarning, isCourseAccessEnded } from '../../utils/courseAccess'

const UserCourseCard = ({ course, playerUrl, dataTour, onAccessEnded }) => {
  const description = course.shortDescription || course.description || 'Course details are not available.'
  const courseTags = [course.category, course.level, course.language].filter(Boolean)
  const expiryWarning = getCourseExpiryWarning(course)
  // A course whose window has closed keeps its card so the student can see they were on it,
  // but the card no longer leads anywhere: the click is answered by the prompt instead.
  const accessEnded = isCourseAccessEnded(course)

  const cardClassName = `group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none ${
    accessEnded
      ? 'hover:border-rose-300 dark:hover:border-rose-800 focus-visible:ring-4 focus-visible:ring-rose-100 dark:focus-visible:ring-rose-900/40'
      : 'hover:border-blue-300 dark:hover:border-blue-700 focus-visible:ring-4 focus-visible:ring-blue-100 dark:focus-visible:ring-blue-900/40'
  }`

  const cardContent = (
    <>
      <CourseThumbnail course={course} fallbackClassName="from-blue-500 to-blue-700">
        {/* The still is what says "closed" before a word is read, so the badge underneath
            is confirming it rather than breaking the news. */}
        {accessEnded ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/55">
            <Lock className="h-7 w-7 text-white" aria-hidden="true" />
          </span>
        ) : null}
      </CourseThumbnail>

      <div className="flex flex-1 flex-col p-5">
        <h2 className={`line-clamp-2 text-base font-bold text-slate-900 dark:text-slate-100 transition ${
          accessEnded
            ? 'group-hover:text-rose-700 dark:group-hover:text-rose-300'
            : 'group-hover:text-blue-700 dark:group-hover:text-blue-300'
        }`}
        >
          {course.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </p>

        {courseTags.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {courseTags.map((tag, index) => (
              <span key={`${tag}-${index}`} className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {/* A student has already paid to be here, so the deadline is what they need off a
            card — it closes on its own line rather than queueing behind the chapter count.
            A date only says when access ends; the badge is what says it is nearly here, so
            a course about to close is spotted without reading every card's date. */}
        <div className="mt-auto pt-4">
          {expiryWarning ? (
            <span className={`mb-3 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${expiryWarning.chipClassName}`}>
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              {expiryWarning.chipLabel}
            </span>
          ) : null}
          <CourseMetaList items={[chapterMeta(course), videoMeta(course)]} />
          <CourseCardFooter primary={accessEndsMeta(course)} />
        </div>
      </div>
    </>
  )

  // A button rather than a dimmed link: there is nothing behind an ended course to open in
  // a new tab, so it must not offer one to the middle mouse button either.
  return accessEnded ? (
    <button type="button" onClick={() => onAccessEnded?.(course)} data-tour={dataTour} className={cardClassName}>
      {cardContent}
    </button>
  ) : (
    <a href={playerUrl} target="_blank" rel="noreferrer" data-tour={dataTour} className={cardClassName}>
      {cardContent}
    </a>
  )
}

export default UserCourseCard
