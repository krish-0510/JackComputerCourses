import axios from 'axios'
import { CalendarClock } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import AdminCustomExpiryModal from '../../Components/Admin/AdminCustomExpiryModal'
import AdminNavbar from '../../Components/Admin/AdminNavbar'
import PageTour from '../../Components/Tour/PageTour'
import getAdminCourseAccessPageTour from '../Tour/Admin/AdminCourseAccessPageTour'
import { useAuth } from '../../Context/AuthContext'
import { formatAccessEnd } from '../../utils/courseAccess'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const normalizePhone = (value) => String(value || '').trim()

const getUserName = (user) => String(user?.name || '').trim()

const sortUsers = (first, second) => {
  const nameComparison = getUserName(first).localeCompare(getUserName(second))

  return nameComparison || first.phone.localeCompare(second.phone)
}

const parsePhoneInput = (value) => (
  String(value || '')
    .split(',')
    .map((phone) => phone.trim())
    .filter(Boolean)
)

const buildAccessGrantList = (data = {}) => {
  const accessGrants = Array.isArray(data.accessGrants) ? data.accessGrants : []

  if (accessGrants.length) {
    return accessGrants
      .map((grant) => ({
        ...grant,
        phone: normalizePhone(grant?.phone),
      }))
      .filter((grant) => grant.phone)
  }

  return (data.allowedUserPhones || [])
    .map((phone) => ({ phone: normalizePhone(phone) }))
    .filter((grant) => grant.phone)
}

