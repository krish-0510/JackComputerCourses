import { AnimatePresence, motion } from 'framer-motion'
import { Check, Sparkles, X } from 'lucide-react'
import { useId } from 'react'
import { createPortal } from 'react-dom'
import {
  formatContentPrice,
  formatContentPriceNote,
  getContentAccent,
  getContentTypeLabel,
} from '../../utils/content'
import { useDialogBehaviour } from '../../utils/modal'
import { EASE_OUT, fadeUp, staggerParent } from '../../utils/motion'

// The card says enough to be picked out of a row; this says enough to be chosen. It is
// the whole of what the institute wrote about one course, on one pane of glass — read
// by a visitor deciding whether to join and by the faculty who get asked about it, so
// what to *do* about it is the one thing the sheet does not decide for itself: the
// visitor is handed the two ways of asking, the faculty are told whether the person in
// front of them could have read it already.
const Stat = ({ label, value }) => (
  <motion.div
    variants={fadeUp}
    className="min-w-32 flex-1 rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-white/5"
  >
    <p className="font-code text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
      {label}
    </p>
    <p className="mt-1.5 text-[0.95rem] font-semibold text-slate-900 dark:text-white">{value}</p>
  </motion.div>
)

const Dialog = ({ content, footer, index, onClose }) => {
  const headingId = useId()
  const accent = getContentAccent(index)

  useDialogBehaviour({ onClose })

  const stats = [
    { label: 'Duration', value: content.duration },
    { label: 'Level', value: content.level },
    { label: 'Mode', value: getContentTypeLabel(content.type) },
    { label: 'Taught by', value: content.taughtBy },
  ].filter((stat) => stat.value)

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <motion.button
        type="button"
        aria-label="Close course details"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-950/60 backdrop-blur-md"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-white/85 shadow-[0_40px_90px_-30px_rgb(15_23_42/0.55)] backdrop-blur-2xl sm:rounded-3xl dark:border-white/10 dark:bg-slate-950/85"
      >
        {/* The course's own colour, laid across the top of the sheet and echoed as a
            glow behind the title, so the card it opened from is still recognisable. */}
        <span className={`h-1.5 w-full shrink-0 bg-linear-to-r ${accent}`} />
        <span className={`pointer-events-none absolute -top-24 left-1/2 h-56 w-xl -translate-x-1/2 rounded-full bg-linear-to-r opacity-20 blur-3xl ${accent}`} />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close course details"
          className="absolute right-4 top-6 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/70 text-slate-500 backdrop-blur transition hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/25 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <motion.div
          variants={staggerParent(0.06, 0.12)}
          initial="hidden"
          animate="visible"
          className="min-h-0 flex-1 overflow-y-auto px-7 pb-8 pt-7 sm:px-10 sm:pt-9"
        >
          <motion.div variants={fadeUp} className="pr-12">
            {content.code || content.category ? (
              <p className="font-code text-[11px] tracking-[0.14em] text-slate-400 dark:text-slate-500">
                {[content.code, content.category].filter(Boolean).join(' · ')}
              </p>
            ) : null}

            <h2
              id={headingId}
              className="mt-2 font-display text-3xl font-bold leading-[1.1] tracking-tight text-balance text-slate-900 sm:text-4xl dark:text-white"
            >
              {content.name}
            </h2>

            {content.isHighlighted ? (
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-code text-[11px] uppercase tracking-[0.12em] text-amber-700 dark:border-amber-300/25 dark:text-amber-200">
                <Sparkles className="h-3 w-3" />
                Most asked for
              </span>
            ) : null}
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-7 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200/80 bg-linear-to-r from-slate-50 to-white px-5 py-4 dark:border-white/10 dark:from-white/6 dark:to-transparent"
          >
            <div>
              <p className="font-code text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                Fees
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-slate-900 dark:text-white">
                {formatContentPrice(content.price)}
              </p>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              {formatContentPriceNote(content.price)}
            </p>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="mt-7 leading-relaxed whitespace-pre-wrap text-pretty text-slate-600 dark:text-slate-300"
          >
            {content.description}
          </motion.p>

          {stats.length ? (
            <div className="mt-7 flex flex-wrap gap-3">
              {stats.map((stat) => <Stat key={stat.label} label={stat.label} value={stat.value} />)}
            </div>
          ) : null}

          {content.topics?.length ? (
            <motion.div variants={fadeUp} className="mt-9 border-t border-slate-200/70 pt-7 dark:border-white/10">
              <p className="font-code text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                What you cover
              </p>

              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {content.topics.map((topic) => (
                  <li
                    key={topic}
                    className="flex items-start gap-3 rounded-xl border border-transparent bg-slate-50/70 px-3.5 py-3 text-sm leading-snug text-slate-700 transition-colors duration-300 hover:border-blue-500/20 dark:bg-white/4 dark:text-slate-200 dark:hover:border-cyan-300/20"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/12 text-blue-600 dark:bg-cyan-400/12 dark:text-cyan-300">
                      <Check className="h-3 w-3" />
                    </span>
                    {topic}
                  </li>
                ))}
              </ul>
            </motion.div>
          ) : null}

          {content.prerequisites?.length ? (
            <motion.div variants={fadeUp} className="mt-7 rounded-2xl border border-cyan-500/20 bg-cyan-500/8 px-5 py-4 dark:border-cyan-300/20 dark:bg-cyan-400/5">
              <p className="font-code text-[11px] uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">
                Before you start
              </p>

              <ul className="mt-3 grid gap-2">
                {content.prerequisites.map((prerequisite) => (
                  <li key={prerequisite} className="flex items-start gap-3 text-sm leading-relaxed text-cyan-900 dark:text-cyan-100">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500 dark:bg-cyan-300" />
                    {prerequisite}
                  </li>
                ))}
              </ul>
            </motion.div>
          ) : null}
        </motion.div>

        {/* Nobody enrols from a sheet — they ask first — so whatever asking looks like
            sits against the bottom rather than at the end of a scroll. It is given the
            course, so it is never handed one that has already closed. */}
        {footer ? (
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-slate-200/70 bg-white/70 px-7 py-5 backdrop-blur sm:px-10 dark:border-white/10 dark:bg-white/4">
            {footer(content)}
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}

// Portalled to the body because the catalog animates its grid, and a `fixed` sheet
// inside a transformed ancestor would be pinned to that grid instead of the screen.
const ContentDetailModal = ({ content, footer, index, onClose }) => createPortal(
  <AnimatePresence>
    {content ? (
      <Dialog key={content._id} content={content} footer={footer} index={index} onClose={onClose} />
    ) : null}
  </AnimatePresence>,
  document.body,
)

export default ContentDetailModal
