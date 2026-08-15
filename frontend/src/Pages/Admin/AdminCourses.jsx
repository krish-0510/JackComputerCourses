import axios from 'axios'
import { Plus, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import AdminCourseForm from '../../Components/Admin/AdminCourseForm'
import AdminCourseList from '../../Components/Admin/AdminCourseList'
import AdminNavbar from '../../Components/Admin/AdminNavbar'
import CourseCatalogControls from '../../Components/Common/CourseCatalogControls'
import PageBanner from '../../Components/Common/PageBanner'
import {
  defaultCourseCatalogFilters,
  getFilteredSortedCourses,
} from '../../Components/Common/courseCatalogFilters'
import PageTour from '../../Components/Tour/PageTour'
import adminCoursesPageTour from '../Tour/Admin/AdminCoursesPageTour'
import { useAuth } from '../../Context/AuthContext'
import { useConfirm } from '../../Context/ConfirmContext'
import { parseListInput, toListInput } from '../../utils/formFields'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const emptyCourseForm = {
  title: '',
  slug: '',
  duration: '',
  price: '',
  shortDescription: '',
  description: '',
  thumbnailUrl: '',
  category: '',
  level: '',
  language: '',
  tags: '',
  highlights: '',
  prerequisites: '',
  isPublished: false,
  isOpenToAll: false,
  showIde: false,
}

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const getCourseForm = (course) => ({
  title: course.title || '',
  slug: course.slug || '',
  duration: course.isOpenToAll ? '' : course.duration || '',
  price: Number.isFinite(Number(course.price)) ? String(course.price) : '',
  shortDescription: course.shortDescription || '',
  description: course.description || '',
  thumbnailUrl: course.thumbnailUrl || '',
  category: course.category || '',
  level: course.level || '',
  language: course.language || '',
  tags: toListInput(course.tags),
  highlights: toListInput(course.highlights),
  prerequisites: toListInput(course.prerequisites),
  isPublished: Boolean(course.isPublished),
  isOpenToAll: Boolean(course.isOpenToAll),
  showIde: Boolean(course.showIde),
})

const buildCoursePayload = (form, isEditing) => {
  const title = form.title.trim()
  const slug = form.slug.trim()
  const duration = form.duration.trim()
  const description = form.description.trim()
  const price = Number(form.price)
  const isOpenToAll = Boolean(form.isOpenToAll)

  if (!title) {
    return { error: 'Title is required.' }
  }

  if (isEditing && !slug) {
    return { error: 'Slug is required.' }
  }

  if (!isOpenToAll && !duration) {
    return { error: 'Duration is required.' }
  }

  if (!isOpenToAll) {
    const durationMonths = Number(duration)

    if (!Number.isFinite(durationMonths) || durationMonths <= 0) {
      return { error: 'Duration must be a positive number of months.' }
    }
  }

  if (!Number.isFinite(price) || price < 0) {
    return { error: 'Price must be a non-negative number.' }
  }

  if (!description) {
    return { error: 'Description is required.' }
  }

  const payload = {
    title,
    duration: isOpenToAll ? '' : String(Number(duration)),
    price,
    description,
    shortDescription: form.shortDescription.trim(),
    thumbnailUrl: form.thumbnailUrl.trim(),
    category: form.category.trim(),
    level: form.level.trim(),
    language: form.language.trim(),
    tags: parseListInput(form.tags),
    highlights: parseListInput(form.highlights),
    prerequisites: parseListInput(form.prerequisites),
    isPublished: Boolean(form.isPublished),
    isOpenToAll,
    showIde: Boolean(form.showIde),
  }

  if (slug) {
    payload.slug = slug
  }

  return { payload }
}

const AdminCourses = () => {
  const navigate = useNavigate()
  const { auth, clearAuth, setAuth } = useAuth()
  const confirm = useConfirm()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [courses, setCourses] = useState([])
  const [courseFilters, setCourseFilters] = useState(defaultCourseCatalogFilters)
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [courseForm, setCourseForm] = useState(emptyCourseForm)
  const [editingCourseId, setEditingCourseId] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingCourseId, setDeletingCourseId] = useState('')

  const filteredCourses = useMemo(
    () => getFilteredSortedCourses(courses, courseFilters),
    [courses, courseFilters],
  )
  const editingCourse = useMemo(
    () => courses.find((course) => course._id === editingCourseId) || null,
    [courses, editingCourseId],
  )

  const fetchCourses = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoadingCourses(true)
      setError('')
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/admin/courses`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to fetch courses')
      }

      if (shouldUpdate()) {
        setCourses(response.data?.data?.courses || [])
      }
    } catch (fetchError) {
      if (shouldUpdate()) {
        setError(getErrorMessage(fetchError, 'Unable to fetch courses. Please try again.'))
      }
    } finally {
      if (shouldUpdate()) {
        setLoadingCourses(false)
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
        await fetchCourses({ shouldUpdate: () => isActive })
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
  }, [clearAuth, fetchCourses, setAuth])

  const resetMessages = () => {
    setError('')
    setSuccess('')
  }

  const handleCourseFormChange = (event) => {
    const { checked, name, type, value } = event.target

    setCourseForm((currentForm) => ({
      ...currentForm,
      ...(name === 'isOpenToAll' && checked ? { duration: '' } : {}),
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const closeCourseForm = () => {
    setIsFormOpen(false)
    setEditingCourseId('')
    setCourseForm(emptyCourseForm)
    setFormError('')
  }

  const startCreatingCourse = () => {
    resetMessages()
    setFormError('')
    setEditingCourseId('')
    setCourseForm(emptyCourseForm)
    setIsFormOpen(true)
  }

  const startEditingCourse = (course) => {
    resetMessages()
    setFormError('')
    setEditingCourseId(course._id)
    setCourseForm(getCourseForm(course))
    setIsFormOpen(true)
  }

  const handleSaveCourse = async (event) => {
    event.preventDefault()
    resetMessages()
    setFormError('')

    const isEditing = Boolean(editingCourseId)
    const { error: payloadError, payload } = buildCoursePayload(courseForm, isEditing)

    if (payloadError) {
      setFormError(payloadError)
      return
    }

    setSaving(true)

    try {
      const response = isEditing
        ? await axios.patch(`${API_BASE_URL}/admin/courses/${editingCourseId}`, payload, {
          withCredentials: true,
        })
        : await axios.post(`${API_BASE_URL}/admin/courses`, payload, {
          withCredentials: true,
        })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to save course')
      }

      const savedCourse = response.data?.data?.course

      if (savedCourse) {
        setCourses((currentCourses) => {
          if (!isEditing) {
            return [savedCourse, ...currentCourses]
          }

          return currentCourses.map((course) => (
            course._id === editingCourseId
              ? {
                ...course,
                ...savedCourse,
                chapterCount: course.chapterCount,
                videoCount: course.videoCount,
              }
              : course
          ))
        })
      } else {
        await fetchCourses()
      }

      closeCourseForm()
      setSuccess(isEditing ? 'Course updated successfully.' : 'Course created successfully.')
    } catch (saveError) {
      setFormError(getErrorMessage(saveError, 'Unable to save course. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCourse = async (course) => {
    resetMessages()

    const confirmed = await confirm({
      title: 'Delete this course?',
      description: 'Every chapter inside it goes too, and the students enrolled in it lose the course along with their progress through it.',
      subject: course.title,
      confirmLabel: 'Delete course',
    })

    if (!confirmed) {
      return
    }

    setDeletingCourseId(course._id)

    try {
      const response = await axios.delete(`${API_BASE_URL}/admin/courses/${course._id}`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to delete course')
      }

      setCourses((currentCourses) => (
        currentCourses.filter((currentCourse) => currentCourse._id !== course._id)
      ))

      setSuccess('Course deleted successfully.')
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete course. Please try again.'))
    } finally {
      setDeletingCourseId('')
    }
  }

  const openCourse = (course) => {
    navigate(`/admin/courses/${course._id}`)
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
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              Admin Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Courses</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PageTour steps={adminCoursesPageTour} />

            <button
              type="button"
              data-tour="admin-course-refresh"
              onClick={fetchCourses}
              disabled={loadingCourses}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
            >
              <RefreshCw className={`h-4 w-4 ${loadingCourses ? 'animate-spin' : ''}`} aria-hidden="true" />
              {loadingCourses ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              data-tour="admin-course-new"
              onClick={startCreatingCourse}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Course
            </button>
          </div>
        </div>

        {error ? (
          <PageBanner tone="error" message={error} onDismiss={() => setError('')} className="mb-6" />
        ) : null}

        {success ? (
          <PageBanner tone="success" message={success} onDismiss={() => setSuccess('')} className="mb-6" />
        ) : null}

        {!loadingCourses && courses.length ? (
          <CourseCatalogControls
            courses={courses}
            filters={courseFilters}
            resultCount={filteredCourses.length}
            onFiltersChange={setCourseFilters}
          />
        ) : null}

        <AdminCourseList
          courses={filteredCourses}
          deletingCourseId={deletingCourseId}
          emptyMessage={courses.length ? 'No courses match your search or filters.' : 'No courses found.'}
          loadingCourses={loadingCourses}
          onDeleteCourse={handleDeleteCourse}
          onEditCourse={startEditingCourse}
          onOpenCourse={openCourse}
        />
      </main>

      {isFormOpen ? (
        <AdminCourseForm
          courseForm={courseForm}
          editingCourse={editingCourse}
          error={formError}
          saving={saving}
          onChange={handleCourseFormChange}
          onClose={closeCourseForm}
          onSubmit={handleSaveCourse}
        />
      ) : null}
    </div>
  )
}

export default AdminCourses
