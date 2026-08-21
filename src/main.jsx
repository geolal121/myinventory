import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.jsx'
import { registerMyInventoryServiceWorker } from './pwa/registerServiceWorker.js'
import './shared/styles/globals.css'

registerMyInventoryServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
