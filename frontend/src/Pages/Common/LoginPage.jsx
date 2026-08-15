import axios from 'axios'
import { Loader2, ShieldBan } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLoadingScreen from '../../Components/Common/AuthLoadingScreen'
import PasswordInput from '../../Components/Common/PasswordInput'
import PasswordResetRequestModal from '../../Components/Common/PasswordResetRequestModal'
import ThemeToggle from '../../Components/Common/ThemeToggle'
import { fetchRoleProfile, getPostAuthRedirectPath, useAuth } from '../../Context/AuthContext'
import { useAdminContactPrompt } from '../../utils/adminContactPrompt'
import { SELF_REGISTRATION_ENABLED } from '../../utils/featureFlags'

// Loaded on demand so three.js stays out of the initial bundle.
const LoginTransitionScreen = lazy(() => import('../../Components/Common/LoginTransitionScreen'))

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:4000'

// The 3D transition always plays in full, even when the requests finish sooner.
const MIN_TRANSITION_MS = 3000

const RESTORE_STAGES = [
  'Checking your session',
  'Preparing your workspace',
  'Almost there',
]

const getErrorMessage = (error) => (
  error?.response?.data?.message || 'Unable to login. Please try again.'
)

// One form logs in three kinds of account, so a refusal normally only means "not this
// role, try the next one". A 403 is different: the credentials were right and the site
// still said no, which only a blocked account gets. That answer ends the attempts and is
// the one shown, or it would be buried under the next role's "invalid phone or password".
const isBlockedError = (error) => error?.response?.status === 403

const holdForTransition = (startedAt) => new Promise((resolve) => {
  setTimeout(resolve, Math.max(MIN_TRANSITION_MS - (Date.now() - startedAt), 0))
})

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { auth, clearAuth, setAuth } = useAuth()
  const promptAdminContact = useAdminContactPrompt()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [requestingPassword, setRequestingPassword] = useState(false)
  // The stored role tells us which profile endpoint to hit, so an already
  // signed in visitor costs one request and a signed out one costs none.
  const [restoringSession, setRestoringSession] = useState(Boolean(auth.role))

  useEffect(() => {
    if (!auth.role) {
      return undefined
    }

    let isActive = true

    const restoreSession = async () => {
      const startedAt = Date.now()
      const profile = await fetchRoleProfile(auth.role)

      if (!isActive) {
        return
      }

      if (!profile) {
        clearAuth()
        setRestoringSession(false)
        return
      }

      await holdForTransition(startedAt)

      if (!isActive) {
        return
      }

      setAuth({
        role: auth.role,
        phone: profile.phone,
        token: null,
      })
      navigate(getPostAuthRedirectPath(auth.role, location.state?.from), { replace: true })
    }

    restoreSession()

    return () => {
      isActive = false
    }
  }, [auth.role, clearAuth, location.state, navigate, setAuth])

  const loginAdmin = async (credentials) => {
    const response = await axios.post(`${API_BASE_URL}/admin/login`, credentials, {
      withCredentials: true,
    })

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Admin login failed')
    }

    return response.data.data?.admin
  }

  const loginUser = async (credentials) => {
    const response = await axios.post(`${API_BASE_URL}/user/login`, credentials, {
      withCredentials: true,
    })

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'User login failed')
    }

    return response.data.data?.user
  }

  const loginFaculty = async (credentials) => {
    const response = await axios.post(`${API_BASE_URL}/faculty/login`, credentials, {
      withCredentials: true,
    })

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Faculty login failed')
    }

    return response.data.data?.faculty
  }

  const clearExistingSessions = async () => {
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
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedPhone = phone.trim()

    if (!trimmedPhone || !password) {
      setError('Phone and password are required.')
      return
    }

    setLoading(true)
    setError('')

    const startedAt = Date.now()
    const credentials = {
      phone: trimmedPhone,
      password,
    }
    const fromLocation = location.state?.from

    try {
      await clearExistingSessions()
    } catch {
      setError('Unable to reset the previous session. Please try again.')
      setLoading(false)
      return
    }

    // Every role shares one login form, so try each endpoint until one accepts.
    const attempts = [
      { role: 'admin', login: loginAdmin },
      { role: 'user', login: loginUser },
      { role: 'faculty', login: loginFaculty },
    ]
    let signedIn = null
    let lastError = null

    for (const attempt of attempts) {
      try {
        const profile = await attempt.login(credentials)

        signedIn = {
          role: attempt.role,
          phone: profile?.phone || trimmedPhone,
        }
        break
      } catch (loginError) {
        lastError = loginError

        if (isBlockedError(loginError)) {
          break
        }
      }
    }

    // A failed login drops straight back to the form instead of holding the
    // animation, so nobody waits three seconds to be told the phone is wrong.
    if (!signedIn) {
      const message = getErrorMessage(lastError)

      setError(message)
      setLoading(false)

      // A blocked account is the one refusal the person cannot do anything about from
      // here, so it is not left as a line above the button: the server's sentence is put
      // in front of them with the way to reach the admin attached.
      if (isBlockedError(lastError)) {
        promptAdminContact({
          title: 'Your account is blocked',
          description: message,
          subject: trimmedPhone,
          chatMessage: `my account (${trimmedPhone}) is blocked. I want to get access back.`,
          icon: ShieldBan,
        })
      }

      return
    }

    await holdForTransition(startedAt)

    setAuth({
      role: signedIn.role,
      phone: signedIn.phone,
      token: null,
    })
    navigate(getPostAuthRedirectPath(signedIn.role, fromLocation), { replace: true })
  }

  const showTransition = loading || restoringSession

  return (
    <>
      {showTransition ? (
        <Suspense fallback={<AuthLoadingScreen message="Signing you in..." />}>
          <LoginTransitionScreen
            title={restoringSession ? 'Welcome back' : 'Signing you in'}
            stages={restoringSession ? RESTORE_STAGES : undefined}
          />
        </Suspense>
      ) : null}

      <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>
        <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
            <div className="mb-8 text-center">
              <Link to="/" className="inline-flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-tr from-blue-600 to-indigo-600">
                  <span className="text-xl font-bold text-white">J</span>
                </div>
                <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100">
                  Jack<span className="text-blue-600">Courses</span>
                </span>
              </Link>
              <h1 className="mt-8 text-3xl font-bold text-slate-900 dark:text-slate-100">Login</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Use your registered phone number and password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                  placeholder="Enter phone number"
                  disabled={loading}
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setRequestingPassword(true)}
                    disabled={loading}
                    className="text-sm font-semibold text-blue-600 transition hover:text-blue-700 dark:hover:text-blue-300 disabled:cursor-not-allowed disabled:text-blue-300"
                  >
                    Forgot Password?
                  </button>
                </div>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                  placeholder="Enter password"
                  disabled={loading}
                />
              </div>

              {error ? (
                <p className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            {SELF_REGISTRATION_ENABLED ? (
              <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
                Don&apos;t have an account?{' '}
                <Link to="/register" state={location.state} className="font-semibold text-blue-600 transition hover:text-blue-700 dark:hover:text-blue-300">
                  Sign up
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {requestingPassword ? (
        <PasswordResetRequestModal onClose={() => setRequestingPassword(false)} />
      ) : null}
    </>
  )
}

export default LoginPage
