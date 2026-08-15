import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ModalShell from '../Common/ModalShell'
import { checkboxClass, inputClass, labelClass, textAreaClass, toggleClass } from '../../utils/formFields'

// Everything optional lives behind one disclosure so the dialog opens on the
// fields a course cannot be saved without.
const hasAdditionalDetails = (courseForm) => Boolean(
  courseForm.thumbnailUrl
  || courseForm.category
  || courseForm.level
  || courseForm.language
  || courseForm.tags
  || courseForm.highlights
  || courseForm.prerequisites,
)

const AdminCourseForm = ({
  courseForm,
  editingCourse,
  error,
  saving,
  onChange,
  onClose,
  onSubmit,
}) => {
  // The dialog is mounted fresh per open, so an edit that already carries any of
  // these values starts expanded instead of hiding them one click deep.
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(() => hasAdditionalDetails(courseForm))
  const additionalDetailsRef = useRef(null)
  // Only a click asks for the scroll below. A dialog that opens already expanded still
  // starts at the title, because that is where an edit is read from.
  const shouldRevealDetails = useRef(false)

  const toggleAdditionalDetails = () => {
    const nextOpen = !showAdditionalDetails

    shouldRevealDetails.current = nextOpen
    setShowAdditionalDetails(nextOpen)
  }

  // The disclosure sits at the bottom of a dialog that is already taller than it can
  // show, so opening it used to reveal the fields off screen and leave the reader to
  // go looking for what they had just asked for. Opening it now carries the section up
  // to the top of the dialog instead, where it becomes the whole of what is on screen.
  useEffect(() => {
    if (!shouldRevealDetails.current) {
      return
    }

    shouldRevealDetails.current = false
    additionalDetailsRef.current?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }, [showAdditionalDetails])

  return (
    <ModalShell
      title={editingCourse ? 'Edit Course' : 'Create Course'}
      subtitle={editingCourse ? editingCourse.title : 'Add a new course to the catalog.'}
      closeLabel="Close course form"
      size="lg"
      busy={saving}
      error={error}
      bodyClassName="space-y-4"
      onClose={onClose}
      onSubmit={onSubmit}
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-slate-400 dark:hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-indigo-300 disabled:shadow-none"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {saving ? 'Saving...' : editingCourse ? 'Save Changes' : 'Create Course'}
          </button>
        </>
      )}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="course-title" className={labelClass}>
            Title
          </label>
          <input
            id="course-title"
            name="title"
            type="text"
            value={courseForm.title}
            onChange={onChange}
            disabled={saving}
            className={inputClass}
            placeholder="Course title"
          />
        </div>

        <div>
          <label htmlFor="course-slug" className={labelClass}>
            Slug
          </label>
          <input
            id="course-slug"
            name="slug"
            type="text"
            value={courseForm.slug}
            onChange={onChange}
            disabled={saving}
            className={inputClass}
            placeholder="auto-from-title"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="course-duration" className={labelClass}>
            Duration (months)
          </label>
          <input
            id="course-duration"
            name="duration"
            type="number"
            min="0.01"
            step="0.01"
            value={courseForm.duration}
            onChange={onChange}
            disabled={saving || courseForm.isOpenToAll}
            className={inputClass}
            placeholder={courseForm.isOpenToAll ? 'Not needed' : '3'}
          />
        </div>

        <div>
          <label htmlFor="course-price" className={labelClass}>
            Price
          </label>
          <input
            id="course-price"
            name="price"
            type="number"
            min="0"
            step="1"
            value={courseForm.price}
            onChange={onChange}
            disabled={saving}
            className={inputClass}
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <label htmlFor="course-short-description" className={labelClass}>
          Short Description
        </label>
        <input
          id="course-short-description"
          name="shortDescription"
          type="text"
          value={courseForm.shortDescription}
          onChange={onChange}
          disabled={saving}
          className={inputClass}
          placeholder="Brief course summary"
        />
      </div>

      <div>
        <label htmlFor="course-description" className={labelClass}>
          Description
        </label>
        <textarea
          id="course-description"
          name="description"
          rows="4"
          value={courseForm.description}
          onChange={onChange}
          disabled={saving}
          className={textAreaClass}
          placeholder="Course description"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className={toggleClass}>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Published</span>
          <input
            name="isPublished"
            type="checkbox"
            checked={courseForm.isPublished}
            onChange={onChange}
            disabled={saving}
            className={checkboxClass}
          />
        </label>

        <label className={toggleClass}>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Open to All</span>
          <input
            name="isOpenToAll"
            type="checkbox"
            checked={courseForm.isOpenToAll}
            onChange={onChange}
            disabled={saving}
            className={checkboxClass}
          />
        </label>

        <label className={toggleClass}>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Show IDE</span>
          <input
            name="showIde"
            type="checkbox"
            checked={courseForm.showIde}
            onChange={onChange}
            disabled={saving}
            className={checkboxClass}
          />
        </label>
      </div>

      {/* Header and panel scroll as one, so the section that comes up to the top
          brings its own title with it and the reader can close it from where it
          landed. */}
      <div ref={additionalDetailsRef} className="scroll-mt-6 space-y-4">
        <button
          type="button"
          onClick={toggleAdditionalDetails}
          disabled={saving}
          aria-expanded={showAdditionalDetails}
          aria-controls="course-additional-details"
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 transition hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
        >
          <span>Additional Details</span>
          <span className="text-lg leading-none">{showAdditionalDetails ? '-' : '+'}</span>
        </button>

        {showAdditionalDetails ? (
          <div
            id="course-additional-details"
            className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <div>
              <label htmlFor="course-thumbnail" className={labelClass}>
                Thumbnail URL
              </label>
              <input
                id="course-thumbnail"
                name="thumbnailUrl"
                type="url"
                value={courseForm.thumbnailUrl}
                onChange={onChange}
                disabled={saving}
                className={inputClass}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="course-category" className={labelClass}>
                  Category
                </label>
                <input
                  id="course-category"
                  name="category"
                  type="text"
                  value={courseForm.category}
                  onChange={onChange}
                  disabled={saving}
                  className={inputClass}
                  placeholder="Web"
                />
              </div>

              <div>
                <label htmlFor="course-level" className={labelClass}>
                  Level
                </label>
                <input
                  id="course-level"
                  name="level"
                  type="text"
                  value={courseForm.level}
                  onChange={onChange}
                  disabled={saving}
                  className={inputClass}
                  placeholder="Beginner"
                />
              </div>

              <div>
                <label htmlFor="course-language" className={labelClass}>
                  Language
                </label>
                <input
                  id="course-language"
                  name="language"
                  type="text"
                  value={courseForm.language}
                  onChange={onChange}
                  disabled={saving}
                  className={inputClass}
                  placeholder="English"
                />
              </div>
            </div>

            <div>
              <label htmlFor="course-tags" className={labelClass}>
                Tags
              </label>
              <input
                id="course-tags"
                name="tags"
                type="text"
                value={courseForm.tags}
                onChange={onChange}
                disabled={saving}
                className={inputClass}
                placeholder="html, css, javascript"
              />
            </div>

            <div>
              <label htmlFor="course-highlights" className={labelClass}>
                Highlights
              </label>
              <textarea
                id="course-highlights"
                name="highlights"
                rows="2"
                value={courseForm.highlights}
                onChange={onChange}
                disabled={saving}
                className={textAreaClass}
                placeholder="Live projects, certificate"
              />
            </div>

            <div>
              <label htmlFor="course-prerequisites" className={labelClass}>
                Prerequisites
              </label>
              <textarea
                id="course-prerequisites"
                name="prerequisites"
                rows="2"
                value={courseForm.prerequisites}
                onChange={onChange}
                disabled={saving}
                className={textAreaClass}
                placeholder="Basic computer knowledge"
              />
            </div>
          </div>
        ) : null}
      </div>
    </ModalShell>
  )
}

export default AdminCourseForm
