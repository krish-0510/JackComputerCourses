import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  Bug,
  CalendarCheck,
  CornerDownLeft,
  FileText,
  Globe,
  GraduationCap,
  Search,
  Star,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { COMMAND_SHORTCUT } from '../../utils/shortcut'

// An admin runs the whole site from eight pages and a catalogue that keeps growing, so
// the fastest way to any of them is typing its name. The palette is the one control on
// this dashboard that reaches past the page it is on: everywhere else the admin clicks
// through, here the keyboard alone gets there.
const COURSE_RESULT_LIMIT = 6

const DESTINATIONS = [
  { to: '/admin/users', label: 'Users', hint: 'Accounts, password requests, attendance', Icon: Users, badgeKey: 'passwordRequests' },
  { to: '/admin/faculties', label: 'Faculties', hint: 'Faculty accounts and login history', Icon: GraduationCap },
  { to: '/admin/attendance', label: 'Attendance', hint: 'Mark, correct and print the register', Icon: CalendarCheck },
  { to: '/admin/courses', label: 'Courses', hint: 'Catalogue, chapters and access', Icon: BookOpen },
  { to: '/admin/contents', label: 'Content', hint: 'What the website offers, and what it showcases', Icon: Globe },
  { to: '/admin/topic-notes', label: 'Notes', hint: 'Topic notes pulled from Drive', Icon: FileText },
  { to: '/admin/bugs', label: 'Bugs', hint: 'Open reports and decided history', Icon: Bug, badgeKey: 'bugs' },
  { to: '/admin/reviews', label: 'Reviews', hint: 'Student reviews and the landing page showcase', Icon: Star },
]

const matches = (query, ...fields) => (
  !query || fields.filter(Boolean).some((field) => field.toLowerCase().includes(query))
)

// Both groups are flattened into one list because the keyboard walks results, not
// sections: what the eye reads as two headings is one run of options to the arrows.
const buildResults = (query, courses, badges) => {
  const search = query.trim().toLowerCase()

  const destinations = DESTINATIONS
    .filter((destination) => matches(search, destination.label, destination.hint))
    .map((destination) => ({
      key: destination.to,
      group: 'Go to',
      label: destination.label,
      hint: destination.hint,
      Icon: destination.Icon,
      to: destination.to,
      badge: destination.badgeKey ? badges[destination.badgeKey] : 0,
    }))

  // With no query this is the newest handful, which is the order the API already sorted
  // the catalogue into and almost always the course an admin came back to edit.
  const courseResults = courses
    .filter((course) => matches(search, course.title, course.category, course.level))
    .slice(0, COURSE_RESULT_LIMIT)
    .map((course) => ({
      key: course._id,
      group: 'Courses',
      label: course.title,
      hint: [course.category, course.level, course.isPublished ? 'Published' : 'Draft']
        .filter(Boolean)
        .join(' · '),
      Icon: BookOpen,
      to: `/admin/courses/${course._id}`,
      badge: 0,
    }))

  return [...destinations, ...courseResults]
}

// The dialog is mounted only while the palette is open, so a fresh query and a
// selection back at the top come with the mount instead of being reset on the way in.
const CommandDialog = ({ courses, badges, onClose }) => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef(null)

  const results = useMemo(() => buildResults(query, courses, badges), [badges, courses, query])

  // The page behind stays where it was rather than scrolling under the overlay.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, results])

  const openResult = (result) => {
    onClose()
    navigate(result.to)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      onClose()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()

      if (results[activeIndex]) {
        openResult(results[activeIndex])
      }

      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return
    }

    event.preventDefault()

    if (!results.length) {
      return
    }

    // The list wraps at both ends, so holding one arrow reaches everything instead of
    // stopping dead at an edge.
    const step = event.key === 'ArrowDown' ? 1 : results.length - 1
    setActiveIndex((current) => (current + step) % results.length)
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Admin command palette"
      initial={{ opacity: 0, y: -14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      onMouseDown={(event) => event.stopPropagation()}
      className="mt-[8vh] w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="text"
          value={query}
          autoFocus
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Jump to a page or a course..."
          aria-label="Search admin pages and courses"
          aria-controls="admin-command-results"
          aria-activedescendant={results[activeIndex] ? `admin-command-${activeIndex}` : undefined}
          className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400 dark:text-slate-100"
        />
        <span className="hidden shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:border-slate-700 sm:inline">
          Esc
        </span>
      </div>

      <div
        ref={listRef}
        id="admin-command-results"
        role="listbox"
        aria-label="Results"
        className="max-h-80 overflow-y-auto p-2"
      >
        {results.length ? results.map((result, index) => {
          const isFirstOfGroup = result.group !== results[index - 1]?.group
          const isActive = index === activeIndex

          return (
            <div key={result.key}>
              {isFirstOfGroup ? (
                <p className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {result.group}
                </p>
              ) : null}

              <button
                type="button"
                role="option"
                id={`admin-command-${index}`}
                data-index={index}
                aria-selected={isActive}
                onMouseMove={() => setActiveIndex(index)}
                onClick={() => openResult(result)}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${
                  isActive
                    ? 'bg-violet-50 dark:bg-violet-950/40'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
                >
                  <result.Icon className="h-4 w-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                    {result.label}
                  </span>
                  <span className="block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {result.hint}
                  </span>
                </span>

                {result.badge ? (
                  <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-black text-white">
                    {result.badge > 99 ? '99+' : result.badge}
                  </span>
                ) : null}

                {isActive ? (
                  <CornerDownLeft className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
                ) : null}
              </button>
            </div>
          )
        }) : (
          <p className="px-3 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            Nothing here matches &ldquo;{query.trim()}&rdquo;.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
        <span>↑ ↓ to move</span>
        <span>↵ to open</span>
        <span>Esc to close</span>
        <span className="ml-auto">{COMMAND_SHORTCUT}</span>
      </div>
    </motion.div>
  )
}

const AdminCommandPalette = ({ open, onOpenChange, courses, badges }) => {
  // The shortcut is bound for as long as the dashboard is mounted, so it answers from
  // anywhere on the page, and it toggles rather than opens: the keys that reached the
  // palette put it away again.
  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onOpenChange((isOpen) => !isOpen)
      }
    }

    window.addEventListener('keydown', handleShortcut)

    return () => window.removeEventListener('keydown', handleShortcut)
  }, [onOpenChange])

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={() => onOpenChange(false)}
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:p-6"
        >
          <CommandDialog
            courses={courses}
            badges={badges}
            onClose={() => onOpenChange(false)}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

export default AdminCommandPalette
