import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { isNativeApp, listenForNativeNotificationTaps } from './nativePush'

// Native pakette Service Worker yok/gereksiz; bildirimler FCM ile gelir.
if (isNativeApp) {
  listenForNativeNotificationTaps()
} else if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration is optional; the app still works without it.
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
