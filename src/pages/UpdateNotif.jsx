import { useState, useEffect } from 'react'
import BrandMark from '../components/BrandMark.jsx'
import './UpdateNotif.css'

export default function UpdateNotif() {
  const [info, setInfo] = useState(null)
  const [theme, setTheme] = useState('light')
  const [scheme, setScheme] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

  useEffect(() => {
    window.electronAPI?.getUpdateInfo?.().then(i => { if (i) setInfo(i) })
    window.electronAPI?.getSettings?.().then(s => { if (s?.theme) setTheme(s.theme) })
  }, [])

  useEffect(() => {
    const m = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!m) return
    const fn = () => setScheme(m.matches ? 'dark' : 'light')
    m.addEventListener('change', fn)
    return () => m.removeEventListener('change', fn)
  }, [])

  const effectiveTheme = theme === 'system' ? scheme : theme

  // Auto-dismiss after 9 s (matches progress bar)
  useEffect(() => {
    const id = setTimeout(() => window.electronAPI?.closeUpdateNotif?.(), 9000)
    return () => clearTimeout(id)
  }, [])

  const openUpdate = () => {
    if (info?.url) window.electronAPI?.openExternal?.(info.url)
    window.electronAPI?.closeUpdateNotif?.()
  }

  const dismiss = () => window.electronAPI?.closeUpdateNotif?.()

  return (
    <div className="un-root" data-theme={effectiveTheme}>
      {/* ── Title bar (matches dashboard) ───────────────────────────────────── */}
      <div className="un-titlebar">
        <div className="un-tb-left">
          <BrandMark size={18} variant="full" theme={effectiveTheme} className="un-brand" alt="Rephrase" />
          <span className="un-tb-sep" />
          <span className="un-tb-tag">Update available</span>
        </div>
        <button className="un-close" onClick={dismiss} title="Dismiss">
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── Body (matches dashboard card style) ─────────────────────────────── */}
      <div className="un-body">
        <div className="un-version-pill">v{info?.version ?? '…'}</div>
        <p className="un-notes">{info?.notes ?? 'New features and improvements are ready to install.'}</p>
      </div>

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="un-actions">
        <button className="un-btn un-btn--primary" onClick={openUpdate}>Update Now</button>
        <button className="un-btn un-btn--ghost"   onClick={dismiss}>Later</button>
      </div>

      {/* ── Progress bar (auto-dismiss countdown) ───────────────────────────── */}
      <div className="un-progress" />
    </div>
  )
}
