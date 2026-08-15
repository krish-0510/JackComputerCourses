import axios from 'axios'
import { BookOpen, CalendarCheck, ChevronDown, CircleUser, History, Pencil, ShieldBan, ShieldCheck, Sheet, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AdminBulkImportUsers from '../../Components/Admin/AdminBulkImportUsers'
import AdminNavbar from '../../Components/Admin/AdminNavbar'
import AdminPasswordRequests from '../../Components/Admin/AdminPasswordRequests'
import AdminUserAttendance from '../../Components/Admin/AdminUserAttendance'
import AdminUserCourses from '../../Components/Admin/AdminUserCourses'
import AdminUserLogHistory from '../../Components/Admin/AdminUserLogHistory'
import AdminUserProfile from '../../Components/Admin/AdminUserProfile'
import ActionMenu from '../../Components/Common/ActionMenu'
import PasswordInput from '../../Components/Common/PasswordInput'
import UserStatusBadge from '../../Components/Common/UserStatusBadge'
import UserStatusFilter from '../../Components/Common/UserStatusFilter'
import { countUsersByStatus, filterUsersByStatus } from '../../Components/Common/userStatus'
import PageTour from '../../Components/Tour/PageTour'
import getAdminUsersPageTour from '../Tour/Admin/AdminUsersPageTour'
import { useAuth } from '../../Context/AuthContext'
import { useConfirm } from '../../Context/ConfirmContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const emptyForm = {
  firstName: '',
  lastName: '',
  phone: '',
  password: '',
}

// The two panels share the column, so only one of them is ever expanded.
const USER_FORM_PANEL = 'userForm'
const REQUESTS_PANEL = 'requests'

const inputClassName = 'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 disabled:bg-slate-100 dark:disabled:bg-slate-800'

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const getUserName = (user) => String(user?.name || '').trim()

// Names are stored combined, so editing splits them back into the two inputs.
const splitUserName = (user) => {
  const [firstName = '', ...restOfName] = getUserName(user).split(/\s+/).filter(Boolean)

  return {
    firstName,
    lastName: restOfName.join(' '),
  }
}

// Accounts that are still enrolled lead the table, so the two standings read apart
// before any tab is picked; names order each block as they always did.
const sortUsers = (first, second) => {
  const statusComparison = Number(Boolean(second.isActive)) - Number(Boolean(first.isActive))
  const nameComparison = getUserName(first).localeCompare(getUserName(second))

  return statusComparison || nameComparison || first.phone.localeCompare(second.phone)
}

