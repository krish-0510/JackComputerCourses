import { AlertCircle, ListVideo, RefreshCw } from 'lucide-react'
import SyncStatusBadge from '../Common/SyncStatusBadge'
import { formatDurationShort } from '../../utils/courseDuration'

const PANEL_CLASS = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'

const EmptyPanel = ({ title, hint }) => (
  <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
    <ListVideo className="h-10 w-10 text-slate-300 dark:text-slate-700" aria-hidden="true" />
    <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
    <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{hint}</p>
  </div>
)

// Everything about the one chapter picked in the rail: how much it holds, when its lessons
// were last pulled, and every lesson that came back. The panel scrolls, the page does not,
// so a course with three hundred videos still opens on the same screen as an empty one.
const AdminChapterDetail = ({
  chapter,
  hasChapters,
  isSyncing,
  actionsDisabled,
  onSyncChapter,
}) => {
  if (!chapter) {
    return (
      // The walkthrough points at this slot whether or not a chapter has been picked yet.
      <section data-tour="admin-chapter-detail" className={PANEL_CLASS}>
        <EmptyPanel
          title={hasChapters ? 'Pick a chapter' : 'Nothing to show yet'}
          hint={hasChapters
            ? 'Its lessons open here, and stay until you pick another.'
            : 'Create a chapter from the panel beside this one and its lessons appear here.'}
        />
      </section>
    )
  }

  const videos = chapter.videos || []

  return (
    <section data-tour="admin-chapter-detail" className={PANEL_CLASS}>
      <header className="shrink-0 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                {chapter.name}
              </h2>
              <SyncStatusBadge status={chapter.syncStatus} />
            </div>

            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Order {chapter.order}</span>
              <span aria-hidden="true">·</span>
              <span>{videos.length || chapter.videoCount || 0} videos</span>
              <span aria-hidden="true">·</span>
              <span>{formatDurationShort(chapter.durationSeconds)}</span>
              {chapter.lastSyncedAt ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Synced {new Date(chapter.lastSyncedAt).toLocaleString()}</span>
                </>
              ) : null}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSyncChapter(chapter)}
            disabled={actionsDisabled || isSyncing}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:text-indigo-300 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/60 dark:disabled:text-indigo-500"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
            {isSyncing ? 'Syncing...' : 'Sync Videos'}
          </button>
        </div>

        {chapter.syncError ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {chapter.syncError}
          </p>
        ) : null}
      </header>

      {videos.length ? (
        <div className="grid min-h-0 flex-1 auto-rows-min gap-2 overflow-y-auto p-3 sm:grid-cols-2 2xl:grid-cols-3">
          {videos.map((video) => (
            <a
              key={`${chapter._id}-${video.youtubeVideoId}`}
              href={video.watchUrl}
              target="_blank"
              rel="noreferrer"
              className="flex gap-3 rounded-xl border border-slate-200 bg-white p-2 transition hover:border-indigo-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
            >
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt=""
                  loading="lazy"
                  className="h-14 w-24 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  Video
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {video.title}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  #{Number(video.position || 0) + 1}
                  {video.duration ? ` · ${video.duration}` : ''}
                </p>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <EmptyPanel
          title="No videos synced for this chapter"
          hint="Sync Videos re-reads the playlist and pulls every lesson in it."
        />
      )}
    </section>
  )
}

export default AdminChapterDetail
