import { ListPlus, Loader2 } from 'lucide-react'
import ModalShell from '../Common/ModalShell'
import { inputClass, labelClass } from '../../utils/formFields'

// Creating a chapter and editing one are the same three fields, so they are the same
// dialog: which of the two it is only changes what the header and the submit button say.
const AdminChapterForm = ({
  chapterForm,
  editingChapter,
  error,
  savingChapter,
  onChange,
  onClose,
  onSubmit,
}) => (
  <ModalShell
    icon={ListPlus}
    title={editingChapter ? 'Edit Chapter' : 'Create Chapter'}
    subtitle={editingChapter ? editingChapter.name : 'Add a chapter and the playlist its lessons come from.'}
    closeLabel="Close chapter form"
    busy={savingChapter}
    error={error}
    bodyClassName="space-y-4"
    onClose={onClose}
    onSubmit={onSubmit}
    footer={(
      <>
        <button
          type="button"
          onClick={onClose}
          disabled={savingChapter}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:disabled:text-slate-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={savingChapter}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-indigo-300 disabled:shadow-none"
        >
          {savingChapter ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {savingChapter ? 'Saving...' : editingChapter ? 'Save Chapter' : 'Create Chapter'}
        </button>
      </>
    )}
  >
    <div>
      <label htmlFor="chapter-name" className={labelClass}>
        Chapter Name
      </label>
      <input
        id="chapter-name"
        name="name"
        type="text"
        value={chapterForm.name}
        onChange={onChange}
        disabled={savingChapter}
        className={inputClass}
        placeholder="Introduction"
      />
    </div>

    <div>
      <label htmlFor="chapter-playlist" className={labelClass}>
        YouTube Playlist Link
      </label>
      <textarea
        id="chapter-playlist"
        name="playlistUrl"
        rows="3"
        value={chapterForm.playlistUrl}
        onChange={onChange}
        disabled={savingChapter}
        className={`${inputClass} resize-y`}
        placeholder="https://www.youtube.com/playlist?list=..."
      />
    </div>

    <div>
      <label htmlFor="chapter-order" className={labelClass}>
        Order
      </label>
      <input
        id="chapter-order"
        name="order"
        type="number"
        min="0"
        step="1"
        value={chapterForm.order}
        onChange={onChange}
        disabled={savingChapter}
        className={inputClass}
        placeholder="0"
      />
      {/* The two cases treat an empty box differently, so it says which one it is in. */}
      <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        Where the chapter sits in the course.
        {editingChapter ? ' Left empty, it keeps the place it has.' : ' Left empty, it goes to the end.'}
      </p>
    </div>
  </ModalShell>
)

export default AdminChapterForm
