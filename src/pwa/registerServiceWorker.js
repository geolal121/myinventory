export const registerMyInventoryServiceWorker = () => {
  if (
    import.meta.env.DEV ||
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        registration.update().catch(() => {})

        const checkForUpdates = () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {})
          }
        }

        document.addEventListener('visibilitychange', checkForUpdates)
      })
      .catch((error) => {
        console.warn('MyInventory offline support could not start:', error)
      })
  })
}
