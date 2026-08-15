import CourseMetaList from '../Common/CourseMetaList'
import {
  accessCountMeta,
  accessLengthMeta,
  chapterMeta,
  lengthMeta,
  videoMeta,
} from '../../utils/courseMeta'

const badgeClass = 'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold'

// One strip along the top of a page that never scrolls, so it spends as little height as
// it can: the artwork is a thumbnail rather than a banner, the counts are a line of text
// rather than five tiles, and the buttons that leave the page sit on the same row. What a
// course holds is worded by the shared meta helpers, so these numbers read exactly as they
// do on the cards this page was opened from.
const AdminCourseSummary = ({ course, children }) => (
  <section
    data-tour="admin-course-summary"
    className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
  >
    {course.thumbnailUrl ? (
      <img
        src={course.thumbnailUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded-xl object-cover"
      />
    ) : (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-indigo-700 text-xl font-bold text-white/90">
        J
      </div>
    )}

    {/* A floor rather than a share of what is left: when the stats and the buttons beside
        it stop fitting they wrap to their own line, instead of squeezing the title down to
        a word and an ellipsis. */}
    <div className="min-w-48 flex-1">
      <div className="flex items-center gap-2">
        <h1 className="truncate text-lg font-bold text-slate-900 dark:text-slate-100">
          {course.title}
        </h1>
        <span className={`${badgeClass} ${
          course.isPublished
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
        }`}
        >
          {course.isPublished ? 'Published' : 'Draft'}
        </span>
        {course.isOpenToAll ? (
          <span className={`${badgeClass} bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300`}>
            Open to All
          </span>
        ) : null}
      </div>

      {/* The slug is the course's address and the description says what it is, so they
          share the one line left under the title rather than taking one each. */}
      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
        <span className="font-mono text-slate-400 dark:text-slate-500">{course.slug}</span>
        {course.shortDescription || course.description
          ? ` · ${course.shortDescription || course.description}`
          : null}
      </p>
    </div>

    <CourseMetaList
      className="min-w-0 border-slate-200 dark:border-slate-800 lg:border-l lg:pl-4"
      // A headcount only means something on a course held for named students, and the
      // badge above already says which of the two this is.
      items={[
        chapterMeta(course),
        videoMeta(course),
        lengthMeta(course),
        accessLengthMeta(course),
        ...(course.isOpenToAll ? [] : [accessCountMeta(course)]),
      ]}
    />

    <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
  </section>
)

export default AdminCourseSummary
