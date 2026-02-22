import { useState, useEffect, useRef, useCallback } from 'react'
import BrandMark from '../components/BrandMark.jsx'
import SettingsContent, { SETTINGS_NAV } from './SettingsContent.jsx'
import './SettingsWindow.css'

export default function SettingsWindow() {
  const [section,     setSection]  = useState('general')
  const [isMaximized, setMaximized] = useState(false)
  const [toast,       setToast]    = useState(null)   // { msg, id }
  const [theme,       setTheme]    = useState('light')
  const [appVersion,  setAppVersion] = useState('…')

  useEffect(() => {
    window.electronAPI?.getAppVersion?.().then(v => { if (v) setAppVersion(v) })
    const c1 = window.electronAPI?.onWindowMaximized?.(()   => setMaximized(true))
    const c2 = window.electronAPI?.onWindowUnmaximized?.(() => setMaximized(false))
    return () => { c1?.(); c2?.() }
  }, [])

  const [scheme, setScheme] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  useEffect(() => {
    const m = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!m) return
    const fn = () => setScheme(m.matches ? 'dark' : 'light')
    m.addEventListener('change', fn)
    return () => m.removeEventListener('change', fn)
  }, [])

  const showToast = (msg) => {
    const id = Date.now()
    setToast({ msg, id })
    setTimeout(() => setToast(t => t?.id === id ? null : t), 3200)
  }

  const effectiveTheme = theme === 'system' ? scheme : theme

  return (
    <div className="sw-root" data-theme={effectiveTheme}>

      {/* ── Toast notification ──────────────────────────────────────── */}
      {toast && (
        <div className="sw-toast" key={toast.id}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {toast.msg}
        </div>
      )}

      {/* ── Custom title bar ────────────────────────────────────────── */}
      <TitleBar
        section={SETTINGS_NAV.find(n => n.id === section)?.label ?? 'Settings'}
        isMaximized={isMaximized}
        theme={effectiveTheme}
      />

      <div className="sw-layout">

        {/* ── Sidebar ───────────────────────────────────────────────── */}
        <aside className="sw-sidebar">
          <p className="sw-sidebar-heading">SETTINGS</p>
          <nav className="sw-nav">
            {SETTINGS_NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`sw-nav-item ${section === id ? 'active' : ''}`}
                onClick={() => setSection(id)}
              >
                <Icon />
                {label}
              </button>
            ))}
          </nav>
          <div className="sw-sidebar-footer">
            <span className="sw-version">v{appVersion}</span>
          </div>
        </aside>

        {/* ── Content ───────────────────────────────────────────────── */}
        <main className="sw-content" key={section}>
          <div className="sw-content-header">
            <h1 className="sw-title">{SETTINGS_NAV.find(n => n.id === section)?.label}</h1>
          </div>
          <SettingsContent section={section} onShowToast={showToast} onThemeChange={setTheme} />
        </main>

      </div>
    </div>
  )
}

// ── Custom title bar ──────────────────────────────────────────────────────────

function TitleBar({ section, isMaximized, theme }) {
  const startPos = useRef(null)

  const onDown = useCallback((e) => {
    if (isMaximized || e.button !== 0) return
    startPos.current = { x: e.screenX, y: e.screenY }
    const onMove = (ev) => {
      if (!startPos.current) return
      window.electronAPI?.moveWindow({ dx: ev.screenX - startPos.current.x, dy: ev.screenY - startPos.current.y })
      startPos.current = { x: ev.screenX, y: ev.screenY }
    }
    const onUp = () => { startPos.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [isMaximized])

  return (
    <div className="sw-titlebar" onMouseDown={onDown}>
      <div className="sw-tb-left">
        <BrandMark size={20} variant="full" theme={theme} className="sw-brandlogo" alt="TransFlow" />
        <span className="sw-tb-section">{section}</span>
      </div>
      <div className="sw-wc-group" onMouseDown={e => e.stopPropagation()}>
        <button className="sw-wc sw-wc-min"   onClick={() => window.electronAPI?.minimize()} title="Minimize">
          <svg width="10" height="1" viewBox="0 0 10 1"><line x1="0" y1="0.5" x2="10" y2="0.5" stroke="currentColor" strokeWidth="1.2"/></svg>
        </button>
        <button className="sw-wc sw-wc-max"   onClick={() => window.electronAPI?.maximize()} title={isMaximized ? 'Restore' : 'Maximize'}>
          {isMaximized
            ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.1"><rect x="2" y="0" width="8" height="8"/><path d="M0 2v8h8"/></svg>
            : <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="0.5" y="0.5" width="9" height="9"/></svg>
          }
        </button>
        <button className="sw-wc sw-wc-close" onClick={() => window.electronAPI?.close()} title="Close">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
        </button>
      </div>
    </div>
  )
}
