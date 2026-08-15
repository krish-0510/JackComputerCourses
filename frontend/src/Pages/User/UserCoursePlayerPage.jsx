import axios from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import CourseExpiryNotice from '../../Components/Common/CourseExpiryNotice'
import ThemeToggle from '../../Components/Common/ThemeToggle'
import PageTour from '../../Components/Tour/PageTour'
import UserCodePlayground from '../../Components/User/UserCodePlayground'
import UserCourseSidebar from '../../Components/User/UserCourseSidebar'
import UserVideoPlayer from '../../Components/User/UserVideoPlayer'
import getUserCoursePlayerPageTour from '../Tour/User/UserCoursePlayerPageTour'
import { useAuth } from '../../Context/AuthContext'
import { resolveInitialVideoKey, saveLastWatchedVideo } from '../../utils/courseProgress'
import { formatAccessEnd, getCourseExpiryWarning } from '../../utils/courseAccess'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const isAuthError = (error) => [401].includes(error?.response?.status)

const getPlayableVideos = (chapters) => (
  chapters.flatMap((chapter) => (
    (chapter.videos || []).map((video) => ({
      key: video.id,
      chapter,
      video,
    }))
  ))
)

const getAccessText = (course) => {
  if (!course) {
    return ''
  }

  if (course.isOpenToAll) {
    return 'Open to all'
  }

  const accessEndDate = formatAccessEnd(course)

  return accessEndDate ? `Access ends ${accessEndDate}` : ''
}