const AdminAllUsers = () => {
  const { auth, clearAuth, setAuth } = useAuth()
  const confirm = useConfirm()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingUserId, setEditingUserId] = useState('')
  const [editingForm, setEditingForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  // The row the table is working on — deleting it or blocking it. One id, because both
  // run off the same row menu and the table is only ever busy with one of them.
  const [pendingUserId, setPendingUserId] = useState('')
  const [historyUser, setHistoryUser] = useState(null)
  const [attendanceUser, setAttendanceUser] = useState(null)
  const [coursesUser, setCoursesUser] = useState(null)
  const [profileUser, setProfileUser] = useState(null)
  const [openPanel, setOpenPanel] = useState(USER_FORM_PANEL)
  const [statusFilter, setStatusFilter] = useState('all')
  const [bulkImportOpen, setBulkImportOpen] = useState(false)

  const isUserFormOpen = openPanel === USER_FORM_PANEL

  const sortedUsers = useMemo(
    () => [...users].sort(sortUsers),
    [users],
  )
  // The tabs count the whole list, so a tab always names how many rows it would show.
  const statusCounts = useMemo(() => countUsersByStatus(users), [users])
  const visibleUsers = useMemo(
    () => filterUsersByStatus(sortedUsers, statusFilter),
    [sortedUsers, statusFilter],
  )
  const editingUser = useMemo(
    () => users.find((user) => user._id === editingUserId) || null,
    [editingUserId, users],
  )

  const fetchUsers = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoadingUsers(true)
      setError('')
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to fetch users')
      }

      if (shouldUpdate()) {
        setUsers(response.data?.data?.users || [])
      }
    } catch (fetchError) {
      if (shouldUpdate()) {
        setError(getErrorMessage(fetchError, 'Unable to fetch users. Please try again.'))
      }
    } finally {
      if (shouldUpdate()) {
        setLoadingUsers(false)
      }
    }
  }, [])

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
        await fetchUsers({ shouldUpdate: () => isActive })
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
  }, [clearAuth, fetchUsers, setAuth])

  const handleFormChange = (event) => {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const handleEditingFormChange = (event) => {
    const { name, value } = event.target

    setEditingForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const resetMessages = () => {
    setError('')
    setSuccess('')
  }

  // Opening either panel closes the other, and clicking the open one folds it away.
  const togglePanel = (panel) => {
    setOpenPanel((currentPanel) => (currentPanel === panel ? '' : panel))
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()
    resetMessages()

    const phone = form.phone.trim()
    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()

    if (!firstName || !lastName || !phone || !form.password) {
      setError('First name, last name, phone and password are required.')
      return
    }

    setSaving(true)

    try {
      const response = await axios.post(`${API_BASE_URL}/admin/users`, {
        firstName,
        lastName,
        phone,
        password: form.password,
      }, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to create user')
      }

      const createdUser = response.data?.data?.user

      if (createdUser) {
        setUsers((currentUsers) => [...currentUsers, createdUser])
      } else {
        await fetchUsers()
      }

      setForm(emptyForm)
      setSuccess('User created successfully.')
    } catch (createError) {
      setError(getErrorMessage(createError, 'Unable to create user. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const startEditingUser = (user) => {
    resetMessages()
    // Editing from the table has to reveal the form, whichever panel was open.
    setOpenPanel(USER_FORM_PANEL)
    setEditingUserId(user._id)
    setEditingForm({
      ...splitUserName(user),
      phone: user.phone,
      password: '',
    })
  }

  const cancelEditingUser = () => {
    setEditingUserId('')
    setEditingForm(emptyForm)
  }

  // A row is replaced by the account the server sent back rather than by what was typed,
  // so the standings it carries stay the server's to decide. A response without one falls
  // back to re-reading the table.
  const applyUpdatedUser = async (userId, updatedUser) => {
    if (!updatedUser) {
      await fetchUsers()
      return
    }

    setUsers((currentUsers) => currentUsers.map((user) => (
      user._id === userId ? updatedUser : user
    )))
  }

  const handleUpdateUser = async (event) => {
    event.preventDefault()
    resetMessages()

    const phone = editingForm.phone.trim()
    const firstName = editingForm.firstName.trim()
    const lastName = editingForm.lastName.trim()

    if (!firstName || !lastName || !phone) {
      setError('First name, last name and phone are required.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        firstName,
        lastName,
        phone,
      }

      if (editingForm.password) {
        payload.password = editingForm.password
      }

      const response = await axios.patch(`${API_BASE_URL}/admin/users/${editingUserId}`, payload, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to update user')
      }

      await applyUpdatedUser(editingUserId, response.data?.data?.user)

      cancelEditingUser()
      setSuccess('User updated successfully.')
    } catch (updateError) {
      setError(getErrorMessage(updateError, 'Unable to update user. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  // The sheet has already been answered row by row inside the modal, so the page only
  // takes the accounts that were made and leaves the modal to explain the rest.
  const handleUsersImported = (importedUsers) => {
    if (!importedUsers.length) {
      return
    }

    setUsers((currentUsers) => [...currentUsers, ...importedUsers])
    setError('')
    setSuccess(`${importedUsers.length} user${importedUsers.length === 1 ? '' : 's'} imported successfully.`)
  }

  // Blocking is the answer to a student who should not be in the app for a while but whose
  // work is not in question, so it is asked for the way deleting is and says plainly what
  // it does and does not touch. It is reversible from the same menu.
  const handleToggleUserBan = async (user) => {
    resetMessages()

    const isBlocking = !user.isBanned
    const confirmed = await confirm({
      title: isBlocking ? 'Block this student?' : 'Unblock this student?',
      description: isBlocking
        ? 'They are signed out at once and cannot log in again until you unblock them. Their courses, attendance and work are all kept.'
        : 'They can log in again from their next attempt. Nothing else about the account changes.',
      subject: [getUserName(user), user.phone].filter(Boolean).join(' · '),
      confirmLabel: isBlocking ? 'Block student' : 'Unblock student',
      tone: isBlocking ? 'danger' : 'info',
      icon: isBlocking ? ShieldBan : ShieldCheck,
    })

    if (!confirmed) {
      return
    }

    setPendingUserId(user._id)

    try {
      const response = await axios.patch(`${API_BASE_URL}/admin/users/${user._id}`, {
        isBanned: isBlocking,
      }, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to update user')
      }

      await applyUpdatedUser(user._id, response.data?.data?.user)
      setSuccess(`User ${isBlocking ? 'blocked' : 'unblocked'} successfully.`)
    } catch (banError) {
      setError(getErrorMessage(banError, `Unable to ${isBlocking ? 'block' : 'unblock'} user. Please try again.`))
    } finally {
      setPendingUserId('')
    }
  }

  const handleDeleteUser = async (user) => {
    resetMessages()

    const confirmed = await confirm({
      title: 'Delete this student?',
      description: 'Their enrolments, attendance and workspaces are removed with the account, and none of it can be brought back.',
      subject: [getUserName(user), user.phone].filter(Boolean).join(' · '),
      confirmLabel: 'Delete student',
    })

    if (!confirmed) {
      return
    }

    setPendingUserId(user._id)

    try {
      const response = await axios.delete(`${API_BASE_URL}/admin/users/${user._id}`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to delete user')
      }

      setUsers((currentUsers) => currentUsers.filter((currentUser) => currentUser._id !== user._id))
      if (editingUserId === user._id) {
        cancelEditingUser()
      }
      setSuccess('User deleted successfully.')
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete user. Please try again.'))
    } finally {
      setPendingUserId('')
    }
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
    // The page itself never scrolls: it is pinned to the viewport and the two
    // columns below take their own scrollbars.
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      <AdminNavbar />

      <main className="mx-auto flex w-full min-h-0 max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              Admin Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">All Users</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PageTour
              steps={getAdminUsersPageTour({
                openUserForm: () => setOpenPanel(USER_FORM_PANEL),
                openRequests: () => setOpenPanel(REQUESTS_PANEL),
              })}
            />

            <button
              type="button"
              onClick={fetchUsers}
              disabled={loadingUsers}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
            >
              {loadingUsers ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto lg:grid-cols-[minmax(0,380px)_1fr] lg:overflow-hidden">
          <div className="flex min-h-0 flex-col gap-4 lg:overflow-y-auto">
            <section data-tour="admin-user-form" className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${isUserFormOpen ? 'min-h-0 flex-1' : ''}`}>
              <button
                type="button"
                onClick={() => togglePanel(USER_FORM_PANEL)}
                aria-expanded={isUserFormOpen}
                className="flex shrink-0 items-start justify-between gap-3 px-6 py-5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {editingUser ? 'Edit User' : 'Create User'}
                  </h2>
                  {editingUser ? (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {getUserName(editingUser) || editingUser.phone}
                    </p>
                  ) : null}
                </div>
                <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${isUserFormOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserFormOpen ? (
                <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-200 dark:border-slate-800 px-6 py-5">
                  {editingUser ? (
                    <form onSubmit={handleUpdateUser} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="edit-first-name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                            First Name
                          </label>
                          <input
                            id="edit-first-name"
                            name="firstName"
                            type="text"
                            value={editingForm.firstName}
                            onChange={handleEditingFormChange}
                            disabled={saving}
                            className={`mt-2 ${inputClassName}`}
                            placeholder="Enter first name"
                          />
                        </div>

                        <div>
                          <label htmlFor="edit-last-name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                            Last Name
                          </label>
                          <input
                            id="edit-last-name"
                            name="lastName"
                            type="text"
                            value={editingForm.lastName}
                            onChange={handleEditingFormChange}
                            disabled={saving}
                            className={`mt-2 ${inputClassName}`}
                            placeholder="Enter last name"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="edit-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                          Phone
                        </label>
                        <input
                          id="edit-phone"
                          name="phone"
                          type="tel"
                          value={editingForm.phone}
                          onChange={handleEditingFormChange}
                          disabled={saving}
                          className={`mt-2 ${inputClassName}`}
                          placeholder="Enter phone number"
                        />
                      </div>

                      <div>
                        <label htmlFor="edit-password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                          New Password
                        </label>
                        <PasswordInput
                          id="edit-password"
                          name="password"
                          value={editingForm.password}
                          onChange={handleEditingFormChange}
                          disabled={saving}
                          className={inputClassName}
                          placeholder="Leave blank to keep current password"
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={saving}
                          className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-700"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingUser}
                          disabled={saving}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-slate-400 dark:hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor="create-first-name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                            First Name
                          </label>
                          <input
                            id="create-first-name"
                            name="firstName"
                            type="text"
                            value={form.firstName}
                            onChange={handleFormChange}
                            disabled={saving}
                            className={`mt-2 ${inputClassName}`}
                            placeholder="Enter first name"
                          />
                        </div>

                        <div>
                          <label htmlFor="create-last-name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                            Last Name
                          </label>
                          <input
                            id="create-last-name"
                            name="lastName"
                            type="text"
                            value={form.lastName}
                            onChange={handleFormChange}
                            disabled={saving}
                            className={`mt-2 ${inputClassName}`}
                            placeholder="Enter last name"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="create-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                          Phone
                        </label>
                        <input
                          id="create-phone"
                          name="phone"
                          type="tel"
                          value={form.phone}
                          onChange={handleFormChange}
                          disabled={saving}
                          className={`mt-2 ${inputClassName}`}
                          placeholder="Enter phone number"
                        />
                      </div>

                      <div>
                        <label htmlFor="create-password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                          Password
                        </label>
                        <PasswordInput
                          id="create-password"
                          name="password"
                          value={form.password}
                          onChange={handleFormChange}
                          disabled={saving}
                          className={inputClassName}
                          placeholder="Enter password"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={saving}
                        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                      >
                        {saving ? 'Creating...' : 'Create User'}
                      </button>

                      {/* The same account, a sheet at a time. It sits under the form
                          rather than beside it, so one account stays the ordinary way
                          to add one and the sheet is the answer to a whole intake. */}
                      <button
                        type="button"
                        data-tour="admin-bulk-import"
                        onClick={() => {
                          resetMessages()
                          setBulkImportOpen(true)
                        }}
                        disabled={saving}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:text-indigo-300 dark:disabled:text-slate-600"
                      >
                        <Sheet className="h-4 w-4" />
                        Bulk Import Users
                      </button>
                    </form>
                  )}
                </div>
              ) : null}
            </section>

            <AdminPasswordRequests
              isOpen={openPanel === REQUESTS_PANEL}
              onToggle={() => togglePanel(REQUESTS_PANEL)}
              onUserChanged={fetchUsers}
            />

            {/* Kept outside both panels so a message never hides with the panel that raised it. */}
            {error ? (
              <p className="shrink-0 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="shrink-0 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {success}
              </p>
            ) : null}
          </div>

          <section data-tour="admin-user-table" className="flex flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm lg:min-h-0">
            <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 dark:border-slate-800 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Users</h2>
              <div className="sm:w-80">
                <UserStatusFilter
                  value={statusFilter}
                  counts={statusCounts}
                  onChange={setStatusFilter}
                  label="Filter users by enrolment standing"
                />
              </div>
            </div>

            {loadingUsers ? (
              <div className="px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                Loading users...
              </div>
            ) : visibleUsers.length ? (
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Standing
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {visibleUsers.map((user, index) => {
                      const isEditing = editingUserId === user._id
                      const isPending = pendingUserId === user._id
                      const userName = getUserName(user)

                      return (
                        <tr key={user._id} className={isEditing ? 'bg-indigo-50/40 dark:bg-indigo-950/30' : undefined}>
                          <td className="px-6 py-4 align-top">
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {userName || 'Unnamed user'}
                            </span>
                            {isEditing ? (
                              <span className="ml-3 rounded-full bg-indigo-100 dark:bg-indigo-950/50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                Editing
                              </span>
                            ) : null}
                          </td>
                          <td className="px-6 py-4 align-top">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {user.phone}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <UserStatusBadge user={user} />
                          </td>
                          <td className="px-6 py-4 align-top">
                            {/* Only the first row is marked: the walkthrough points at
                                one set of these, not at every row it can see. */}
                            <div
                              data-tour={index ? undefined : 'admin-user-actions'}
                              className="flex items-center justify-end gap-2"
                            >
                              <button
                                type="button"
                                onClick={() => setProfileUser(user)}
                                title={`View profile of ${userName || user.phone}`}
                                aria-label={`View profile of ${userName || user.phone}`}
                                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300"
                              >
                                <CircleUser className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setAttendanceUser(user)}
                                title={`View attendance of ${userName || user.phone}`}
                                aria-label={`View attendance of ${userName || user.phone}`}
                                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300"
                              >
                                <CalendarCheck className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setCoursesUser(user)}
                                title={`View courses of ${userName || user.phone}`}
                                aria-label={`View courses of ${userName || user.phone}`}
                                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300"
                              >
                                <BookOpen className="h-4 w-4" />
                              </button>
                              <ActionMenu
                                label={`Settings for ${userName || user.phone}`}
                                busy={isPending}
                                disabled={saving || Boolean(pendingUserId)}
                                actions={[
                                  {
                                    key: 'history',
                                    label: 'Login history',
                                    icon: History,
                                    onClick: () => setHistoryUser(user),
                                  },
                                  {
                                    key: 'edit',
                                    label: 'Edit user',
                                    icon: Pencil,
                                    onClick: () => startEditingUser(user),
                                  },
                                  {
                                    key: 'ban',
                                    label: user.isBanned ? 'Unblock user' : 'Block user',
                                    icon: user.isBanned ? ShieldCheck : ShieldBan,
                                    danger: !user.isBanned,
                                    onClick: () => handleToggleUserBan(user),
                                  },
                                  {
                                    key: 'delete',
                                    label: 'Delete user',
                                    icon: Trash2,
                                    danger: true,
                                    onClick: () => handleDeleteUser(user),
                                  },
                                ]}
                              />
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
                {users.length ? 'No users have this standing.' : 'No users found.'}
              </div>
            )}
          </section>
        </div>
      </main>

      {historyUser ? (
        <AdminUserLogHistory user={historyUser} onClose={() => setHistoryUser(null)} />
      ) : null}

      {attendanceUser ? (
        <AdminUserAttendance user={attendanceUser} onClose={() => setAttendanceUser(null)} />
      ) : null}

      {coursesUser ? (
        <AdminUserCourses user={coursesUser} onClose={() => setCoursesUser(null)} />
      ) : null}

      {profileUser ? (
        <AdminUserProfile user={profileUser} onClose={() => setProfileUser(null)} />
      ) : null}

      {bulkImportOpen ? (
        <AdminBulkImportUsers
          onClose={() => setBulkImportOpen(false)}
          onImported={handleUsersImported}
        />
      ) : null}
    </div>
  )
}

export default AdminAllUsers
