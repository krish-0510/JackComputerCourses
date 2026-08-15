import { motion } from 'framer-motion'
import { BookOpen, Bug, CalendarCheck, FileText, MessageSquareCode, Terminal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fadeUp, staggerParent } from '../../utils/motion'

// Eight places in the navigation, six of them worth a shortcut. A faculty knows what
// these are called, so they are pills rather than tiles with explanations: one row to
// scan, and the badge is the only thing asking to be read.
const QUICK_LINKS = [
  { to: '/faculty/courses', label: 'Courses', Icon: BookOpen, tone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' },
  { to: '/faculty/queries', label: 'Queries', Icon: MessageSquareCode, tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300', badgeKey: 'pendingQueries' },
  { to: '/faculty/attendance', label: 'Attendance', Icon: CalendarCheck, tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
  { to: '/faculty/ide', label: 'Code IDE', Icon: Terminal, tone: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300' },
  { to: '/faculty/notes', label: 'Notes', Icon: FileText, tone: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { to: '/faculty/bugs', label: 'Report a bug', Icon: Bug, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
]

const FacultyHomeQuickLinks = ({ badges = {} }) => (
  <motion.nav
    aria-label="Quick links"
    variants={staggerParent(0.05, 0.06)}
    className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
  >
    {QUICK_LINKS.map((link) => {
      const badge = link.badgeKey ? badges[link.badgeKey] : 0

      return (
        <motion.div key={link.to} variants={fadeUp} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
          <Link
            to={link.to}
            className="group flex h-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-indigo-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
          >
            <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition group-hover:scale-110 ${link.tone}`}>
              <link.Icon className="h-4 w-4" />
            </span>

            <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
              {link.label}
            </span>

            {badge ? (
              <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-black text-white">
                {badge}
              </span>
            ) : null}
          </Link>
        </motion.div>
      )
    })}
  </motion.nav>
)

export default FacultyHomeQuickLinks
