import { useCallback } from 'react'
import { useConfirm } from '../Context/ConfirmContext'
import { INSTITUTE, whatsappLink } from './instituteInfo'

// Some refusals are not the person's to fix — a course window that has closed, an account
// the admin has blocked — and saying so is only half an answer. Every one of them is put
// the same way: the app's own dialog (so it backs out on Escape, on the backdrop and on the
// button like every other dialog) says what happened, and the button beside it opens a chat
// that already says what it is about. One shape, so it is learned once and never has to be
// worked out again from a different-looking screen.
export const useAdminContactPrompt = () => {
  const confirm = useConfirm()

  return useCallback(async ({
    title,
    description,
    subject,
    chatMessage,
    icon,
    confirmLabel = 'Message admin',
  }) => {
    const shouldMessageAdmin = await confirm({
      title,
      description,
      subject,
      // The number is worth carrying whether or not the chat is how they get in touch.
      note: `${INSTITUTE.phoneDisplay} · ${INSTITUTE.openingHours}`,
      confirmLabel,
      cancelLabel: 'Close',
      tone: 'warning',
      icon,
    })

    if (!shouldMessageAdmin) {
      return
    }

    window.open(whatsappLink(`Hi ${INSTITUTE.legalName}, ${chatMessage}`), '_blank', 'noopener')
  }, [confirm])
}
