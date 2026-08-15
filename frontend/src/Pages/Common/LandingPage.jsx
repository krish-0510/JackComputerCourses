import { ArrowRight, Clock, MapPin, MessageCircle, Monitor, Phone } from 'lucide-react'
import FaqList from '../../Components/Landing/FaqList'
import LandingButton from '../../Components/Landing/LandingButton'
import LandingLayout from '../../Components/Landing/LandingLayout'
import Reveal from '../../Components/Landing/Reveal'
import ReviewShowcase from '../../Components/Landing/ReviewShowcase'
import ScrollStage from '../../Components/Landing/ScrollStage'
import SectionHeading from '../../Components/Landing/SectionHeading'
import SpotlightCard from '../../Components/Landing/SpotlightCard'
import Ticker from '../../Components/Landing/Ticker'
import TypingCode from '../../Components/Landing/TypingCode'
import { INSTITUTE, telLink } from '../../utils/instituteInfo'
import {
  GENERAL_ENQUIRY_LINK,
  JOIN_STEPS,
  LEARNING_MODES,
  PORTAL_FEATURES,
} from '../../utils/landingContent'

const HERO_FACTS = [
  { icon: Clock, label: `Open ${INSTITUTE.openingHours}` },
  { icon: Monitor, label: 'Classroom + online' },
  { icon: MapPin, label: INSTITUTE.city },
]

const LandingPage = () => (
  <LandingLayout>
    {/* Hero — the promise, and the editor that backs it up, side by side. */}
    <section className="mx-auto grid max-w-7xl items-center gap-16 px-4 pb-16 pt-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-20 lg:pt-24 lg:px-8">
      <div>
        <Reveal className="inline-flex items-center gap-3 rounded-full border border-blue-500/25 bg-blue-500/10 px-4 py-2 font-code text-[11px] uppercase tracking-[0.16em] text-blue-700 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-200">
          <span className="animate-breathe h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-300" />
          {INSTITUTE.city} · since {INSTITUTE.since}
        </Reveal>

        <Reveal delay={0.06} as="h1" className="mt-7 font-display text-[2.6rem] font-bold leading-[1.03] tracking-tight text-balance text-slate-900 sm:text-6xl lg:text-[4.1rem] dark:text-white">
          Nobody learns to code by{' '}
          <span className="bg-linear-to-r from-blue-600 via-indigo-500 to-cyan-400 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300">
            watching
          </span>{' '}
          someone else do it.
        </Reveal>

        <Reveal delay={0.12} as="p" className="mt-7 max-w-xl text-lg leading-relaxed text-pretty text-slate-600 sm:text-xl dark:text-slate-300">
          Python and SQL, taught at a keyboard. Sit in our lab in Chandkheda or learn
          online in the student portal — and ask us anything on WhatsApp before you pay a
          rupee.
        </Reveal>

        <Reveal delay={0.18} className="mt-9 flex flex-wrap gap-3">
          <LandingButton href={GENERAL_ENQUIRY_LINK} variant="whatsapp" size="lg">
            <MessageCircle className="h-5 w-5" />
            Message us on WhatsApp
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </LandingButton>

          <LandingButton href={telLink} variant="outline" size="lg">
            <Phone className="h-5 w-5" />
            Call {INSTITUTE.phoneDisplay}
          </LandingButton>
        </Reveal>

        <Reveal delay={0.24} className="mt-10 flex flex-wrap gap-x-7 gap-y-3">
          {HERO_FACTS.map((fact) => (
            <span key={fact.label} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <fact.icon className="h-4 w-4 text-blue-600 dark:text-cyan-300" />
              {fact.label}
            </span>
          ))}
        </Reveal>
      </div>

      <Reveal delay={0.1} distance={36}>
        <TypingCode />
      </Reveal>
    </section>

    <Ticker />

    {/* The scroll-driven scene: three months of a course, told in one movement. */}
    <ScrollStage />

    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeading
        index={1}
        eyebrow="The student portal"
        title="Class ends. The learning doesn't."
      >
        Every student gets a login to our own portal — built by us, for our classroom.
        It is where you practise, revise and get unstuck.
      </SectionHeading>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PORTAL_FEATURES.map((feature, index) => (
          <Reveal key={feature.title} delay={(index % 3) * 0.07} className="h-full">
            <SpotlightCard className="h-full p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/25 bg-linear-to-br from-blue-500/20 to-indigo-500/10 text-blue-700 transition-transform duration-500 group-hover:-translate-y-1 dark:border-cyan-300/20 dark:text-cyan-200">
                <feature.icon className="h-5 w-5" />
              </span>

              <h3 className="mt-6 font-display text-lg font-semibold text-slate-900 dark:text-white">
                {feature.title}
              </h3>

              <p className="mt-3 text-[0.95rem] leading-relaxed text-pretty text-slate-600 dark:text-slate-400">
                {feature.body}
              </p>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeading
        index={2}
        eyebrow="Two ways to learn"
        title="Come to the lab, or stay home. Same course."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {LEARNING_MODES.map((mode, index) => (
          <Reveal key={mode.tag} delay={index * 0.08} className="h-full">
            <SpotlightCard className="h-full p-8 sm:p-10" glow="oklch(0.75 0.14 195)">
              <span className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/15 blur-3xl dark:bg-cyan-400/10" />

              <p className="font-code text-[11px] uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
                {mode.tag}
              </p>

              <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {mode.title}
              </h3>

              <p className="mt-4 text-[0.95rem] leading-relaxed text-pretty text-slate-600 dark:text-slate-300">
                {mode.body}
              </p>

              <ul className="mt-7 grid gap-3">
                {mode.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-[0.95rem] text-slate-700 dark:text-slate-300">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500 dark:bg-cyan-300" />
                    {point}
                  </li>
                ))}
              </ul>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeading
        index={3}
        eyebrow="How to join"
        title="Three steps. No forms, no fees to enquire."
      />

      <div className="grid gap-5 md:grid-cols-3">
        {JOIN_STEPS.map((step, index) => (
          <Reveal key={step.n} delay={index * 0.08} className="h-full">
            <SpotlightCard className="h-full p-8">
              <p className="font-display text-5xl font-bold text-transparent [-webkit-text-stroke:1.4px_rgba(59,130,246,0.5)] dark:[-webkit-text-stroke:1.4px_rgba(103,232,249,0.45)]">
                {step.n}
              </p>

              <h3 className="mt-6 font-display text-lg font-semibold text-slate-900 dark:text-white">
                {step.title}
              </h3>

              <p className="mt-3 text-[0.95rem] leading-relaxed text-pretty text-slate-600 dark:text-slate-400">
                {step.body}
              </p>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeading
        index={4}
        eyebrow="Questions"
        align="center"
        title="The things people ask before joining"
      />

      <Reveal>
        <FaqList />
      </Reveal>
    </section>

    {/* Written by students, picked by the institute. Absent until there is
        something picked to show. */}
    <ReviewShowcase />
  </LandingLayout>
)

export default LandingPage
