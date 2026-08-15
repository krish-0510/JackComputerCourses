import { AnimatePresence, motion } from 'framer-motion'
import { Info, Loader2, MessageCircle, Phone } from 'lucide-react'
import { useMemo, useState } from 'react'
import ContentDetailModal from '../../Components/Common/ContentDetailModal'
import ContentCard from '../../Components/Landing/ContentCard'
import LandingButton from '../../Components/Landing/LandingButton'
import LandingLayout from '../../Components/Landing/LandingLayout'
import Reveal from '../../Components/Landing/Reveal'
import { INSTITUTE, telLink } from '../../utils/instituteInfo'
import {
  ALL_CATEGORIES,
  contentEnquiryLink,
  getContentCategories,
  isPriceOnRequest,
  useShowcasedContents,
} from '../../utils/content'
import { EASE_OUT } from '../../utils/motion'

// A visitor cannot enrol from here — nobody can, the institute takes enquiries first —
// so the sheet's footer is the two ways of asking about the course it is showing.
const enquiryFooter = (content) => (
  <>
    <LandingButton href={contentEnquiryLink(content)} variant="whatsapp" className="flex-1 sm:flex-none">
      <MessageCircle className="h-5 w-5" />
      Ask about this
    </LandingButton>

    <LandingButton href={telLink} variant="outline" className="flex-1 sm:flex-none">
      <Phone className="h-5 w-5" />
      {INSTITUTE.phoneDisplay}
    </LandingButton>
  </>
)

// The whole catalog on one page, filtered in place. What is on it is not written here
// any more: the admin writes each course in the portal and showcases the ones the
// institute is actually running, and this page — like the footer and the enquiry form
// beside it — carries exactly those.
const CoursesPage = () => {
  const { contents, loading, failed } = useShowcasedContents()
  const [category, setCategory] = useState(ALL_CATEGORIES)
  const [openContentId, setOpenContentId] = useState('')

  const categories = useMemo(() => getContentCategories(contents), [contents])

  const visibleContents = useMemo(() => (
    category === ALL_CATEGORIES
      ? contents
      : contents.filter((content) => content.category === category)
  ), [category, contents])

  const hasFeesOnRequest = useMemo(() => contents.some(isPriceOnRequest), [contents])

  // The sheet is held open by an id rather than by a copy of the course, so it reads
  // the same row the grid does — and a filter that takes that card off the page closes
  // the sheet with it instead of leaving it standing over an empty grid.
  const openIndex = visibleContents.findIndex((content) => content._id === openContentId)

  return (
    <LandingLayout>
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <Reveal as="p" className="font-code text-xs uppercase tracking-[0.18em] text-blue-600 dark:text-cyan-300">
          Course catalog
        </Reveal>

        <Reveal as="h1" delay={0.06} className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
          {contents.length ? `${contents.length} ${contents.length === 1 ? 'course' : 'courses'}. ` : null}
          Pick the one that gets you working.
        </Reveal>

        <Reveal as="p" delay={0.12} className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-slate-600 dark:text-slate-300">
          Everything we teach, and exactly what is inside it — taught by our faculty in the
          {' '}{INSTITUTE.city} lab and through the student portal.
        </Reveal>

        {/* One category is no choice at all, so the row of pills only appears once the
            catalog has more than one thing to sort itself into. */}
        {categories.length > 2 ? (
          <Reveal delay={0.18} className="mt-9 flex flex-wrap gap-2.5">
            {categories.map((name) => {
              const isActive = name === category

              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCategory(name)}
                  className={`relative rounded-full px-5 py-2.5 text-sm font-medium transition-colors duration-300 ${
                    isActive
                      ? 'text-white dark:text-slate-950'
                      : 'border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700 dark:border-white/10 dark:text-slate-300 dark:hover:border-cyan-300/40 dark:hover:text-white'
                  }`}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="category-pill"
                      transition={{ duration: 0.4, ease: EASE_OUT }}
                      className="absolute inset-0 rounded-full bg-linear-to-r from-blue-600 to-indigo-600 dark:from-cyan-300 dark:to-blue-400"
                    />
                  ) : null}
                  <span className="relative">{name}</span>
                </button>
              )
            })}
          </Reveal>
        ) : null}
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {loading ? (
          <p className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading the catalog...
          </p>
        ) : null}

        {/* A catalog that could not be fetched and a catalog with nothing in it look the
            same to a visitor, so both send them to the one place that always answers. */}
        {!loading && !contents.length ? (
          <Reveal className="flex items-start gap-4 rounded-3xl border border-dashed border-slate-300 bg-white/50 p-6 backdrop-blur dark:border-white/15 dark:bg-white/3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-cyan-300" />
            <p className="leading-relaxed text-slate-600 dark:text-slate-300">
              {failed
                ? 'We could not load the catalog just now.'
                : 'Our course list is being updated.'}
              {' '}Message us on WhatsApp or call {INSTITUTE.phoneDisplay} and we will tell you
              what is running and when the next batch starts.
            </p>
          </Reveal>
        ) : null}

        {/* `layout` on the grid children is what makes a filter read as the cards moving
            rather than the list being replaced. */}
        <motion.div layout className="grid gap-6 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {visibleContents.map((content, index) => (
              <motion.div
                key={content._id}
                layout
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -12 }}
                transition={{ duration: 0.45, ease: EASE_OUT }}
              >
                <ContentCard
                  content={content}
                  index={index}
                  onOpen={() => setOpenContentId(content._id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {hasFeesOnRequest ? (
          <Reveal className="mt-8 flex items-start gap-4 rounded-3xl border border-dashed border-slate-300 bg-white/50 p-6 backdrop-blur dark:border-white/15 dark:bg-white/3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-cyan-300" />
            <p className="leading-relaxed text-slate-600 dark:text-slate-300">
              Where a course says fees on request, the number depends on the batch and the
              duration you pick — message us on WhatsApp and we will tell you straight away.
            </p>
          </Reveal>
        ) : null}
      </section>

      <ContentDetailModal
        content={openIndex >= 0 ? visibleContents[openIndex] : null}
        index={openIndex}
        footer={enquiryFooter}
        onClose={() => setOpenContentId('')}
      />
    </LandingLayout>
  )
}

export default CoursesPage
