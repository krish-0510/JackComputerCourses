import { ArrowRight, Check, Sparkles } from 'lucide-react'
import {
  formatContentPrice,
  formatContentPriceNote,
  getContentAccent,
  getContentTypeLabel,
} from '../../utils/content'
import SpotlightCard from './SpotlightCard'

const CARD_TOPIC_LIMIT = 6

const Meta = ({ children }) => (
  <span className="rounded-lg border border-slate-200 bg-slate-100/70 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
    {children}
  </span>
)

// One card for one thing the institute teaches. Everything past the name, the price,
// the length and the description is the admin's to leave out, so every part of the
// card below is absent rather than empty when nothing was written for it. The card is
// a summary and nothing more — the whole of it opens the detail sheet, so there is one
// target to hit rather than a link to find inside one.
const ContentCard = ({ content, index = 0, onOpen }) => {
  const metas = [content.duration, content.level, getContentTypeLabel(content.type)].filter(Boolean)

  return (
    <SpotlightCard as="article" className="flex h-full flex-col p-7 sm:p-8">
      {/* SpotlightCard holds its padding outside the box this sits in, so the overlay
          is pushed back out over it — a card you cannot click the edge of reads as
          broken rather than as precise. */}
      <button
        type="button"
        onClick={() => onOpen?.(content)}
        aria-label={`See the details of ${content.name}`}
        className="absolute -inset-7 z-20 cursor-pointer rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:-inset-8 dark:focus-visible:ring-cyan-300"
      />
      {/* The content's own colour, and the only place the card carries it — a row of
          cards reads as one set with several marks rather than several palettes. */}
      <span className={`mb-6 block h-1 w-14 rounded-full bg-linear-to-r ${getContentAccent(index)}`} />

      <div className="flex items-start justify-between gap-5">
        <div>
          {content.code || content.category ? (
            <p className="font-code text-[11px] tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {[content.code, content.category].filter(Boolean).join(' · ')}
            </p>
          ) : null}

          <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {content.name}
          </h3>

          {content.isHighlighted ? (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:border-amber-300/25 dark:text-amber-200">
              <Sparkles className="h-3 w-3" />
              Most asked for
            </span>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <p className="font-display text-xl font-bold text-slate-900 dark:text-white">
            {formatContentPrice(content.price)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {formatContentPriceNote(content.price)}
          </p>
        </div>
      </div>

      <p className="mt-4 text-[0.95rem] leading-relaxed text-pretty text-slate-600 dark:text-slate-300">
        {content.description}
      </p>

      {metas.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {metas.map((meta) => <Meta key={meta}>{meta}</Meta>)}
        </div>
      ) : null}

      {content.topics?.length ? (
        <div className="mt-6 border-t border-slate-200/70 pt-6 dark:border-white/10">
          <p className="font-code text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            What you cover
          </p>

          {/* A syllabus of twenty lines would make one card taller than the five beside
              it, so the card shows the first few and says how many it is holding back.
              The sheet behind it carries all of them. */}
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {content.topics.slice(0, CARD_TOPIC_LIMIT).map((topic) => (
              <li key={topic} className="flex items-start gap-2.5 text-sm leading-snug text-slate-700 dark:text-slate-300">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-cyan-300" />
                {topic}
              </li>
            ))}
          </ul>

          {content.topics.length > CARD_TOPIC_LIMIT ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              + {content.topics.length - CARD_TOPIC_LIMIT} more
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-7">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {content.taughtBy ? `Taught by ${content.taughtBy}` : ''}
        </span>

        <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-cyan-200">
          View details
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </SpotlightCard>
  )
}

export default ContentCard