const CourseAccessPage = () => {
  const { courseId } = useParams()
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [course, setCourse] = useState(null)
  const [accessGrants, setAccessGrants] = useState([])
  const [users, setUsers] = useState([])
  const [loadingAccess, setLoadingAccess] = useState(true)
  const [phoneInput, setPhoneInput] = useState('')
  const [busyAccessKey, setBusyAccessKey] = useState('')
  const [expiryPhone, setExpiryPhone] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const accessPhoneSet = useMemo(() => (
    new Set(accessGrants.map((grant) => normalizePhone(grant.phone)).filter(Boolean))
  ), [accessGrants])

  const accessUsers = useMemo(() => (
    accessGrants
      .map((grant) => {
        const normalizedPhone = normalizePhone(grant.phone)
        const matchingUser = users.find((user) => normalizePhone(user.phone) === normalizedPhone)

        return {
          _id: matchingUser?._id || normalizedPhone,
          name: matchingUser?.name || '',
          phone: matchingUser?.phone || normalizedPhone,
          accessType: grant.accessType || '',
          accessEndsAt: grant.accessEndsAt || null,
          accessEndsOn: grant.accessEndsOn || '',
          isAccessExpired: Boolean(grant.isAccessExpired),
        }
      })
      .filter((user) => user.phone)
      .sort(sortUsers)
  ), [accessGrants, users])

  // Held as a phone rather than as the row itself, so the dialog re-reads the grant it is
  // open on after a save and shows what was actually stored instead of what was sent.
  const expiryUser = useMemo(() => (
    accessUsers.find((user) => normalizePhone(user.phone) === expiryPhone) || null
  ), [accessUsers, expiryPhone])

  const availableUsers = useMemo(() => (
    users
      .filter((user) => !accessPhoneSet.has(normalizePhone(user.phone)))
      .sort(sortUsers)
  ), [accessPhoneSet, users])

  const applyAccessData = useCallback((data = {}) => {
    setAccessGrants(buildAccessGrantList(data))

    if (data.course) {
      setCourse(data.course)
    }
  }, [])

  const resetMessages = () => {
    setError('')
    setSuccess('')
  }

  const fetchAccessData = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoadingAccess(true)
      setError('')
    }

    try {
      const accessResponse = await axios.get(`${API_BASE_URL}/admin/courses/${courseId}/access`, {
        withCredentials: true,
      })

      if (!accessResponse.data?.success) {
        throw new Error(accessResponse.data?.message || 'Unable to fetch course access')
      }

      const accessData = accessResponse.data?.data || {}
      let nextUsers = []

      if (!accessData.course?.isOpenToAll) {
        const usersResponse = await axios.get(`${API_BASE_URL}/admin/users`, {
          withCredentials: true,
        })

        if (!usersResponse.data?.success) {
          throw new Error(usersResponse.data?.message || 'Unable to fetch users')
        }

        nextUsers = usersResponse.data?.data?.users || []
      }

      if (shouldUpdate()) {
        applyAccessData(accessData)
        setUsers(nextUsers)
      }
    } catch (fetchError) {
      if (shouldUpdate()) {
        setError(getErrorMessage(fetchError, 'Unable to load course access. Please try again.'))
      }
    } finally {
      if (shouldUpdate()) {
        setLoadingAccess(false)
      }
    }
  }, [applyAccessData, courseId])

  useEffect(() => {
    let isActive = true

    const verifyAdmin = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/admin/profile`, {
          withCredentials: true,
        })

        const admin = response.data?.data?.admin

        if (!response.data?.success || admin?.role !== 'admin') {
          throw new Error('Unauthorized admin')
        }

        if (!isActive) {
          return
        }

        setAuth({
          role: 'admin',
          phone: admin.phone,
          token: null,
        })
        setIsAuthorized(true)
        await fetchAccessData({ shouldUpdate: () => isActive })
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

    verifyAdmin()

    return () => {
      isActive = false
    }
  }, [clearAuth, fetchAccessData, setAuth])

  const grantAccess = async (phones, successMessage = 'Course access granted successfully.') => {
    const normalizedPhones = phones.map(normalizePhone).filter(Boolean)

    if (!normalizedPhones.length) {
      setError('Enter at least one phone number.')
      setSuccess('')
      return
    }

    resetMessages()
    setBusyAccessKey(`add:${normalizedPhones.join(',')}`)

    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/courses/${courseId}/access`,
        { phones: normalizedPhones },
        { withCredentials: true },
      )

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to add course access')
      }

      applyAccessData(response.data?.data)
      setPhoneInput('')
      setSuccess(successMessage)
    } catch (grantError) {
      setError(getErrorMessage(grantError, 'Unable to add course access. Please try again.'))
    } finally {
      setBusyAccessKey('')
    }
  }

  const removeAccess = async (phone) => {
    const normalizedPhone = normalizePhone(phone)

    if (!normalizedPhone) {
      return
    }

    resetMessages()
    setBusyAccessKey(`remove:${normalizedPhone}`)

    try {
      const response = await axios.delete(`${API_BASE_URL}/admin/courses/${courseId}/access`, {
        data: { phones: [normalizedPhone] },
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to remove course access')
      }

      applyAccessData(response.data?.data)
      setSuccess('Course access removed successfully.')
    } catch (removeError) {
      setError(getErrorMessage(removeError, 'Unable to remove course access. Please try again.'))
    } finally {
      setBusyAccessKey('')
    }
  }

  const saveCustomExpiry = async (phone, expiresAt) => {
    const normalizedPhone = normalizePhone(phone)

    if (!normalizedPhone) {
      return
    }

    resetMessages()
    setBusyAccessKey(`expiry:${normalizedPhone}`)

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/admin/courses/${courseId}/access`,
        { phone: normalizedPhone, expiresAt },
        { withCredentials: true },
      )

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to update custom expiry')
      }

      applyAccessData(response.data?.data)
      setExpiryPhone('')
      setSuccess(expiresAt
        ? `Custom expiry set for ${normalizedPhone}.`
        : `Custom expiry removed for ${normalizedPhone}.`)
    } catch (expiryError) {
      setError(getErrorMessage(expiryError, 'Unable to update custom expiry. Please try again.'))
    } finally {
      setBusyAccessKey('')
    }
  }

  const handleGrantSubmit = (event) => {
    event.preventDefault()
    grantAccess(parsePhoneInput(phoneInput))
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthorized || auth.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <AdminNavbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            to={`/admin/courses/${courseId}`}
            className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            Back to course
          </Link>
          <Link
            to="/admin/courses"
            className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            Back to courses
          </Link>
        </div>

        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              {course?.isOpenToAll ? 'Open to All' : 'User Access'}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {course?.title || 'Course Access'}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Held back until the course is read: an open course has no lists, so it
                gets a walkthrough of one stop rather than three pointing at nothing. */}
            {course ? (
              <PageTour
                steps={getAdminCourseAccessPageTour({ isOpenToAll: Boolean(course.isOpenToAll) })}
              />
            ) : null}

            <button
              type="button"
              onClick={() => fetchAccessData()}
              disabled={loadingAccess || Boolean(busyAccessKey)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
            >
              {loadingAccess ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error ? (
          <p className="mb-5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="mb-5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {success}
          </p>
        ) : null}

        {loadingAccess ? (
          <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading course access...</p>
          </section>
        ) : course?.isOpenToAll ? (
          <section className="rounded-lg border border-blue-100 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-6 py-12 text-center shadow-sm">
            <h2 className="text-lg font-bold text-blue-900 dark:text-blue-100">Open to All</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-blue-800 dark:text-blue-200">
              Every registered user can access this course. User Access is not needed.
            </p>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <section data-tour="admin-access-grant" className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Grant Access</h2>

              <form onSubmit={handleGrantSubmit} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="access-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Phone
                  </label>
                  <input
                    id="access-phone"
                    type="text"
                    value={phoneInput}
                    onChange={(event) => setPhoneInput(event.target.value)}
                    disabled={Boolean(busyAccessKey)}
                    className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                    placeholder="9876543210"
                  />
                </div>

                <button
                  type="submit"
                  disabled={Boolean(busyAccessKey)}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  {busyAccessKey.startsWith('add:') ? 'Granting...' : 'Grant Access'}
                </button>
              </form>

              <div data-tour="admin-access-available" className="mt-8">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Available Users</h3>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {availableUsers.length}
                  </span>
                </div>

                {availableUsers.length ? (
                  <div className="mt-3 max-h-105 space-y-2 overflow-y-auto pr-1">
                    {availableUsers.map((user) => {
                      const addKey = `add:${normalizePhone(user.phone)}`
                      const userName = getUserName(user)

                      return (
                        <div
                          key={user._id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {userName || user.phone}
                            </p>
                            {userName ? (
                              <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                                {user.phone}
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => grantAccess([user.phone], `Access granted to ${user.phone}.`)}
                            disabled={Boolean(busyAccessKey)}
                            className="rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 disabled:cursor-not-allowed disabled:text-indigo-300 dark:disabled:text-indigo-500"
                          >
                            {busyAccessKey === addKey ? 'Adding...' : 'Add'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    All existing users already have access.
                  </p>
                )}
              </div>
            </section>

            <section data-tour="admin-access-granted" className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Users With Access</h2>
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {accessUsers.length} total
                </span>
              </div>

              {accessUsers.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-950">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Access Ends
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Custom Expiry
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {accessUsers.map((user) => {
                        const normalizedPhone = normalizePhone(user.phone)
                        const removeKey = `remove:${normalizedPhone}`
                        const userName = getUserName(user)
                        const accessEndDate = formatAccessEnd(user)
                        const hasCustomExpiry = user.accessType === 'custom'

                        return (
                          <tr key={user._id}>
                            <td className="px-6 py-4 align-top">
                              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {userName || 'Unknown user'}
                              </span>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {user.phone}
                              </span>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                  {accessEndDate || 'N/A'}
                                </span>
                                {user.isAccessExpired ? (
                                  <span className="w-fit rounded-full bg-red-50 dark:bg-red-950/40 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">
                                    Expired
                                  </span>
                                ) : null}
                                {/* Which clock this row is on, so a date that does not match
                                    the course duration reads as deliberate rather than wrong. */}
                                {hasCustomExpiry ? (
                                  <span className="w-fit rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                                    Custom
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <button
                                type="button"
                                onClick={() => setExpiryPhone(normalizedPhone)}
                                disabled={Boolean(busyAccessKey)}
                                title="Custom Expiry"
                                aria-label={`Custom Expiry for ${userName || user.phone}`}
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600 ${
                                  hasCustomExpiry
                                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950/60'
                                    : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:text-indigo-300'
                                }`}
                              >
                                <CalendarClock className="h-4 w-4" />
                              </button>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => removeAccess(user.phone)}
                                  disabled={Boolean(busyAccessKey)}
                                  className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 transition hover:border-red-300 dark:hover:border-red-700 hover:bg-red-100 dark:hover:bg-red-950/60 disabled:cursor-not-allowed disabled:text-red-300 dark:disabled:text-red-500"
                                >
                                  {busyAccessKey === removeKey ? 'Removing...' : 'Remove'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                  No users have access to this course yet.
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {expiryUser ? (
        <AdminCustomExpiryModal
          key={expiryPhone}
          user={expiryUser}
          courseTitle={course?.title || ''}
          busy={busyAccessKey === `expiry:${expiryPhone}`}
          onSubmit={(expiresAt) => saveCustomExpiry(expiryPhone, expiresAt)}
          onClose={() => setExpiryPhone('')}
        />
      ) : null}
    </div>
  )
}

export default CourseAccessPage
