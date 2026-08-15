import axios from 'axios'
import { Globe, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AdminContentForm from '../../Components/Admin/AdminContentForm'
import AdminNavbar from '../../Components/Admin/AdminNavbar'
import ActionMenu from '../../Components/Common/ActionMenu'
import ContentCard from '../../Components/Common/ContentCard'
import PageBanner from '../../Components/Common/PageBanner'
import PageTour from '../../Components/Tour/PageTour'
import adminContentsPageTour from '../Tour/Admin/AdminContentsPageTour'
import { useAuth } from '../../Context/AuthContext'
import { useConfirm } from '../../Context/ConfirmContext'
import {
  ADMIN_CONTENTS_URL,
  emptyContentForm,
  saveContent,
  toContentForm,
} from '../../utils/content'

// Everything the institute offers, and the one decision that puts it in front of the
// public: showcase it. The website's catalog is this collection filtered to what was
// picked here, so nothing needs publishing anywhere else.
const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'showcased', label: 'On the website' },
  { value: 'rest', label: 'Not showcased' },
]

const matchesFilter = (content, filter) => (
  filter === 'all' || (filter === 'showcased' ? content.showcased : !content.showcased)
)

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
)

const isAuthError = (error) => [401, 403].includes(error?.response?.status)

const actionClass = 'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed'
const outlineActionClass = `${actionClass} border border-slate-300 text-slate-700 hover:border-slate-400 disabled:text-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500`

