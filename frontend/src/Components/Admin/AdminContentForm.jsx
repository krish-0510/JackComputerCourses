import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import AdminTopicSheetUpload from './AdminTopicSheetUpload'
import ModalShell from '../Common/ModalShell'
import { CONTENT_TYPES } from '../../utils/content'
import {
  checkboxClass,
  inputClass,
  labelClass,
  selectClass,
  textAreaClass,
  toggleClass,
} from '../../utils/formFields'

// Everything optional lives behind one disclosure so the dialog opens on the four
// fields content cannot be saved without.
const OPTIONAL_FIELDS = ['code', 'category', 'level', 'type', 'taughtBy', 'prerequisites']

const hasAdditionalDetails = (contentForm) => OPTIONAL_FIELDS.some((field) => contentForm[field])

const Field = ({ children, hint, htmlFor, label }) => (
  <div>
    <label htmlFor={htmlFor} className={labelClass}>
      {label}
      {hint ? <span className="ml-2 font-normal text-slate-400 dark:text-slate-500">{hint}</span> : null}
    </label>
    {children}
  </div>
)

// Creating content and editing it are the same fields, so they are the same dialog:
// which of the two it is only changes what the header and the submit button say.
const AdminContentForm = ({
  contentForm,
  editingContent,
  error,
  saving,
  onChange,
  onClose,
  onFieldChange,
  onSubmit,
}) => {
  // The dialog is mounted fresh per open, so an edit that already carries any of
  // these values starts expanded instead of hiding them one click deep.
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(() => hasAdditionalDetails(contentForm))

  return (
    <ModalShell
      title={editingContent ? 'Edit content' : 'New content'}
      subtitle={editingContent ? editingContent.name : 'Anything the institute offers.'}
      closeLabel="Close content form"
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
            {saving ? 'Saving...' : editingContent ? 'Save changes' : 'Create content'}
          </button>
        </>
      )}
    >
      <Field htmlFor="content-name" label="Name">
        <input
          id="content-name"
          name="name"
          type="text"
          value={contentForm.name}
          onChange={onChange}
          disabled={saving}
          className={inputClass}
          placeholder="Python Programming"
        />
      </Field>

      <Field htmlFor="content-description" label="Description">
        <textarea
          id="content-description"
          name="description"
          rows="3"
          value={contentForm.description}
          onChange={onChange}
          disabled={saving}
          className={textAreaClass}
          placeholder="What this is, in the words a visitor would use."
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="content-price" label="Price" hint="0 to quote on request">
          <input
            id="content-price"
            name="price"
            type="number"
            min="0"
            step="1"
            value={contentForm.price}
            onChange={onChange}
            disabled={saving}
            className={inputClass}
            placeholder="10000"
          />
        </Field>

        <Field htmlFor="content-duration" label="Duration">
          <input
            id="content-duration"
            name="duration"
            type="text"
            value={contentForm.duration}
            onChange={onChange}
            disabled={saving}
            className={inputClass}
            placeholder="3 months"
          />
        </Field>
      </div>

      <label className={toggleClass}>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Highlight this
          <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">leads the catalog</span>
        </span>
        <input
          name="isHighlighted"
          type="checkbox"
          checked={contentForm.isHighlighted}
          onChange={onChange}
          disabled={saving}
          className={checkboxClass}
        />
      </label>

      {/* Topics sit out here rather than behind the disclosure: a syllabus is most of
          what a course is, and the sheet upload below is no use hidden. */}
      <Field htmlFor="content-topics" label="Topics" hint="separated by commas">
        <textarea
          id="content-topics"
          name="topics"
          rows="2"
          value={contentForm.topics}
          onChange={onChange}
          disabled={saving}
          className={textAreaClass}
          placeholder="Variables, Loops, Functions, Files"
        />

        <AdminTopicSheetUpload
          disabled={saving}
          topics={contentForm.topics}
          onChange={(value) => onFieldChange('topics', value)}
        />
      </Field>

      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowAdditionalDetails((isOpen) => !isOpen)}
          disabled={saving}
          aria-expanded={showAdditionalDetails}
          aria-controls="content-additional-details"
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 transition hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
        >
          <span>Additional details</span>
          <span className="text-lg leading-none">{showAdditionalDetails ? '-' : '+'}</span>
        </button>

        {showAdditionalDetails ? (
          <div
            id="content-additional-details"
            className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field htmlFor="content-code" label="Code">
                <input
                  id="content-code"
                  name="code"
                  type="text"
                  value={contentForm.code}
                  onChange={onChange}
                  disabled={saving}
                  className={inputClass}
                  placeholder="PY-01"
                />
              </Field>

              <Field htmlFor="content-category" label="Category" hint="filters the catalog">
                <input
                  id="content-category"
                  name="category"
                  type="text"
                  value={contentForm.category}
                  onChange={onChange}
                  disabled={saving}
                  className={inputClass}
                  placeholder="Programming"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field htmlFor="content-level" label="Level">
                <input
                  id="content-level"
                  name="level"
                  type="text"
                  value={contentForm.level}
                  onChange={onChange}
                  disabled={saving}
                  className={inputClass}
                  placeholder="No experience needed"
                />
              </Field>

              <Field htmlFor="content-type" label="Type">
                <select
                  id="content-type"
                  name="type"
                  value={contentForm.type}
                  onChange={onChange}
                  disabled={saving}
                  className={selectClass}
                >
                  <option value="">Not specified</option>
                  {CONTENT_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field htmlFor="content-taught-by" label="Taught by">
              <input
                id="content-taught-by"
                name="taughtBy"
                type="text"
                value={contentForm.taughtBy}
                onChange={onChange}
                disabled={saving}
                className={inputClass}
                placeholder="Programming faculty"
              />
            </Field>

            <Field htmlFor="content-prerequisites" label="Prerequisites" hint="separated by commas">
              <textarea
                id="content-prerequisites"
                name="prerequisites"
                rows="2"
                value={contentForm.prerequisites}
                onChange={onChange}
                disabled={saving}
                className={textAreaClass}
                placeholder="Basic computer knowledge"
              />
            </Field>
          </div>
        ) : null}
      </div>
    </ModalShell>
  )
}

export default AdminContentForm