const UserCoursePlayerPage = () => {
  const { courseId } = useParams()
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [course, setCourse] = useState(null)
  const [chapters, setChapters] = useState([])
  const [loadingCourse, setLoadingCourse] = useState(true)
  const [error, setError] = useState('')
  const [selectedVideoKey, setSelectedVideoKey] = useState('')
  const [shouldAutoplay, setShouldAutoplay] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)
  const [isCodeSidebarCollapsed, setIsCodeSidebarCollapsed] = useState(true)
  const [ideWidth, setIdeWidth] = useState(480)
  const [isDragging, setIsDragging] = useState(false)
  const savedVideoKeyRef = useRef('')

  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      const containerElement = document.getElementById('workspace-container')
      if (containerElement) {
        const rect = containerElement.getBoundingClientRect()
        const newWidth = rect.right - e.clientX
        if (newWidth > 320 && newWidth < rect.width - 400) {
          setIdeWidth(newWidth)
        }
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging])

  const playableVideos = useMemo(() => getPlayableVideos(chapters), [chapters])
  const selectedVideo = useMemo(() => (
    playableVideos.find((videoItem) => videoItem.key === selectedVideoKey) || null
  ), [playableVideos, selectedVideoKey])
  const accessText = getAccessText(course)
  const expiryWarning = useMemo(() => getCourseExpiryWarning(course), [course])

  const handleSelectVideo = useCallback((videoKey) => {
    setShouldAutoplay(false)
    setSelectedVideoKey(videoKey)
  }, [])

  // Videos are flattened in chapter order, so the next entry is the next lesson,
  // the first lesson of the next chapter, or the very first lesson once the course ends.
  const handleVideoEnded = useCallback((endedVideoKey) => {
    if (playableVideos.length < 2) {
      return
    }

    const endedIndex = playableVideos.findIndex((videoItem) => videoItem.key === endedVideoKey)

    if (endedIndex < 0) {
      return
    }

    setShouldAutoplay(true)
    setSelectedVideoKey(playableVideos[(endedIndex + 1) % playableVideos.length].key)
  }, [playableVideos])

  const fetchCourse = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoadingCourse(true)
      setError('')
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/user/courses/${courseId}`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to fetch course')
      }

      if (shouldUpdate()) {
        const nextCourse = response.data?.data?.course || null
        const nextChapters = response.data?.data?.chapters || []
        const lastWatchedVideoKey = response.data?.data?.lastWatchedVideoKey || ''
        const nextPlayableVideos = getPlayableVideos(nextChapters)

        // The stored resume point is already persisted, so opening it must not save again.
        savedVideoKeyRef.current = lastWatchedVideoKey

        setCourse(nextCourse)
        setChapters(nextChapters)
        setSelectedVideoKey((currentVideoKey) => (
          resolveInitialVideoKey(nextPlayableVideos, currentVideoKey, lastWatchedVideoKey)
        ))
      }
    } catch (fetchError) {
      if (!shouldUpdate()) {
        return
      }

      if (isAuthError(fetchError)) {
        clearAuth()
        setIsAuthorized(false)
        return
      }

      setCourse(null)
      setChapters([])
      setError(getErrorMessage(fetchError, 'Unable to load this course. Please try again.'))
    } finally {
      if (shouldUpdate()) {
        setLoadingCourse(false)
      }
    }
  }, [clearAuth, courseId])

  useEffect(() => {
    let isActive = true

    const verifyUserAndFetchCourse = async () => {
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
        setIsAuthorized(true)
        setCheckingAuth(false)
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

    verifyUserAndFetchCourse()

    return () => {
      isActive = false
    }
  }, [clearAuth, fetchCourse, setAuth])

  useEffect(() => {
    if (!isAuthorized || !selectedVideoKey || selectedVideoKey === savedVideoKeyRef.current) {
      return
    }

    savedVideoKeyRef.current = selectedVideoKey
    saveLastWatchedVideo('user', courseId, selectedVideoKey)
  }, [courseId, isAuthorized, selectedVideoKey])

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
    <div className="min-h-screen bg-slate-50 font-sans dark:bg-slate-950 lg:h-screen lg:overflow-hidden">
      <main className="mx-auto flex min-h-screen max-w-450 flex-col px-4 py-4 sm:px-5 lg:h-full lg:min-h-0 lg:overflow-hidden lg:px-6">
        <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Course Player
            </p>
            <h1 className="mt-1 truncate text-2xl font-bold text-slate-900 dark:text-slate-100">
              {course?.title || 'Loading course...'}
            </h1>
            {accessText ? (
              <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{accessText}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <PageTour
              steps={getUserCoursePlayerPageTour({
                hasIde: Boolean(course?.showIde),
                openChapters: () => setIsSidebarCollapsed(false),
                openPlayground: () => setIsCodeSidebarCollapsed(false),
              })}
            />
            <ThemeToggle />
            <Link
              to="/user/courses"
              data-tour="course-back"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-700 dark:hover:text-blue-300"
            >
              My Courses
            </Link>
          </div>
        </div>

        {/* Said once, above the player: someone part-way through a course is the person
            with the most to lose from access closing and the least reason to be reading
            the date under the title. */}
        <CourseExpiryNotice warning={expiryWarning} className="mb-4 shrink-0" />

        {error ? (
          <section className="min-h-0 flex-1 rounded-lg border border-red-200 bg-red-50 px-6 py-10 text-center shadow-sm dark:border-red-900/60 dark:bg-red-950/40">
            <h2 className="text-lg font-bold text-red-800 dark:text-red-200">Course unavailable</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-red-700 dark:text-red-300">
              {error}
            </p>
            <button
              type="button"
              onClick={() => fetchCourse()}
              disabled={loadingCourse}
              className="mt-5 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {loadingCourse ? 'Retrying...' : 'Retry'}
            </button>
          </section>
        ) : loadingCourse ? (
          <section className="min-h-0 flex-1 rounded-lg border border-slate-200 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading course player...</p>
          </section>
        ) : (
          <div className={`grid flex-1 gap-4 lg:min-h-0 ${
            isSidebarCollapsed
              ? 'lg:grid-cols-[80px_minmax(0,1fr)]'
              : 'lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]'
          }`}
          >
            <div className="order-2 min-h-0 lg:order-1">
              <UserCourseSidebar
                chapters={chapters}
                selectedVideoKey={selectedVideoKey}
                onSelectVideo={handleSelectVideo}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed((currentValue) => !currentValue)}
              />
            </div>

            {/* Resizable main workspace (Video Player + Monaco IDE Sidebar) */}
            <div 
              id="workspace-container"
              className="relative order-1 flex min-w-0 flex-col gap-4 overflow-visible lg:order-2 lg:min-h-0 lg:overflow-hidden xl:flex-row"
            >
              <UserVideoPlayer
                course={course}
                selectedVideo={selectedVideo}
                shouldAutoplay={shouldAutoplay}
                onVideoEnded={handleVideoEnded}
                className="min-h-90 min-w-0 sm:min-h-110 lg:min-h-0 lg:flex-1 xl:min-h-0"
              />

              {course?.showIde && !isCodeSidebarCollapsed && (
                <div
                  onMouseDown={handleMouseDown}
                  className={`hidden xl:block w-1.5 hover:w-2 hover:bg-blue-500 cursor-col-resize select-none self-stretch transition-all duration-150 rounded ${
                    isDragging ? 'bg-blue-600 w-2' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}

              {course?.showIde && (
                <div 
                  className="hidden min-h-0 shrink-0 lg:block"
                  style={isCodeSidebarCollapsed ? { width: '72px' } : { width: `${ideWidth}px` }}
                >
                  <UserCodePlayground
                    courseId={courseId}
                    selectedVideoKey={selectedVideoKey}
                    isCollapsed={isCodeSidebarCollapsed}
                    onToggleCollapse={() => setIsCodeSidebarCollapsed((currentValue) => !currentValue)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default UserCoursePlayerPage
