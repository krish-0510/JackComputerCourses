import { Link } from 'react-router-dom'
import { useShowcasedContents } from '../../utils/content'
import { INSTITUTE, mailLink, telLink } from '../../utils/instituteInfo'
import { PUBLIC_NAV_LINKS } from '../../utils/landingContent'

const FooterLink = ({ children, ...props }) => (
  <Link
    {...props}
    className="w-fit text-sm text-slate-600 transition-colors hover:text-blue-700 dark:text-slate-400 dark:hover:text-cyan-300"
  >
    {children}
  </Link>
)

// The courses column names what the institute is actually running, so it reads the
// same showcased list the catalog does rather than a copy of it kept in the source.
// Until something is showcased it points at the catalog itself, so the column is
// never a heading with nothing under it.
const LandingFooter = () => {
  const { contents } = useShowcasedContents()

  return (
    <footer className="relative border-t border-slate-200/80 bg-white/50 backdrop-blur-xl dark:border-white/10 dark:bg-[#020617]/70">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 font-display text-lg font-bold text-white">
              J
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {INSTITUTE.brandFirst}
              <span className="text-blue-600 dark:text-cyan-300">{INSTITUTE.brandSecond}</span>
            </span>
          </div>

          <p className="mt-5 max-w-xs text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {INSTITUTE.legalName} — computer and programming classes in {INSTITUTE.city}.
            Teaching since {INSTITUTE.since}.
          </p>

          <p className="mt-5 text-sm leading-relaxed text-slate-500 dark:text-slate-500">
            {INSTITUTE.shortAddress}
          </p>
        </div>

        <div>
          <p className="font-code text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Pages</p>
          <div className="mt-5 grid gap-3">
            {PUBLIC_NAV_LINKS.map((link) => (
              <FooterLink key={link.to} to={link.to}>{link.label}</FooterLink>
            ))}
            <FooterLink to="/login">Student login</FooterLink>
          </div>
        </div>

        <div>
          <p className="font-code text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Courses</p>
          <div className="mt-5 grid gap-3">
            {contents.length ? contents.map((content) => (
              <FooterLink key={content._id} to="/courses">{content.name}</FooterLink>
            )) : (
              <FooterLink to="/courses">See the catalog</FooterLink>
            )}
          </div>
        </div>

        <div>
          <p className="font-code text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Reach us</p>
          <div className="mt-5 grid gap-3 text-sm">
            <a href={telLink} className="w-fit text-slate-600 transition-colors hover:text-blue-700 dark:text-slate-400 dark:hover:text-cyan-300">
              {INSTITUTE.phoneDisplay}
            </a>
            <a href={mailLink} className="w-fit wrap-break-word text-slate-600 transition-colors hover:text-blue-700 dark:text-slate-400 dark:hover:text-cyan-300">
              {INSTITUTE.email}
            </a>
            <span className="text-slate-500 dark:text-slate-500">{INSTITUTE.openingHours}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-slate-200/70 px-4 py-6 text-xs text-slate-500 sm:px-6 lg:px-8 dark:border-white/5 dark:text-slate-500">
        <span>© {new Date().getFullYear()} {INSTITUTE.legalName}, Ahmedabad.</span>
        <span className="font-code">Made for students who ask questions.</span>
      </div>
    </footer>
  )
}

export default LandingFooter
