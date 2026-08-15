import axios from 'axios'
import { useEffect, useState } from 'react'
import { formatAccessEnd } from '../../utils/courseAccess'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

// A name and a deadline is the whole sheet, so the deadline carries the standing in its
// own tense rather than spending a badge on it — which also keeps the colour from being
// the only thing saying whether a course is still running.
const getDeadlineLabel = (course) => {
  const endDate = formatAccessEnd(course)

  if (!endDate) {
    return 'No deadline set'
  }

  return `${course.isEnrolmentRunning ? 'Ends' : 'Ended'} ${endDate}`
}

// Everything one account was actually enrolled in, running ones first. Courses open to
// all are the public catalogue rather than an enrolment, so they are left out here for
// the same reason they never make an account active.
const AdminUserCourses = ({ user, onClose }) => {
  const [courses, setCourses] = useState([])
  const [runningCount, setRunningCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    const fetchCourses = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await axios.get(`${API_BASE_URL}/admin/users/${user._id}/courses`, {
          withCredentials: true,
        })

        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Unable to fetch courses')
        }

        if (isActive) {
          setCourses(response.data?.data?.courses || [])
          setRunningCount(response.data?.data?.runningCount || 0)
        }
      } catch (fetchError) {
        if (isActive) {
          setError(fetchError?.response?.data?.message || 'Unable to fetch courses. Please try again.')
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchCourses()

    return () => {
      isActive = false
    }
  }, [user._id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close courses"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Enrolled Courses</h2>
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
              {String(user.name || '').trim() || 'Unnamed user'} · {user.phone}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {loading || error ? null : (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                runningCount
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
              >
                {runningCount} of {courses.length} running
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
            >
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto">
          {loading ? (
            <div className="px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
              Loading courses...
            </div>
          ) : error ? (
            <p className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          ) : courses.length ? (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {courses.map((course) => (
                <li key={course._id} className="flex items-baseline justify-between gap-4 px-6 py-3">
                  <p className="min-w-0 wrap-break-word text-sm font-bold text-slate-900 dark:text-slate-100">
                    {course.title}
                  </p>
                  <span className={`shrink-0 text-xs font-semibold ${
                    course.isEnrolmentRunning
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                  >
                    {getDeadlineLabel(course)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
              This user has not been enrolled in any course.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminUserCourses
