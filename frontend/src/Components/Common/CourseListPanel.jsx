import { motion } from 'framer-motion'
import { ArrowRight, ChevronRight, Layers3, PlayCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fadeUp, staggerParent } from '../../utils/motion'
import { getCourseLengthShortLabel } from '../../utils/courseDuration'

// A list, not a wall of cards: one line per course is what makes opening the right one
// quick. All three home pages draw their courses through this, so a student, a faculty
// and an admin are never reading three different shapes of the same thing — only the
// badge each role cares about, its accent and where a row leads differ.
const ACCENTS = {
  blue: {
    row: 'hover:bg-blue-50/60 focus-visible:bg-blue-50/60 dark:hover:bg-blue-950/20 dark:focus-visible:bg-blue-950/20',
    title: 'group-hover:text-blue-700 dark:group-hover:text-blue-300',
    chevron: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
    link: 'text-blue-700 hover:border-blue-300 hover:bg-blue-50 dark:text-blue-300 dark:hover:border-blue-700 dark:hover:bg-blue-950/40',
    placeholder: 'bg-blue-50 text-blue-300 dark:bg-blue-950/40 dark:text-blue-800',
  },
  indigo: {
    row: 'hover:bg-indigo-50/60 focus-visible:bg-indigo-50/60 dark:hover:bg-indigo-950/20 dark:focus-visible:bg-indigo-950/20',
    title: 'group-hover:text-indigo-700 dark:group-hover:text-indigo-300',
    chevron: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
    link: 'text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40',
    placeholder: 'bg-indigo-50 text-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-800',
  },
  violet: {
    row: 'hover:bg-violet-50/60 focus-visible:bg-violet-50/60 dark:hover:bg-violet-950/20 dark:focus-visible:bg-violet-950/20',
    title: 'group-hover:text-violet-700 dark:group-hover:text-violet-300',
    chevron: 'group-hover:text-violet-600 dark:group-hover:text-violet-400',
    link: 'text-violet-700 hover:border-violet-300 hover:bg-violet-50 dark:text-violet-300 dark:hover:border-violet-700 dark:hover:bg-violet-950/40',
    placeholder: 'bg-violet-50 text-violet-300 dark:bg-violet-950/40 dark:text-violet-800',
  },
}

const getCount = (value) => {
  const count = Number(value)

  return Number.isFinite(count) && count > 0 ? count : 0
}

const CourseRow = ({ course, accent, href, openInNewTab, chip, onSelect }) => {
  const meta = [course.category, course.level].filter(Boolean).join(' · ')
  const rowClass = `group flex items-center gap-4 px-4 py-3.5 transition focus:outline-none sm:px-5 ${accent.row}`

  const content = (
    <>
      <span className="relative hidden h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 sm:block">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className={`flex h-full w-full items-center justify-center text-lg font-black ${accent.placeholder}`}>
            J
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-slate-950/45 opacity-0 transition group-hover:opacity-100">
          <PlayCircle className="h-6 w-6 text-white" />
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-bold text-slate-900 dark:text-slate-100 ${accent.title}`}>
          {course.title}
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
          {meta || 'Course'}
        </span>
      </span>

      <span className="hidden shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 md:inline-flex">
        <Layers3 className="h-3.5 w-3.5" />
        {getCount(course.chapterCount)} chapters · {getCount(course.videoCount)} videos · {getCourseLengthShortLabel(course)}
      </span>

      {chip ? (
        <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold lg:inline-block ${chip.className}`}>
          {chip.label}
        </span>
      ) : null}

      <ChevronRight className={`h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 ${accent.chevron}`} />
    </>
  )

  // A row with nowhere to go — a student's course whose access has ended — is a button,
  // not a dimmed link: the page decides what the click says, and nothing is offered to the
  // middle mouse button that would only land on a refusal.
  if (!href) {
    return (
      <button type="button" onClick={() => onSelect?.(course)} className={`w-full text-left ${rowClass}`}>
        {content}
      </button>
    )
  }

  // A student's row opens the player in its own tab, the way the catalogue already
  // does; a faculty's row stays inside the app.
  return openInNewTab ? (
    <a href={href} target="_blank" rel="noreferrer" className={rowClass}>{content}</a>
  ) : (
    <Link to={href} className={rowClass}>{content}</Link>
  )
}

const CourseListPanel = ({
  title,
  subtitle,
  courses,
  loading,
  accent = 'blue',
  limit = 8,
  browseHref,
  browseLabel = 'Search and filter',
  getHref,
  getChip,
  onSelect,
  openInNewTab = false,
  emptyHint = 'Courses appear here as soon as they are published.',
}) => {
  const accentStyles = ACCENTS[accent] || ACCENTS.blue
  const visibleCourses = courses.slice(0, limit)

  return (
    <motion.section
      variants={fadeUp}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>

        <Link
          to={browseHref}
          className={`group inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold transition dark:border-slate-700 dark:bg-slate-900 ${accentStyles.link}`}
        >
          {courses.length > limit ? `View all ${courses.length}` : browseLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </header>

      {loading ? (
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {[0, 1, 2, 3].map((placeholder) => (
            <div key={placeholder} className="flex items-center gap-4 px-5 py-3.5">
              <span className="hidden h-12 w-20 shrink-0 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800 sm:block" />
              <span className="h-4 flex-1 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : visibleCourses.length ? (
        <motion.div
          variants={staggerParent(0.05, 0.06)}
          className="divide-y divide-slate-200 dark:divide-slate-800"
        >
          {visibleCourses.map((course) => (
            <motion.div key={course._id} variants={fadeUp}>
              <CourseRow
                course={course}
                accent={accentStyles}
                href={getHref(course)}
                openInNewTab={openInNewTab}
                chip={getChip?.(course)}
                onSelect={onSelect}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="px-6 py-12 text-center">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No courses yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
            {emptyHint}
          </p>
        </div>
      )}
    </motion.section>
  )
}

export default CourseListPanel
