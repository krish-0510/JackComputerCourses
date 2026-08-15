import axios from 'axios'
import { Globe, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import ContentCard from '../../Components/Common/ContentCard'
import ContentDetailModal from '../../Components/Common/ContentDetailModal'
import FacultyNavbar from '../../Components/Faculty/FacultyNavbar'
import PageBanner from '../../Components/Common/PageBanner'
import PageTour from '../../Components/Tour/PageTour'
import facultyContentsPageTour from '../Tour/Faculty/FacultyContentsPageTour'
import { useAuth } from '../../Context/AuthContext'
import { FACULTY_CONTENTS_URL } from '../../utils/content'

// A faculty has nothing to do about a course but answer for it, so where a visitor is
// handed two ways of asking, they are told the one thing the sheet cannot otherwise
// say: whether the person in front of them could have read this on the website.
const showcaseFooter = (content) => (
  <p className={`flex items-center gap-2 text-sm font-medium ${
    content.showcased
      ? 'text-emerald-700 dark:text-emerald-300'
      : 'text-slate-500 dark:text-slate-400'
  }`}
  >
    <Globe className="h-4 w-4 shrink-0" />
    {content.showcased
      ? 'On the website — a visitor can read this in the course catalog.'
      : 'Not showcased — this is not on the website yet.'}
  </p>
)

// What the institute offers, for the people who get asked about it. A faculty is
// stopped in the corridor and asked what a course costs and how long it runs far more
// often than the admin is, so they read the same library the admin writes — showcased
// or not — and change none of it.
const FacultyContents = () => {
  const { auth, clearAuth } = useAuth()
  const [isAuthorized, setIsAuthorized] = useState(true)
  const [contents, setContents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // A card is a summary; the sheet behind it is the whole answer, which is what a
  // faculty being asked about a course over the counter actually needs to read out.
  const [openContentId, setOpenContentId] = useState('')

  useEffect(() => {
    let isActive = true

    const fetchContents = async () => {
      try {
        const response = await axios.get(FACULTY_CONTENTS_URL, { withCredentials: true })

        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Unable to load content')
        }

        if (isActive) {
          setContents(response.data?.data?.contents || [])
        }
      } catch (fetchError) {
        if (!isActive) {
          return
        }

        if ([401, 403].includes(fetchError?.response?.status)) {
          clearAuth()
          setIsAuthorized(false)
          return
        }

        setError(fetchError?.response?.data?.message || 'Unable to load content.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchContents()

    return () => {
      isActive = false
    }
  }, [clearAuth])

  if (!isAuthorized || auth.role !== 'faculty') {
    return <Navigate to="/login" replace />
  }

  // Held open by an id rather than by a copy of the content, so the sheet always reads
  // the row the list is showing rather than one it captured when it opened.
  const openIndex = contents.findIndex((content) => content._id === openContentId)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <FacultyNavbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Content</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              What the institute offers, written by the admin. The ones marked as on the
              website are what a visitor sees in the course catalog.
            </p>
          </div>

          <PageTour steps={facultyContentsPageTour} />
        </div>

        {error ? (
          <PageBanner tone="error" message={error} onDismiss={() => setError('')} className="mb-6" />
        ) : null}

        {loading ? (
          <p className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading content...
          </p>
        ) : null}

        {!loading && !contents.length ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            The admin has not added any content yet.
          </p>
        ) : null}

        <div data-tour="faculty-content-list" className="grid gap-5 lg:grid-cols-2">
          {contents.map((content) => (
            <ContentCard
              key={content._id}
              content={content}
              onOpen={() => setOpenContentId(content._id)}
            />
          ))}
        </div>
      </main>

      <ContentDetailModal
        content={openIndex >= 0 ? contents[openIndex] : null}
        index={openIndex}
        footer={showcaseFooter}
        onClose={() => setOpenContentId('')}
      />
    </div>
  )
}

export default FacultyContents
