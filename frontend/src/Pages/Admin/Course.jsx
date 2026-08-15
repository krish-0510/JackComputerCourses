import axios from 'axios'
import { ArrowLeft, FileText, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import AdminChapterDetail from '../../Components/Admin/AdminChapterDetail'
import AdminChapterForm from '../../Components/Admin/AdminChapterForm'
import AdminChapterList from '../../Components/Admin/AdminChapterList'
import AdminCourseSummary from '../../Components/Admin/AdminCourseSummary'
import AdminNavbar from '../../Components/Admin/AdminNavbar'
import PageBanner from '../../Components/Common/PageBanner'
import PageTour from '../../Components/Tour/PageTour'
import getAdminCoursePageTour from '../Tour/Admin/AdminCoursePageTour'
import { useAuth } from '../../Context/AuthContext'
import { useConfirm } from '../../Context/ConfirmContext'
import { sumChapterDurationSeconds } from '../../utils/courseDuration'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

// The page is pinned to the viewport, so every control on it is sized for a strip rather
// than for a column that could have gone on growing.
const HEADER_LINK_CLASS = 'inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:text-indigo-300'

const PANEL_CLASS = 'flex min-h-0 flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900'

const emptyChapterForm = {
  name: '',
  playlistUrl: '',
  order: '',
}

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const sortChapters = (chapters) => [...chapters].sort((first, second) => {
  const firstOrder = Number.isFinite(Number(first.order)) ? Number(first.order) : 0
  const secondOrder = Number.isFinite(Number(second.order)) ? Number(second.order) : 0

  if (firstOrder !== secondOrder) {
    return firstOrder - secondOrder
  }

  return new Date(first.createdAt || 0) - new Date(second.createdAt || 0)
})

const getVideoCount = (chapters) => chapters.reduce((total, chapter) => (
  total + (chapter.videos?.length || chapter.videoCount || 0)
), 0)

// The summary's totals are re-derived from the chapters the page already holds, so adding,
// deleting or re-syncing one moves them immediately instead of after another fetch.
const getCourseTotals = (chapters) => ({
  chapterCount: chapters.length,
  videoCount: getVideoCount(chapters),
  totalDurationSeconds: sumChapterDurationSeconds(chapters),
})

const getChapterForm = (chapter) => ({
  name: chapter.name || '',
  playlistUrl: chapter.playlistUrl || '',
  order: Number.isFinite(Number(chapter.order)) ? String(chapter.order) : '',
})

const parseChapterOrder = (value) => {
  const trimmedValue = String(value || '').trim()

  if (!trimmedValue) {
    return undefined
  }

  const order = Number(trimmedValue)

  if (!Number.isInteger(order) || order < 0) {
    return null
  }

  return order
}

const Course = () => {
  const { courseId } = useParams()
  const { auth, clearAuth, setAuth } = useAuth()
  const confirm = useConfirm()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [course, setCourse] = useState(null)
  const [chapters, setChapters] = useState([])
  const [loadingCourse, setLoadingCourse] = useState(true)
  const [chapterForm, setChapterForm] = useState(emptyChapterForm)
  const [editingChapterId, setEditingChapterId] = useState('')
  const [isChapterFormOpen, setIsChapterFormOpen] = useState(false)
  const [selectedChapterId, setSelectedChapterId] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [savingChapter, setSavingChapter] = useState(false)
  const [deletingChapterId, setDeletingChapterId] = useState('')
  const [syncingChapterId, setSyncingChapterId] = useState('')

  const editingChapter = useMemo(
    () => chapters.find((chapter) => chapter._id === editingChapterId) || null,
    [chapters, editingChapterId],
  )

  // Nothing is picked until somebody picks it: the course opens on the list of chapters
  // rather than on whichever one happens to be first. Reading the selection back out of the
  // list rather than keeping it in step by hand is also what empties the panel again when
  // the chapter it was showing is deleted.
  const selectedChapter = useMemo(
    () => chapters.find((chapter) => chapter._id === selectedChapterId) || null,
    [chapters, selectedChapterId],
  )

  // One request at a time against the chapters: whichever of them is mid-delete or mid-sync
  // holds the controls on the rest of them still until it comes back.
  const chapterActionsDisabled = Boolean(deletingChapterId) || Boolean(syncingChapterId)

  const setCourseAndChapters = useCallback((nextCourse, nextChapters) => {
    const sortedChapters = sortChapters(nextChapters || [])

    setCourse(nextCourse ? { ...nextCourse, ...getCourseTotals(sortedChapters) } : null)
    setChapters(sortedChapters)
  }, [])

  const updateChapters = useCallback((nextChapters) => {
    const sortedChapters = sortChapters(nextChapters)

    setChapters(sortedChapters)
    setCourse((currentCourse) => (currentCourse
      ? { ...currentCourse, ...getCourseTotals(sortedChapters) }
      : currentCourse))
  }, [])

  const fetchCourse = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoadingCourse(true)
      setError('')
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/admin/courses/${courseId}`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to fetch course')
      }

      if (shouldUpdate()) {
        setCourseAndChapters(
          response.data?.data?.course || null,
          response.data?.data?.chapters || [],
        )
      }
    } catch (fetchError) {
      if (shouldUpdate()) {
        setError(getErrorMessage(fetchError, 'Unable to fetch course. Please try again.'))
      }
    } finally {
      if (shouldUpdate()) {
        setLoadingCourse(false)
      }
    }
  }, [courseId, setCourseAndChapters])

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
        await fetchCourse({ shouldUpdate: () => isActive })
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
  }, [clearAuth, fetchCourse, setAuth])

  const resetMessages = () => {
    setError('')
    setSuccess('')
  }

  const handleChapterFormChange = (event) => {
    const { name, value } = event.target

    setChapterForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  // One dialog for both jobs: opening it with a chapter fills the fields from it, opening
  // it without one leaves them empty.
  const openChapterForm = (chapter) => {
    resetMessages()
    setFormError('')
    setEditingChapterId(chapter?._id || '')
    setChapterForm(chapter ? getChapterForm(chapter) : emptyChapterForm)
    setIsChapterFormOpen(true)
  }

  const closeChapterForm = () => {
    setIsChapterFormOpen(false)
    setEditingChapterId('')
    setChapterForm(emptyChapterForm)
    setFormError('')
  }

  const handleSaveChapter = async (event) => {
    event.preventDefault()
    setFormError('')

    const name = chapterForm.name.trim()
    const playlistUrl = chapterForm.playlistUrl.trim()
    const order = parseChapterOrder(chapterForm.order)

    if (!name) {
      setFormError('Chapter name is required.')
      return
    }

    if (!playlistUrl) {
      setFormError('YouTube playlist link is required.')
      return
    }

    if (order === null) {
      setFormError('Chapter order must be a non-negative integer.')
      return
    }

    const payload = { name, playlistUrl }

    if (order !== undefined) {
      payload.order = order
    }

    const isEditing = Boolean(editingChapterId)
    setSavingChapter(true)

    try {
      const response = isEditing
        ? await axios.patch(
          `${API_BASE_URL}/admin/courses/${courseId}/chapters/${editingChapterId}`,
          payload,
          { withCredentials: true },
        )
        : await axios.post(`${API_BASE_URL}/admin/courses/${courseId}/chapters`, payload, {
          withCredentials: true,
        })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to save chapter')
      }

      const savedChapter = response.data?.data?.chapter

      if (savedChapter) {
        updateChapters(isEditing
          ? chapters.map((chapter) => (
            chapter._id === editingChapterId ? savedChapter : chapter
          ))
          : [...chapters, savedChapter])

        // A new chapter is what the dialog closes onto, wherever in the order it landed.
        // An edit is not: renaming one from the rail should not pull the panel off
        // whichever chapter was open behind the dialog.
        if (!isEditing) {
          setSelectedChapterId(savedChapter._id)
        }
      } else {
        await fetchCourse()
      }

      closeChapterForm()
      setSuccess(isEditing ? 'Chapter updated successfully.' : 'Chapter created successfully.')
    } catch (saveError) {
      setFormError(getErrorMessage(saveError, 'Unable to save chapter. Please try again.'))
    } finally {
      setSavingChapter(false)
    }
  }

  const handleDeleteChapter = async (chapter) => {
    resetMessages()

    const confirmed = await confirm({
      title: 'Delete this chapter?',
      description: 'The chapter leaves the course for everyone enrolled in it, and the progress recorded against it goes with it.',
      subject: chapter.name,
      confirmLabel: 'Delete chapter',
    })

    if (!confirmed) {
      return
    }

    setDeletingChapterId(chapter._id)

    try {
      const response = await axios.delete(
        `${API_BASE_URL}/admin/courses/${courseId}/chapters/${chapter._id}`,
        { withCredentials: true },
      )

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to delete chapter')
      }

      updateChapters(chapters.filter((currentChapter) => currentChapter._id !== chapter._id))
      setSuccess('Chapter deleted successfully.')
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete chapter. Please try again.'))
    } finally {
      setDeletingChapterId('')
    }
  }

  const handleSyncChapter = async (chapter) => {
    resetMessages()
    setSyncingChapterId(chapter._id)

    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/courses/${courseId}/chapters/${chapter._id}/sync-videos`,
        {},
        { withCredentials: true },
      )

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to sync videos')
      }

      const syncedChapter = response.data?.data?.chapter

      if (syncedChapter) {
        updateChapters(chapters.map((currentChapter) => (
          currentChapter._id === chapter._id ? syncedChapter : currentChapter
        )))
      } else {
        await fetchCourse()
      }

      setSuccess('Chapter videos synced successfully.')
    } catch (syncError) {
      setError(getErrorMessage(syncError, 'Unable to sync chapter videos. Please try again.'))
    } finally {
      setSyncingChapterId('')
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

  const backToCourses = (
    <Link to="/admin/courses" className={HEADER_LINK_CLASS}>
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      Back to courses
    </Link>
  )

  return (
    // The page itself never scrolls: it is pinned to the viewport, and the chapter rail and
    // the panel beside it take their own scrollbars.
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      <AdminNavbar />

      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
        {loadingCourse ? (
          <div className={PANEL_CLASS}>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading course...</p>
          </div>
        ) : course ? (
          <>
            <AdminCourseSummary course={course}>
              {backToCourses}

              {!course.isOpenToAll ? (
                <Link
                  to={`/admin/courses/${courseId}/access`}
                  data-tour="admin-course-access"
                  className={HEADER_LINK_CLASS}
                >
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  User Access
                </Link>
              ) : null}

              <Link
                to={`/admin/courses/${courseId}/notes`}
                data-tour="admin-course-notes"
                className={HEADER_LINK_CLASS}
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                Manage Notes
              </Link>

              {/* Which stops the walkthrough has depends on whether this course is open
                  to all, so it is only built once the course has been read. */}
              <PageTour
                className={HEADER_LINK_CLASS}
                steps={getAdminCoursePageTour({ canManageAccess: !course.isOpenToAll })}
              />
            </AdminCourseSummary>

            {error ? (
              <PageBanner tone="error" message={error} onDismiss={() => setError('')} className="shrink-0" />
            ) : null}

            {success ? (
              <PageBanner tone="success" message={success} onDismiss={() => setSuccess('')} className="shrink-0" />
            ) : null}

            {/* Below a large screen the two panels stack and this grid takes the scrollbar,
                so the page behind it still never grows one. */}
            <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:overflow-hidden">
              <AdminChapterList
                chapters={chapters}
                actionsDisabled={chapterActionsDisabled}
                deletingChapterId={deletingChapterId}
                selectedChapterId={selectedChapterId}
                onCreateChapter={() => openChapterForm(null)}
                onDeleteChapter={handleDeleteChapter}
                onEditChapter={openChapterForm}
                onSelectChapter={setSelectedChapterId}
              />

              <AdminChapterDetail
                chapter={selectedChapter}
                hasChapters={chapters.length > 0}
                isSyncing={syncingChapterId === selectedChapter?._id}
                actionsDisabled={chapterActionsDisabled}
                onSyncChapter={handleSyncChapter}
              />
            </div>
          </>
        ) : (
          <div className={PANEL_CLASS}>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {error || 'Course not found.'}
            </p>
            {backToCourses}
          </div>
        )}
      </main>

      {isChapterFormOpen ? (
        <AdminChapterForm
          chapterForm={chapterForm}
          editingChapter={editingChapter}
          error={formError}
          savingChapter={savingChapter}
          onChange={handleChapterFormChange}
          onClose={closeChapterForm}
          onSubmit={handleSaveChapter}
        />
      ) : null}
    </div>
  )
}

export default Course