const AdminContents = () => {
  const { auth, clearAuth } = useAuth()
  const confirm = useConfirm()
  const [isAuthorized, setIsAuthorized] = useState(true)
  const [contents, setContents] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [contentForm, setContentForm] = useState(emptyContentForm)
  const [editingContentId, setEditingContentId] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleRequestError = useCallback((requestError, fallback) => {
    if (isAuthError(requestError)) {
      clearAuth()
      setIsAuthorized(false)
      return
    }

    setError(getErrorMessage(requestError, fallback))
  }, [clearAuth])

  useEffect(() => {
    let isActive = true

    const fetchContents = async () => {
      try {
        const response = await axios.get(ADMIN_CONTENTS_URL, { withCredentials: true })

        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Unable to load content')
        }

        if (isActive) {
          setContents(response.data?.data?.contents || [])
        }
      } catch (fetchError) {
        if (isActive) {
          handleRequestError(fetchError, 'Unable to load content.')
        }
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
  }, [handleRequestError])

  const editingContent = useMemo(
    () => contents.find((content) => content._id === editingContentId) || null,
    [contents, editingContentId],
  )

  const counts = useMemo(() => {
    const showcased = contents.filter((content) => content.showcased).length

    return { all: contents.length, showcased, rest: contents.length - showcased }
  }, [contents])

  const visibleContents = useMemo(
    () => contents.filter((content) => matchesFilter(content, filter)),
    [contents, filter],
  )

  const resetMessages = () => {
    setError('')
    setSuccess('')
  }

  const openForm = (content) => {
    resetMessages()
    setFormError('')
    setEditingContentId(content?._id || '')
    setContentForm(content ? toContentForm(content) : emptyContentForm)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingContentId('')
    setContentForm(emptyContentForm)
    setFormError('')
  }

  // Most fields are typed into, and one — the topic list — can also be filled from an
  // uploaded sheet, so both ways of changing the form end at the same setter.
  const setFormField = (name, value) => {
    setContentForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  const handleFormChange = (event) => {
    const { checked, name, type, value } = event.target

    setFormField(name, type === 'checkbox' ? checked : value)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    resetMessages()
    setFormError('')
    setSaving(true)

    try {
      const saved = await saveContent({ contentId: editingContentId, form: contentForm })

      setContents((currentContents) => (
        editingContentId
          ? currentContents.map((content) => (content._id === saved._id ? saved : content))
          : [saved, ...currentContents]
      ))
      setSuccess(editingContentId ? 'Content updated.' : 'Content created.')
      closeForm()
    } catch (saveError) {
      if (isAuthError(saveError)) {
        clearAuth()
        setIsAuthorized(false)
        return
      }

      setFormError(getErrorMessage(saveError, 'Unable to save the content. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  // Showing and taking down are the same decision, so they are the same request with
  // the answer flipped. Content already showcased goes back to the front of the
  // catalog, which orders itself by when each was picked.
  const handleShowcase = async (content) => {
    const showcased = !content.showcased

    resetMessages()
    setBusyId(content._id)

    try {
      const response = await axios.patch(
        `${ADMIN_CONTENTS_URL}/${content._id}/showcase`,
        { showcased },
        { withCredentials: true },
      )

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to update the showcase')
      }

      const updated = response.data.data.content

      setContents((currentContents) => currentContents.map(
        (current) => (current._id === updated._id ? updated : current),
      ))
      setSuccess(response.data.message)
    } catch (showcaseError) {
      handleRequestError(showcaseError, 'Unable to update the showcase. Please try again.')
    } finally {
      setBusyId('')
    }
  }

  const handleDelete = async (content) => {
    resetMessages()

    const confirmed = await confirm({
      title: 'Delete this content?',
      description: content.showcased
        ? 'It is on the website right now, and deleting it takes it down along with it.'
        : 'Nothing else is kept about it once it is gone.',
      subject: content.name,
      confirmLabel: 'Delete content',
    })

    if (!confirmed) {
      return
    }

    setBusyId(content._id)

    try {
      const response = await axios.delete(`${ADMIN_CONTENTS_URL}/${content._id}`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to delete the content')
      }

      setContents((currentContents) => currentContents.filter(
        (current) => current._id !== content._id,
      ))
      setSuccess('Content deleted.')
    } catch (deleteError) {
      handleRequestError(deleteError, 'Unable to delete the content. Please try again.')
    } finally {
      setBusyId('')
    }
  }

  if (!isAuthorized || auth.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <AdminNavbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Content</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Everything the institute offers. Showcase as many as you like and they appear
              on the website's course catalog, the highlighted ones first.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <PageTour steps={adminContentsPageTour} />

            <button
              type="button"
              data-tour="admin-content-new"
              onClick={() => openForm(null)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New content
            </button>
          </div>
        </div>

        {error ? (
          <PageBanner tone="error" message={error} onDismiss={() => setError('')} className="mb-6" />
        ) : null}

        {success ? (
          <PageBanner tone="success" message={success} onDismiss={() => setSuccess('')} className="mb-6" />
        ) : null}

        <div data-tour="admin-content-filters" className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                filter === option.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            >
              {option.label} ({counts[option.value]})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading content...
          </p>
        ) : null}

        {!loading && !visibleContents.length ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            {contents.length
              ? 'Nothing matches this filter.'
              : 'Nothing here yet. Create your first content and showcase it to put it on the website.'}
          </p>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          {visibleContents.map((content, index) => {
            const isBusy = busyId === content._id

            return (
              <ContentCard
                key={content._id}
                content={content}
                dataTour={index ? undefined : 'admin-content-card'}
                menu={(
                  <ActionMenu
                    label={`Settings for ${content.name}`}
                    size="sm"
                    busy={isBusy}
                    actions={[
                      {
                        key: 'edit',
                        label: 'Edit content',
                        icon: Pencil,
                        onClick: () => openForm(content),
                      },
                      {
                        key: 'delete',
                        label: 'Delete content',
                        icon: Trash2,
                        danger: true,
                        onClick: () => handleDelete(content),
                      },
                    ]}
                  />
                )}
                actions={(
                  <button
                    type="button"
                    onClick={() => handleShowcase(content)}
                    disabled={isBusy}
                    className={content.showcased
                      ? outlineActionClass
                      : `${actionClass} bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300`}
                  >
                    {isBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : content.showcased ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                    {content.showcased ? 'Take down' : 'Showcase'}
                  </button>
                )}
              />
            )
          })}
        </div>
      </main>

      {isFormOpen ? (
        <AdminContentForm
          contentForm={contentForm}
          editingContent={editingContent}
          error={formError}
          saving={saving}
          onChange={handleFormChange}
          onFieldChange={setFormField}
          onClose={closeForm}
          onSubmit={handleSave}
        />
      ) : null}
    </div>
  )
}

export default AdminContents
