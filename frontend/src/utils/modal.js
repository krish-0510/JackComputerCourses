import { useEffect } from 'react'

// Two things are true of every dialog in the app, whether it is admin chrome or a pane
// of glass on the public site: Escape closes it, and the page behind it holds its place
// instead of drifting away underneath. Both live here, so a new dialog is what it says
// rather than another copy of how a dialog behaves.
export const useDialogBehaviour = ({ onClose, busy = false }) => {
  // Escape closes it the same way the header button does, but never mid-save: the
  // request is already out and its result still belongs in this dialog.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])
}
