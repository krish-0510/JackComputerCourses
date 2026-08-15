import { Lock } from 'lucide-react'
import { useCallback } from 'react'
import { useAdminContactPrompt } from './adminContactPrompt'
import { formatAccessEnd } from './courseAccess'

// A course whose window has closed still sits on the shelf, so a click on it is a question
// the app has to answer rather than a dead card: it says when access ended and hands over
// the only person who can reopen it. Every list that can show an ended course asks through
// here, so the wording, and the chat it opens, are the same wherever it is clicked.
export const useCourseAccessEndedPrompt = () => {
  const promptAdminContact = useAdminContactPrompt()

  return useCallback((course) => {
    const endDate = formatAccessEnd(course)

    return promptAdminContact({
      title: 'Your access to this course has ended',
      description: `${endDate ? `Access ended on ${endDate}. ` : ''}Contact the admin to get more time on this course.`,
      subject: course.title,
      chatMessage: `my access to the ${course.title} course has ended. I want more time on it.`,
      icon: Lock,
    })
  }, [promptAdminContact])
}
