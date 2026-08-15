import { Loader2, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { useShowcasedContents } from '../../utils/content'
import { INSTITUTE, whatsappLink } from '../../utils/instituteInfo'
import LandingButton from './LandingButton'

const UNDECIDED = 'Not decided yet'

const FIELD_CLASS = 'w-full rounded-2xl border border-slate-200 bg-white/70 px-4 py-3.5 text-slate-900 outline-none transition duration-300 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-300/60 dark:focus:ring-cyan-400/10'

const Field = ({ children, error, label }) => (
  <label className="grid gap-2">
    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
    {children}
    {error ? <span className="text-xs font-medium text-red-600 dark:text-red-400">{error}</span> : null}
  </label>
)

// An enquiry that never touches a server. The institute answers on WhatsApp, so the form
// writes the message the visitor would have had to type and hands it to WhatsApp with
// their details already in it. Nothing typed here is stored or sent anywhere else.
const EnquiryForm = () => {
  // The courses offered are fetched rather than listed here, and an enquiry can be
  // sent before they arrive, so the form starts on the one answer that is always
  // true and the visitor narrows it if they want to.
  const { contents } = useShowcasedContents()
  const [form, setForm] = useState({ name: '', phone: '', course: UNDECIDED, message: '' })
  const [errors, setErrors] = useState({})
  const [isSending, setIsSending] = useState(false)

  const update = (key) => (event) => {
    const { value } = event.target

    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => (current[key] ? { ...current, [key]: '' } : current))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const trimmedName = form.name.trim()
    const digits = form.phone.replace(/\D/g, '')
    const nextErrors = {}

    if (!trimmedName) {
      nextErrors.name = 'Please tell us your name.'
    }

    if (digits.length !== 10) {
      nextErrors.phone = 'Enter a 10-digit mobile number so we can call you back.'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length) {
      return
    }

    setIsSending(true)

    const lines = [
      `Hi ${INSTITUTE.legalName}.`,
      `Name: ${trimmedName}`,
      `Phone: ${digits}`,
      `Course: ${form.course}`,
    ]

    if (form.message.trim()) {
      lines.push(`Question: ${form.message.trim()}`)
    }

    const opened = window.open(whatsappLink(lines.join('\n')), '_blank', 'noopener')

    setIsSending(false)

    if (!opened) {
      setErrors({
        form: `Your browser blocked the WhatsApp window. Message us directly on ${INSTITUTE.phoneDisplay}.`,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      <Field label="Your name" error={errors.name}>
        <input
          type="text"
          value={form.name}
          onChange={update('name')}
          placeholder="e.g. Priya Patel"
          className={FIELD_CLASS}
        />
      </Field>

      <Field label="Phone number" error={errors.phone}>
        <input
          type="tel"
          inputMode="numeric"
          value={form.phone}
          onChange={update('phone')}
          placeholder="10-digit mobile"
          className={FIELD_CLASS}
        />
      </Field>

      <Field label="Course you are interested in">
        <select value={form.course} onChange={update('course')} className={`${FIELD_CLASS} cursor-pointer appearance-none`}>
          {contents.map((content) => (
            <option key={content._id} value={content.name} className="bg-white dark:bg-slate-900">
              {content.name}
            </option>
          ))}
          <option value={UNDECIDED} className="bg-white dark:bg-slate-900">{UNDECIDED}</option>
        </select>
      </Field>

      <Field label="Anything you want to ask">
        <textarea
          rows={3}
          value={form.message}
          onChange={update('message')}
          placeholder="Timings? Fees? Can I do it with my job?"
          className={`${FIELD_CLASS} resize-y`}
        />
      </Field>

      {errors.form ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {errors.form}
        </p>
      ) : null}

      <LandingButton type="submit" variant="whatsapp" size="lg" disabled={isSending} className="w-full">
        {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
        {isSending ? 'Opening WhatsApp' : 'Send on WhatsApp'}
      </LandingButton>
    </form>
  )
}

export default EnquiryForm
