import axios from 'axios'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import ThemeToggle from '../Common/ThemeToggle'
import { useAuth } from '../../Context/AuthContext'
import { useAdminAlerts } from '../../utils/adminAlerts'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

// Links that carry a badge name the alert count they answer for.
const NAV_LINKS = [
  { to: '/admin/home', label: 'Home' },
  { to: '/admin/users', label: 'Users', alertKey: 'passwordRequests' },
  { to: '/admin/faculties', label: 'Faculties' },
  { to: '/admin/attendance', label: 'Attendance' },
  { to: '/admin/courses', label: 'Courses' },
  { to: '/admin/contents', label: 'Content' },
  { to: '/admin/topic-notes', label: 'Notes' },
  { to: '/admin/bugs', label: 'Bugs', alertKey: 'bugs' },
  { to: '/admin/reviews', label: 'Reviews' },
]

const getNavLinkClass = ({ isActive }) => `relative rounded-lg px-3 py-2 text-sm font-semibold transition ${
  isActive
    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
}`

// The count rides the top right corner of its own link, so whatever is waiting
// for the admin is visible from every admin page.
const AdminNavLink = ({ to, label, count, onClick }) => (
  <NavLink to={to} onClick={onClick} className={getNavLinkClass}>
    {label}
    {count ? (
      <span
        title={`${count} waiting for you`}
        className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white shadow-sm"
      >
        {count > 99 ? '99+' : count}
      </span>
    ) : null}
  </NavLink>
)

const AdminNavbar = () => {
  const navigate = useNavigate()
  const { clearAuth } = useAuth()
  const alerts = useAdminAlerts()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  const handleLogout = async () => {
    setLoading(true)
    setError('')

    try {
      await Promise.all([
        axios.post(`${API_BASE_URL}/admin/logout`, {}, {
          withCredentials: true,
        }),
        axios.post(`${API_BASE_URL}/user/logout`, {}, {
          withCredentials: true,
        }),
        axios.post(`${API_BASE_URL}/faculty/logout`, {}, {
          withCredentials: true,
        }),
      ])

      clearAuth()
      navigate('/login', { replace: true })
    } catch (logoutError) {
      setError(logoutError?.response?.data?.message || 'Unable to logout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <nav className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/admin/home" onClick={closeMobileMenu} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <span className="text-lg font-bold text-white">J</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Admin Home
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {/* data-tour marks what the first run walkthrough points at. Only this row
              carries it, so the spotlight never lands on the copy inside the mobile menu. */}
          <div data-tour="admin-sections" className="hidden items-center gap-2 sm:flex">
            {NAV_LINKS.map((link) => (
              <AdminNavLink
                key={link.to}
                to={link.to}
                label={link.label}
                count={link.alertKey ? alerts[link.alertKey] : 0}
                onClick={closeMobileMenu}
              />
            ))}
          </div>
          {error ? (
            <span className="hidden text-sm font-medium text-red-600 dark:text-red-300 sm:inline">
              {error}
            </span>
          ) : null}
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="hidden rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-700 sm:inline-flex"
          >
            {loading ? 'Logging out...' : 'Logout'}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:ring-offset-slate-900 sm:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {mobileMenuOpen ? (
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-4 sm:hidden">
          <div className="grid gap-2">
            {NAV_LINKS.map((link) => (
              <AdminNavLink
                key={link.to}
                to={link.to}
                label={link.label}
                count={link.alertKey ? alerts[link.alertKey] : 0}
                onClick={closeMobileMenu}
              />
            ))}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="mt-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-700"
            >
              {loading ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <div className="border-t border-red-100 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 sm:hidden">
          {error}
        </div>
      ) : null}
    </nav>
  )
}

export default AdminNavbar
