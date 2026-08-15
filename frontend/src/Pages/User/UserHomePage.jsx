import axios from 'axios'
import { MotionConfig, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import CourseListPanel from '../../Components/Common/CourseListPanel'
import PageTour from '../../Components/Tour/PageTour'
import UserHomeHero from '../../Components/User/UserHomeHero'
import UserHomeQuickLinks from '../../Components/User/UserHomeQuickLinks'
import UserHomeStats from '../../Components/User/UserHomeStats'
import UserNavbar from '../../Components/User/UserNavbar'
import UserProfilePrompt from '../../Components/User/Profile/UserProfilePrompt'
import UserReviewPrompt from '../../Components/User/Review/UserReviewPrompt'
import userHomePageTour from '../Tour/User/UserHomePageTour'
import { useAuth } from '../../Context/AuthContext'
import {
  getCourseAccessDisplay,
  getCourseExpiryWarning,
  isCourseAccessEnded,
} from '../../utils/courseAccess'
import { useCourseAccessEndedPrompt } from '../../utils/courseAccessPrompt'
import {
  STATUS_META,
  getMonthLabel,
  startOfMonth,
  summarizeAttendance,
  toMonthKey,
} from '../../utils/attendance'
import { staggerParent } from '../../utils/motion'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const isAuthError = (error) => [401, 403].includes(error?.response?.status)

const UserHomePage = () => {
  const { auth, clearAuth, setAuth } = useAuth()
  const promptAccessEnded = useCourseAccessEndedPrompt()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  // Only an account that has never seen it gets the walkthrough unasked; the button
  // starts the same one again whenever the site stops making sense.
  const [firstRun, setFirstRun] = useState(false)
  // The optional details are asked for on the login that lands here, and only until
  // the account has either filled them in or asked to be left alone for a few days.
  const [askForProfile, setAskForProfile] = useState(false)
  // The other optional ask. A login is worth one interruption, so a visit that owes
  // both the profile and a review is asked for the profile and left alone about the
  // review until the next one — the server is still counting the week either way.
  const [askForReview, setAskForReview] = useState(false)
  const [courses, setCourses] = useState([])
  const [records, setRecords] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')

  // The dashboard is always the running month, fixed at mount: a session left open
  // overnight keeps reading the month it was opened on rather than silently moving.
  const [monthDate] = useState(() => startOfMonth(new Date()))
  const monthKey = toMonthKey(monthDate)
  const monthLabel = getMonthLabel(monthDate)

  // The month is read for its totals only — the attendance page is where a day by day
  // record belongs, and it is one click away from here.
  const summary = useMemo(() => summarizeAttendance(records), [records])

  // Courses that have ended stay on the list — they are how a student knows what to ask
  // the admin about — but they sit under the ones that can still be watched, and they are
  // counted apart so "open to you" never counts a course that is not.
  const [openCourses, endedCourses] = useMemo(() => [
    courses.filter((course) => !isCourseAccessEnded(course)),
    courses.filter(isCourseAccessEnded),
  ], [courses])

  // Courses and the month are one load: the page has nothing to say until both are in,
  // so a single request pair also means a single spinner and a single retry.
  const loadDashboard = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoadingData(true)
      setError('')
    }

    try {
      const [coursesResponse, attendanceResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/user/courses`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/user/attendance`, {
          params: { month: monthKey },
          withCredentials: true,
        }),
      ])

      if (!coursesResponse.data?.success || !attendanceResponse.data?.success) {
        throw new Error('Unable to load your dashboard')
      }

      if (!shouldUpdate()) {
        return
      }

      setCourses(coursesResponse.data?.data?.courses || [])
      // A day marked before the statuses were narrowed down reads as unmarked instead
      // of breaking the month.
      setRecords((attendanceResponse.data?.data?.attendance || [])
        .filter((record) => STATUS_META[record.status]))
    } catch (loadError) {
      if (!shouldUpdate()) {
        return
      }

      if (isAuthError(loadError)) {
        clearAuth()
        setIsAuthorized(false)
        return
      }

      setError(getErrorMessage(loadError, 'Unable to load your dashboard. Please try again.'))
    } finally {
      if (shouldUpdate()) {
        setLoadingData(false)
      }
    }
  }, [clearAuth, monthKey])

  useEffect(() => {
    let isActive = true

    const verifyUserAndLoad = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/user/profile`, {
          withCredentials: true,
        })

        const user = response.data?.data?.user

        if (!response.data?.success || user?.role !== 'user') {
          throw new Error('Unauthorized user')
        }

        if (!isActive) {
          return
        }

        setAuth({
          role: 'user',
          phone: user.phone,
          token: null,
        })
        setUserProfile(user)
        setFirstRun(Boolean(user.requiresTour))
        setAskForProfile(Boolean(user.requiresProfile))
        setAskForReview(Boolean(user.requiresReview) && !user.requiresProfile)
        setIsAuthorized(true)
        setCheckingAuth(false)
        await loadDashboard({ shouldUpdate: () => isActive })
      } catch {
        if (!isActive) {
          return
        }

        clearAuth()
        setIsAuthorized(false)
      } finally {
        if (isActive) {
          setCheckingAuth(false)
        }
      }
    }

    verifyUserAndLoad()

    return () => {
      isActive = false
    }
  }, [clearAuth, loadDashboard, setAuth])

  // Closing the first run is what retires it for this account. A replay has nothing
  // left to save, and a failed write only means the account is greeted once more.
  const markWalkthroughSeen = async () => {
    if (!firstRun) {
      return
    }

    setFirstRun(false)

    try {
      await axios.patch(`${API_BASE_URL}/user/tour`, {}, {
        withCredentials: true,
      })
    } catch {
      // Nothing on this page depends on it, so there is nothing to report.
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthorized || auth.role !== 'user') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <UserNavbar />

      {/* One setting hands the whole dashboard over to a reader who asked for less
          motion, so no card below has to carry the check itself. */}
      <MotionConfig reducedMotion="user">
        <motion.main
          variants={staggerParent(0.1)}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6 lg:px-8"
        >
          <UserHomeHero
            name={userProfile?.name || 'Student'}
            phone={userProfile?.phone || auth.phone}
            profileId={userProfile?._id ? userProfile._id.slice(-8).toUpperCase() : 'SECURE'}
            summary={summary}
            monthLabel={monthLabel}
            loading={loadingData}
          >
            <PageTour steps={userHomePageTour} autoStart={firstRun} onClose={markWalkthroughSeen} />
          </UserHomeHero>

          {error ? (
            <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => loadDashboard()}
                disabled={loadingData}
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:text-red-300 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-300 dark:hover:border-red-700 dark:disabled:text-red-500"
              >
                {loadingData ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          ) : null}

          <UserHomeStats
            summary={summary}
            courseCount={openCourses.length}
            monthLabel={monthLabel}
            loading={loadingData}
          />

          <UserHomeQuickLinks />

          <CourseListPanel
            title="Your courses"
            subtitle={loadingData
              ? 'Checking what is open to you...'
              : `${openCourses.length} ${openCourses.length === 1 ? 'course is' : 'courses are'} open to you${
                endedCourses.length ? ` · ${endedCourses.length} ended` : ''
              }`}
            courses={[...openCourses, ...endedCourses]}
            loading={loadingData}
            accent="blue"
            browseHref="/user/courses"
            // An ended course has no player to open, so its row asks the admin instead.
            getHref={(course) => (isCourseAccessEnded(course) ? '' : `/user/courses/${course._id}/player`)}
            onSelect={promptAccessEnded}
            getChip={(course) => {
              // A row that is about to close says so in the badge it already had, so the
              // deadline is spotted from the home list without opening the course.
              const expiryWarning = getCourseExpiryWarning(course)

              return expiryWarning
                ? { label: expiryWarning.chipLabel, className: expiryWarning.chipClassName }
                : {
                  label: getCourseAccessDisplay(course).value,
                  className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                }
            }}
            openInNewTab
            emptyHint="Courses appear here as soon as they are published or assigned to your number."
          />
        </motion.main>
      </MotionConfig>

      {/* The walkthrough owns the first screen an account ever sees, so anything else
          worth asking waits until it is done rather than opening over the top of it. */}
      {firstRun ? null : (
        <>
          {askForProfile ? (
            <UserProfilePrompt onDismiss={() => setAskForProfile(false)} />
          ) : null}

          {askForReview ? (
            <UserReviewPrompt onDismiss={() => setAskForReview(false)} />
          ) : null}
        </>
      )}
    </div>
  )
}

export default UserHomePage
