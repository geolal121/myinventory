import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

import Button from './Button.jsx'

function Modal({
  isOpen,
  title,
  description = '',
  children,
  onClose,
  footer = null,
  className = '',
}) {
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return undefined

    const originalOverflow = document.body.style.overflow
    const previouslyFocusedElement = document.activeElement
    const dialog = dialogRef.current
    const getFocusableElements = () =>
      Array.from(
        dialog?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) || [],
      )
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()

      if (focusableElements.length === 0) {
        event.preventDefault()
        dialog?.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    const focusFrame = window.requestAnimationFrame(() => {
      const firstFocusableElement = getFocusableElements()[0]

      if (firstFocusableElement) {
        firstFocusableElement.focus()
      } else {
        dialog?.focus()
      }
    })

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedElement?.focus?.()
    }
  }, [isOpen])

  if (!isOpen) return null

  const classes = ['ui-modal', className].filter(Boolean).join(' ')

  return (
    <div
      className="ui-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className={classes}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex="-1"
      >
        <header className="ui-modal__header">
          <div>
            <h2 id={titleId}>{title}</h2>

            {description && (
              <p id={descriptionId} className="ui-modal__description">
                {description}
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ui-modal__close"
            onClick={onClose}
            aria-label="Close modal"
            title="Close"
          >
            <X size={20} aria-hidden="true" />
          </Button>
        </header>

        <div className="ui-modal__body">{children}</div>

        {footer && <footer className="ui-modal__footer">{footer}</footer>}
      </section>
    </div>
  )
}

export default Modal
