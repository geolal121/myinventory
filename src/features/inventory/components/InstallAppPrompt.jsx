import { useEffect, useState } from 'react'
import { Download, Share, Smartphone, X } from 'lucide-react'

import Button from '../../../shared/components/Button.jsx'

const DISMISS_KEY = 'myinventory_install_prompt_dismissed_at'
const DISMISS_DURATION = 30 * 24 * 60 * 60 * 1000

const isRunningStandalone = () => {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

const isIosDevice = () => {
  const userAgent = window.navigator.userAgent

  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (window.navigator.platform === 'MacIntel' &&
      window.navigator.maxTouchPoints > 1)
  )
}

const wasRecentlyDismissed = () => {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0)
    return Date.now() - dismissedAt < DISMISS_DURATION
  } catch {
    return false
  }
}

function InstallAppPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showIosInstructions, setShowIosInstructions] = useState(
    () => !isRunningStandalone() && isIosDevice(),
  )
  const [isDismissed, setIsDismissed] = useState(() => wasRecentlyDismissed())

  useEffect(() => {
    if (isRunningStandalone() || isDismissed) return undefined

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }
    const handleInstalled = () => {
      setInstallPrompt(null)
      setShowIosInstructions(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [isDismissed])

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // Dismissing the suggestion still works when storage is unavailable.
    }

    setIsDismissed(true)
  }

  const handleInstall = async () => {
    if (!installPrompt) return

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice

    setInstallPrompt(null)
    if (choice.outcome === 'accepted') dismiss()
  }

  if (isDismissed || (!installPrompt && !showIosInstructions)) return null

  return (
    <aside className="inventory-install" aria-label="Install MyInventory">
      <span className="inventory-install__icon" aria-hidden="true">
        <Smartphone size={22} />
      </span>
      <div className="inventory-install__content">
        <strong>
          {showIosInstructions
            ? 'Add MyInventory to your Home Screen'
            : 'Install MyInventory on this device'}
        </strong>
        <p>
          {showIosInstructions
            ? 'Tap Share, then Add to Home Screen for faster access and better offline loading.'
            : 'Open it like an app and keep the app available when your signal drops.'}
        </p>
      </div>

      {showIosInstructions ? (
        <span className="inventory-install__ios-step">
          <Share size={16} aria-hidden="true" />
          Share
        </span>
      ) : (
        <Button size="sm" onClick={handleInstall}>
          <Download size={16} aria-hidden="true" />
          Install
        </Button>
      )}

      <button
        type="button"
        className="inventory-install__dismiss"
        onClick={dismiss}
        aria-label="Dismiss install suggestion"
        title="Dismiss"
      >
        <X size={17} aria-hidden="true" />
      </button>
    </aside>
  )
}

export default InstallAppPrompt
