import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initTelegram } from './lib/telegram'

// No-op when opened outside Telegram (see lib/telegram.ts) — the same app keeps working as
// a normal mobile website.
initTelegram()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
