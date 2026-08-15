import { motion } from 'framer-motion'
import {
  BookOpen,
  Bug,
  CalendarCheck,
  CircleCheck,
  FileText,
  Globe,
  GraduationCap,
  Phone,
  Search,
  ShieldCheck,
  Star,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fadeUp, staggerParent } from '../../utils/motion'
import { COMMAND_SHORTCUT } from '../../utils/shortcut'

// The student and the faculty land on a white card that greets them by name. An admin
// is not a person on this page but the operator of the site, so the dashboard opens on
// a lit console instead: one dark deck, dark in either theme, carrying who is signed
// in, what time the site is keeping, and the way into every part of it.
const DECK_LINKS = [
  { to: '/admin/users', label: 'Users', Icon: Users, badgeKey: 'passwordRequests' },
  { to: '/admin/faculties', label: 'Faculties', Icon: GraduationCap },
  { to: '/admin/attendance', label: 'Attendance', Icon: CalendarCheck },
  { to: '/admin/courses', label: 'Courses', Icon: BookOpen },
  { to: '/admin/contents', label: 'Content', Icon: Globe },
  { to: '/admin/topic-notes', label: 'Notes', Icon: FileText },
  { to: '/admin/bugs', label: 'Bugs', Icon: Bug, badgeKey: 'bugs' },
  { to: '/admin/reviews', label: 'Reviews', Icon: Star },
]

const clockFormat = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const AdminHomeConsole = ({ phone, decisions, badges, children, loading, onOpenCommands }) => {
  const [now, setNow] = useState(() => new Date())

  // Everything decided from this console is dated — a register, a password reset, a
  // bug that has been waiting since morning — so the deck keeps the clock the site is
  // actually running on rather than the one the page was loaded at.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <motion.section
      variants={fadeUp}
      data-tour="admin-console"
      className="relative isolate overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-xl shadow-slate-900/10"
    >
      {/* Ruled paper, not decoration: the grid is what makes the deck read as an
          instrument panel rather than as one more card with a gradient on it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.13)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.13)_1px,transparent_1px)] bg-size-[44px_44px] mask-[radial-gradient(120%_100%_at_50%_0%,black,transparent)]"
      />

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-32 h-88 w-88 rounded-full bg-linear-to-br from-violet-500/30 via-fuchsia-500/20 to-transparent blur-3xl"
        animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.12, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative flex flex-col gap-7 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-5">
            <motion.div
              className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 via-fuchsia-500 to-rose-500 text-white shadow-lg shadow-violet-900/40"
              whileHover={{ rotate: -3, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            >
              <motion.span
                aria-hidden="true"
                className="absolute inset-1.5 rounded-xl border border-white/30"
                animate={{ scale: [1, 0.93, 1], opacity: [0.4, 0.85, 0.4] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <ShieldCheck className="relative h-9 w-9" />
            </motion.div>

            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-violet-300">
                <motion.span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full bg-emerald-400"
                  animate={{ opacity: [1, 0.25, 1], scale: [1, 0.8, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
                Control room · one session at a time
              </p>
              <h1 className="mt-1 truncate text-3xl font-black leading-tight text-white sm:text-4xl">
                Admin console
              </h1>
              <p className="mt-2 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-bold text-slate-200">
                <Phone className="h-4 w-4 text-violet-300" />
                {phone}
              </p>
            </div>
          </div>

          {/* One sentence for the state of the site and one way into it: the queue
              below is where the work is, so the deck points at it instead of
              repeating it. */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href="#admin-triage"
              className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-bold transition ${
                loading
                  ? 'border-white/10 bg-white/5 text-slate-300'
                  : decisions
                    ? 'border-amber-400/40 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25'
                    : 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/25'
              }`}
            >
              {loading ? (
                'Reading the site...'
              ) : decisions ? (
                <>
                  <TriangleAlert className="h-4 w-4" />
                  {decisions} {decisions === 1 ? 'decision is' : 'decisions are'} waiting on you
                </>
              ) : (
                <>
                  <CircleCheck className="h-4 w-4" />
                  Nothing is waiting on you
                </>
              )}
            </a>

            <button
              type="button"
              data-tour="admin-commands"
              onClick={onOpenCommands}
              className="group inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-bold text-slate-200 transition hover:border-violet-400/50 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <Search className="h-4 w-4 text-violet-300" />
              Jump to anything
              <span className="rounded border border-white/15 bg-slate-900/80 px-1.5 py-0.5 text-[11px] font-black text-slate-300">
                {COMMAND_SHORTCUT}
              </span>
            </button>

            {/* The walkthrough starts from the same row as the shortcut it explains. */}
            {children}
          </div>
        </div>

        <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide text-violet-300">
            Site time
          </p>
          <p className="mt-1 font-mono text-4xl font-black leading-none tabular-nums text-white">
            {clockFormat.format(now)}
          </p>
          <p className="mt-2 text-sm font-bold text-slate-300">{dateFormat.format(now)}</p>
        </div>
      </div>

      {/* The navbar names these pages; the rail hands them over with their queues
          showing, so the deck answers where to go next as well as where you are. */}
      <motion.nav
        aria-label="Admin sections"
        variants={staggerParent(0.05, 0.12)}
        className="relative flex gap-2 overflow-x-auto border-t border-white/10 bg-slate-950/60 px-6 py-3 sm:px-8"
      >
        {DECK_LINKS.map((link) => {
          const badge = link.badgeKey ? badges[link.badgeKey] : 0

          return (
            <motion.div key={link.to} variants={fadeUp} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <Link
                to={link.to}
                className="group inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-300 whitespace-nowrap transition hover:border-violet-400/50 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                <link.Icon className="h-4 w-4 text-violet-300 transition group-hover:scale-110" />
                {link.label}
                {badge ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-black text-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </Link>
            </motion.div>
          )
        })}
      </motion.nav>
    </motion.section>
  )
}

export default AdminHomeConsole
