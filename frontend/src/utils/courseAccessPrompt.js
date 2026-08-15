import { Lock } from 'lucide-react'
import { useCallback } from 'react'
import { useConfirm } from '../Context/ConfirmContext'
import { formatAccessEnd } from './courseAccess'
import { INSTITUTE, whatsappLink } from './instituteInfo'

// A course whose window has closed still sits on the shelf, so a click on it is a question
// the app has to answer rather than a dead card: it says when access ended and hands over
// the only thing that reopens it — the admin. It goes through the app's own confirm dialog
// so it backs out on Escape, on the backdrop and on the button like every other dialog,
// and every list that can show an ended course asks through here so the wording, and the
// chat it opens, are the same wherever it is clicked.
export const useCourseAccessEndedPrompt = () => {
  const confirm = useConfirm()

  return useCallback(async (course) => {
    const endDate = formatAccessEnd(course)

    const shouldMessageAdmin = await confirm({
      title: 'Your access to this course has ended',
      description: `${endDate ? `Access ended on ${endDate}. ` : ''}Contact the admin to get more time on this course.`,
      subject: course.title,
      note: `${INSTITUTE.phoneDisplay} · ${INSTITUTE.openingHours}`,
      confirmLabel: 'Message admin',
      cancelLabel: 'Close',
      tone: 'warning',
      icon: Lock,
    })

    if (!shouldMessageAdmin) {
      return
    }

    // The chat opens already saying which course it is about, the way every other enquiry
    // on the site does, so the admin is not asked to guess.
    window.open(
      whatsappLink(`Hi ${INSTITUTE.legalName}, my access to the ${course.title} course has ended. I want more time on it.`),
      '_blank',
      'noopener',
    )
  }, [confirm])
}
