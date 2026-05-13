import { useEffect } from 'react'

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
  useEffect(() => {
    if (!isOpen) return undefined

    const originalOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  const classes = ['ui-modal', className].filter(Boolean).join(' ')

  return (
    <div className="ui-modal-overlay" role="presentation">
      <section
        className={classes}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className="ui-modal__header">
          <div>
            <h2 id="modal-title">{title}</h2>

            {description && (
              <p className="ui-modal__description">{description}</p>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close modal"
          >
            Close
          </Button>
        </header>

        <div className="ui-modal__body">{children}</div>

        {footer && <footer className="ui-modal__footer">{footer}</footer>}
      </section>
    </div>
  )
}

export default Modal