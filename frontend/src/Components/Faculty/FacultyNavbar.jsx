import axios from 'axios'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import ThemeToggle from '../Common/ThemeToggle'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getNavLinkClass = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold transition ${
  isActive
    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
}`

const FacultyNavbar = () => {
  const navigate = useNavigate()
  const { clearAuth } = useAuth()
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
        axios.post(`${API_BASE_URL}/faculty/logout`, {}, {
          withCredentials: true,
        }),
        axios.post(`${API_BASE_URL}/admin/logout`, {}, {
          withCredentials: true,
        }),
        axios.post(`${API_BASE_URL}/user/logout`, {}, {
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
    <nav className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/faculty/home" onClick={closeMobileMenu} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <span className="text-lg font-bold text-white">J</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Faculty Home
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {/* data-tour marks what the first run walkthrough points at. Only this row
              carries it; where it is hidden the walkthrough centres its cards instead. */}
          <div className="hidden items-center gap-2 sm:flex">
            <NavLink to="/faculty/home" onClick={closeMobileMenu} data-tour="faculty-home" className={getNavLinkClass}>
              Home
            </NavLink>
            <NavLink to="/faculty/courses" onClick={closeMobileMenu} data-tour="faculty-courses" className={getNavLinkClass}>
              Courses
            </NavLink>
            <NavLink to="/faculty/contents" onClick={closeMobileMenu} data-tour="faculty-contents" className={getNavLinkClass}>
              Content
            </NavLink>
            <NavLink to="/faculty/ide" onClick={closeMobileMenu} data-tour="faculty-ide" className={getNavLinkClass}>
              IDE
            </NavLink>
            <NavLink to="/faculty/queries" onClick={closeMobileMenu} data-tour="faculty-queries" className={getNavLinkClass}>
              Queries
            </NavLink>
            <NavLink to="/faculty/notes" onClick={closeMobileMenu} data-tour="faculty-notes" className={getNavLinkClass}>
              Notes
            </NavLink>
            <NavLink to="/faculty/attendance" onClick={closeMobileMenu} data-tour="faculty-attendance" className={getNavLinkClass}>
              Attendance
            </NavLink>
            <NavLink to="/faculty/bugs" onClick={closeMobileMenu} data-tour="faculty-bugs" className={getNavLinkClass}>
              Report a Bug
            </NavLink>
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
            <NavLink to="/faculty/home" onClick={closeMobileMenu} className={getNavLinkClass}>
              Home
            </NavLink>
            <NavLink to="/faculty/courses" onClick={closeMobileMenu} className={getNavLinkClass}>
              Courses
            </NavLink>
            <NavLink to="/faculty/contents" onClick={closeMobileMenu} className={getNavLinkClass}>
              Content
            </NavLink>
            <NavLink to="/faculty/ide" onClick={closeMobileMenu} className={getNavLinkClass}>
              IDE
            </NavLink>
            <NavLink to="/faculty/queries" onClick={closeMobileMenu} className={getNavLinkClass}>
              Queries
            </NavLink>
            <NavLink to="/faculty/notes" onClick={closeMobileMenu} className={getNavLinkClass}>
              Notes
            </NavLink>
            <NavLink to="/faculty/attendance" onClick={closeMobileMenu} className={getNavLinkClass}>
              Attendance
            </NavLink>
            <NavLink to="/faculty/bugs" onClick={closeMobileMenu} className={getNavLinkClass}>
              Report a Bug
            </NavLink>
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

export default FacultyNavbar
