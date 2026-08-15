import { Globe, Sparkles } from 'lucide-react'
import { formatContentPrice, getContentTypeLabel } from '../../utils/content'

const Meta = ({ children }) => (
  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
    {children}
  </span>
)

const List = ({ items, title }) => (
  <div>
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
      {title}
    </p>
    <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300">{items.join(' · ')}</p>
  </div>
)

// One piece of content, read the same way by the admin who wrote it and the faculty
// who are asked about it. The two differ only in what they may do with it, so both the
// settings menu in the corner and the action along the bottom are handed in from
// outside, and the faculty simply hand in neither.
const ContentCard = ({ actions, content, dataTour, menu, onOpen }) => {
  const metas = [
    content.duration,
    content.level,
    getContentTypeLabel(content.type),
    content.taughtBy,
  ].filter(Boolean)

  return (
    <article
      data-tour={dataTour}
      className={`relative flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${
        onOpen ? 'transition hover:border-indigo-300 hover:shadow-md dark:hover:border-indigo-700' : ''
      }`}
    >
      {/* Where the card leads somewhere, the whole of it does. The settings menu and
          the actions below sit above this, and the menu stops its own clicks from
          reaching it — a card that opens when you meant to delete it is a trap. */}
      {onOpen ? (
        <button
          type="button"
          onClick={() => onOpen(content)}
          aria-label={`See the details of ${content.name}`}
          className="absolute inset-0 z-10 cursor-pointer rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {content.code || content.category ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {[content.code, content.category].filter(Boolean).join(' · ')}
            </p>
          ) : null}

          <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{content.name}</h3>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <p className="text-lg font-black tabular-nums text-slate-900 dark:text-slate-100">
            {formatContentPrice(content.price)}
          </p>
          {menu ? <span className="relative z-20">{menu}</span> : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {/* Whether the website carries this is the decision the admin came here to
            make, so it is the first thing the card says about it. */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            content.showcased
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <Globe className="h-3 w-3" />
          {content.showcased ? 'On the website' : 'Not showcased'}
        </span>

        {content.isHighlighted ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            <Sparkles className="h-3 w-3" />
            Highlighted
          </span>
        ) : null}
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
        {content.description}
      </p>

      {metas.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {metas.map((meta) => <Meta key={meta}>{meta}</Meta>)}
        </div>
      ) : null}

      {content.topics?.length || content.prerequisites?.length ? (
        <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          {content.topics?.length ? <List title="Topics" items={content.topics} /> : null}
          {content.prerequisites?.length ? <List title="Prerequisites" items={content.prerequisites} /> : null}
        </div>
      ) : null}

      {actions ? (
        <div className="relative z-20 mt-auto flex flex-wrap gap-2 pt-6">{actions}</div>
      ) : null}
    </article>
  )
}

export default ContentCard
