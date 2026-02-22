import { useEffect } from 'react'
import './AuthWindow.css'

// Base authentication: treat all users as authenticated and go straight to dashboard.
// No Supabase or login form — if #auth loads, we immediately redirect.
export default function AuthWindow() {
  useEffect(() => {
    const baseSession = {
      userId:       'base',
      email:        null,
      accessToken:  null,
      refreshToken: null,
      expiresAt:    Date.now() + 86400000 * 365,   // 1 year
    }
    window.electronAPI?.switchToDashboard?.(baseSession)
  }, [])

  return (
    <div className="aw-root aw-redirect">
      <div className="aw-redirect-inner">
        <span className="aw-redirect-text">Opening dashboard…</span>
      </div>
    </div>
  )
}
