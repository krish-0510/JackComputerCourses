import { Layers3, Pencil, Plus, Trash2 } from 'lucide-react'
import ActionMenu from '../Common/ActionMenu'
import SyncStatusBadge from '../Common/SyncStatusBadge'
import { formatDurationShort } from '../../utils/courseDuration'

// The rail down the side of the page: every chapter in the order students meet them, one
// line each, with what can be done to it on the line itself. It takes its own scrollbar so
// the page behind it never grows one.
const AdminChapterList = ({
  chapters,
  actionsDisabled,
  deletingChapterId,
  selectedChapterId,
  onCreateChapter,
  onDeleteChapter,
  onEditChapter,
  onSelectChapter,
}) => (
  <section
    data-tour="admin-chapter-list"
    className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
  >
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Chapters</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {chapters.length}
        </span>
      </div>

      <button
        type="button"
        data-tour="admin-chapter-new"
        onClick={onCreateChapter}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        New Chapter
      </button>
    </header>

    {chapters.length ? (
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {chapters.map((chapter) => {
          const isSelected = selectedChapterId === chapter._id
          const videoCount = chapter.videos?.length || chapter.videoCount || 0

          return (
            // The row is two controls side by side rather than one inside the other: the
            // left half opens the chapter, and the settings icon is its own button.
            <div
              key={chapter._id}
              className={`flex items-center gap-2 rounded-xl pr-2 transition ${
                isSelected
                  ? 'bg-indigo-50 ring-1 ring-indigo-200 dark:bg-indigo-950/40 dark:ring-indigo-900/60'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectChapter(chapter._id)}
                aria-current={isSelected}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left"
              >
                {/* The order is the one number a chapter is filed under, so it leads the
                    row rather than sitting in the line of stats under it. */}
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
                >
                  {chapter.order}
                </span>

                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-semibold ${
                    isSelected
                      ? 'text-indigo-900 dark:text-indigo-200'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}
                  >
                    {chapter.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                    {videoCount} videos · {formatDurationShort(chapter.durationSeconds)}
                  </span>
                </span>
              </button>

              <SyncStatusBadge status={chapter.syncStatus} variant="dot" />

              <ActionMenu
                label={`Settings for ${chapter.name}`}
                size="sm"
                busy={deletingChapterId === chapter._id}
                disabled={actionsDisabled}
                actions={[
                  {
                    key: 'edit',
                    label: 'Edit chapter',
                    icon: Pencil,
                    onClick: () => onEditChapter(chapter),
                  },
                  {
                    key: 'delete',
                    label: 'Delete chapter',
                    icon: Trash2,
                    danger: true,
                    onClick: () => onDeleteChapter(chapter),
                  },
                ]}
              />
            </div>
          )
        })}
      </div>
    ) : (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <Layers3 className="h-8 w-8 text-slate-300 dark:text-slate-700" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">No chapters yet</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          New Chapter takes a name and a playlist link.
        </p>
      </div>
    )}
  </section>
)

export default AdminChapterList
