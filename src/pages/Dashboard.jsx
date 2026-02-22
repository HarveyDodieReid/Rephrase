import { useState, useEffect, useRef, useCallback } from 'react'
import BrandMark from '../components/BrandMark.jsx'
import SplashScreen from '../components/SplashScreen.jsx'
import SettingsContent, { SETTINGS_NAV } from './SettingsContent.jsx'
import './SettingsWindow.css'   // re-use all the settings styles
import './Dashboard.css'

// ── Time helpers ───────────────────────────────────────────────────────────────
function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)   return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

// ── Group transcripts by date label ───────────────────────────────────────────
function groupTranscripts(list) {
  const today     = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const weekAgo   = new Date(today); weekAgo.setDate(today.getDate() - 7)

  const map = new Map()
  for (const t of list) {
    const d = new Date(t.timestamp); d.setHours(0, 0, 0, 0)
    let label
    if (d >= today)         label = 'Today'
    else if (d >= yesterday) label = 'Yesterday'
    else if (d >= weekAgo)   label = 'This week'
    else                     label = d.toLocaleDateString([], { month: 'long', year: 'numeric' })
    if (!map.has(label)) map.set(label, [])
    map.get(label).push(t)
  }

  const result = []
  for (const [label, items] of map) result.push({ label, items })
  return result
}

// ── Top-level nav ──────────────────────────────────────────────────────────────
const TOP_NAV = [
  { id: 'home',        label: 'Home',        icon: HomeIcon        },
  { id: 'transcripts', label: 'Transcripts', icon: TranscriptIcon  },
  { id: 'settings',    label: 'Settings',    icon: SettingsIcon    },
]

export default function Dashboard() {
  const [section,      setSection]      = useState('home')
  const [settingsTab,  setSettingsTab]  = useState('general')
  const [computerName, setComputerName] = useState('')
  const [userEmail,    setUserEmail]    = useState('')
  const [userAvatar,   setUserAvatar]   = useState(null)
  const [transcripts,  setTranscripts]  = useState([])
  const [copied,       setCopied]       = useState(null)
  const [isMaximized,  setMaximized]    = useState(false)
  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [toast,        setToast]        = useState(null)
  const [updateInfo,   setUpdateInfo]   = useState(null)   // null | { version, url, notes }
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [showSplash,   setShowSplash]   = useState(true)
  const [theme,        setTheme]        = useState('light')
  const [scheme,       setScheme]       = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  const startPos = useRef(null)

  const effectiveTheme = theme === 'system' ? scheme : theme

  // Load data & set up IPC listeners
  useEffect(() => {
    window.electronAPI?.getComputerName?.().then(n => { if (n) setComputerName(n) })
    window.electronAPI?.getAuthState?.().then(s => { if (s?.email) setUserEmail(s.email) })
    window.electronAPI?.getTranscripts?.().then(t => { if (t) setTranscripts(t) })
    window.electronAPI?.getUserAvatar?.().then(a => { if (a) setUserAvatar(a) })
    window.electronAPI?.getSettings?.().then(s => { if (s?.theme) setTheme(s.theme) })

    const c1 = window.electronAPI?.onWindowMaximized?.(()   => setMaximized(true))
    const c2 = window.electronAPI?.onWindowUnmaximized?.(() => setMaximized(false))
    const c3 = window.electronAPI?.onNewTranscript?.((t) => {
      setTranscripts(prev => [t, ...prev])
    })

    window.electronAPI?.checkForUpdate?.().then(info => {
      if (info) setUpdateInfo(info)
    })

    const u1 = window.electronAPI?.onUpdateAvailable?.(i => { setUpdateInfo(i); setUpdateDownloaded(false) })
    const u2 = window.electronAPI?.onUpdateDownloaded?.(() => setUpdateDownloaded(true))

    return () => { c1?.(); c2?.(); c3?.(); u1?.(); u2?.() }
  }, [])

  // Prefers-color-scheme for system theme
  useEffect(() => {
    const m = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!m) return
    const fn = () => setScheme(m.matches ? 'dark' : 'light')
    m.addEventListener('change', fn)
    return () => m.removeEventListener('change', fn)
  }, [])

  // Title-bar drag
  const onTitleDown = useCallback((e) => {
    if (isMaximized || e.button !== 0) return
    startPos.current = { x: e.screenX, y: e.screenY }
    const onMove = (ev) => {
      if (!startPos.current) return
      window.electronAPI?.moveWindow({ dx: ev.screenX - startPos.current.x, dy: ev.screenY - startPos.current.y })
      startPos.current = { x: ev.screenX, y: ev.screenY }
    }
    const onUp = () => {
      startPos.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
  }, [isMaximized])

  // Actions
  const copyTranscript = (t) => {
    navigator.clipboard.writeText(t.text).catch(() => {
      const el = document.createElement('textarea')
      el.value = t.text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    })
    setCopied(t.id)
    setTimeout(() => setCopied(c => c === t.id ? null : c), 1800)
  }

  const deleteTranscript = async (id) => {
    await window.electronAPI?.deleteTranscript?.(id)
    setTranscripts(prev => prev.filter(t => t.id !== id))
  }

  const clearAll = async () => {
    await window.electronAPI?.clearTranscripts?.()
    setTranscripts([])
  }

  const signOut = async () => {
    await window.electronAPI?.signOut?.()
  }

  const openUpdate = () => {
    if (updateDownloaded && window.electronAPI?.installUpdate) {
      window.electronAPI.installUpdate()
    } else if (window.electronAPI?.downloadUpdate) {
      window.electronAPI.downloadUpdate()
    } else if (updateInfo?.url && window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(updateInfo.url)
    }
  }

  const showToast = (msg) => {
    const id = Date.now()
    setToast({ msg, id })
    setTimeout(() => setToast(t => t?.id === id ? null : t), 3200)
  }

  // Derived
  const sectionLabel = section === 'settings'
    ? (SETTINGS_NAV.find(n => n.id === settingsTab)?.label ?? 'Settings')
    : TOP_NAV.find(n => n.id === section)?.label ?? ''

  const filteredTranscripts = searchQuery.trim()
    ? transcripts.filter(t => t.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : transcripts

  const totalWords = transcripts.reduce((sum, t) => sum + t.text.split(/\s+/).filter(Boolean).length, 0)
  const avgWords   = transcripts.length > 0 ? Math.round(totalWords / transcripts.length) : 0

  return (
    <div className="db-root" data-theme={effectiveTheme}>
      {showSplash && (
        <SplashScreen duration={3200} onComplete={() => setShowSplash(false)} />
      )}

      {/* ── Toast ────────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="sw-toast" key={toast.id}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {toast.msg}
        </div>
      )}

      {/* ── Title bar ────────────────────────────────────────────────────────── */}
      <div className="db-titlebar" onMouseDown={onTitleDown}>
        <div className="db-tb-left">
          <button
            className="db-sidebar-toggle"
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setSidebarOpen(o => !o)}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            <HamburgerIcon />
          </button>
          <BrandMark size={20} variant="full" theme={effectiveTheme} className="db-brandlogo" alt="Rephrase" />
          <span className="db-tb-sep" />
          <span className="db-tb-section">{sectionLabel}</span>
        </div>
        <div className="db-wc-group" onMouseDown={e => e.stopPropagation()}>
          <button className="db-wc db-wc-min" onClick={() => window.electronAPI?.minimize()} title="Minimize">
            <svg width="10" height="1" viewBox="0 0 10 1"><line x1="0" y1="0.5" x2="10" y2="0.5" stroke="currentColor" strokeWidth="1.2"/></svg>
          </button>
          <button className="db-wc db-wc-max" onClick={() => window.electronAPI?.maximize()} title={isMaximized ? 'Restore' : 'Maximize'}>
            {isMaximized
              ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.1"><rect x="2" y="0" width="8" height="8"/><path d="M0 2v8h8"/></svg>
              : <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="0.5" y="0.5" width="9" height="9"/></svg>
            }
          </button>
          <button className="db-wc db-wc-close" onClick={() => window.electronAPI?.close()} title="Close">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>

      {/* ── Sticky update notification (toast style, always visible when update available) ─ */}
      {updateInfo && (
        <div className="db-update-sticky">
          <UpdateIcon />
          <span className="db-update-sticky-text">
            {updateDownloaded ? 'Update ready — restart to install' : `New version v${updateInfo.version} available`}
          </span>
          <button className="db-update-sticky-btn" onClick={openUpdate}>
            {updateDownloaded ? 'Restart to update' : 'Update Now'}
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 6h8M6 2l4 4-4 4"/>
            </svg>
          </button>
          <button className="db-update-sticky-dismiss" onClick={() => setUpdateInfo(null)} aria-label="Dismiss">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </button>
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="db-body">

        {/* ── Sidebar wrapper (controls layout space during animation) ──────── */}
        <div className={`db-sidebar-wrap${sidebarOpen ? '' : ' sidebar-closed'}`}>
          <aside className="db-sidebar">

            {/* User card */}
            <div className="db-user-card">
              <div className="db-avatar">
                {userAvatar
                  ? <img src={userAvatar} alt="profile" className="db-avatar-img" />
                  : (userEmail ? userEmail[0].toUpperCase() : '?')
                }
              </div>
              <div className="db-user-info">
                <span className="db-user-name">{computerName || 'My Computer'}</span>
                <span className="db-user-email">{userEmail}</span>
              </div>
            </div>

            {/* Primary nav */}
            <nav className="db-nav">
              {TOP_NAV.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`db-nav-item${section === id ? ' active' : ''}`}
                  onClick={() => setSection(id)}
                >
                  <Icon />
                  <span className="db-nav-label">{label}</span>
                  {id === 'transcripts' && transcripts.length > 0 && (
                    <span className="db-nav-badge">{transcripts.length > 99 ? '99+' : transcripts.length}</span>
                  )}
                </button>
              ))}
            </nav>

            {/* Settings sub-nav */}
            {section === 'settings' && (
              <div className="db-settings-subnav">
                <p className="db-subnav-heading">SETTINGS</p>
                {SETTINGS_NAV.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    className={`db-nav-item db-nav-sub${settingsTab === id ? ' active' : ''}`}
                    onClick={() => setSettingsTab(id)}
                  >
                    <Icon />
                    <span className="db-nav-label">{label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Sidebar footer */}
            <div className="db-sidebar-footer">
              {updateInfo && (
                <button className="db-update-now-btn" onClick={openUpdate}>
                  <UpdateIcon />
                  {updateDownloaded ? 'Restart to update' : 'Update Now'}
                  <span className="db-update-dot" />
                </button>
              )}
              <button className="db-signout-btn" onClick={signOut}>
                <SignOutIcon />
                Close
              </button>
              <span className="db-version">
                v1.0.0
                {updateInfo && <span className="db-version-new"> → v{updateInfo.version}</span>}
              </span>
            </div>
          </aside>
        </div>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <main className="db-content" key={section === 'settings' ? settingsTab : section}>

          {/* ── HOME ─────────────────────────────────────────────────────────── */}
          {section === 'home' && (
            <div className="db-home">
              <div className="db-hero">
                <h1 className="db-hero-title">
                  Welcome back{computerName ? `, ${computerName.split(' ')[0]}` : ''}
                </h1>
                <p className="db-hero-sub">
                  Voice transcripts and shortcuts at a glance. Start recording with your hotkey or use Composer to generate documents.
                </p>
              </div>

              {/* Stats */}
              <div className="db-stats-row">
                <div className="db-stat-card db-stat-card--primary">
                  <div className="db-stat-icon db-stat-icon--purple"><MicStatIcon /></div>
                  <div className="db-stat-body">
                    <span className="db-stat-value">{transcripts.length}</span>
                    <span className="db-stat-label">Transcripts</span>
                  </div>
                </div>
                <div className="db-stat-card">
                  <div className="db-stat-icon db-stat-icon--blue"><WordsStatIcon /></div>
                  <div className="db-stat-body">
                    <span className="db-stat-value">{avgWords}</span>
                    <span className="db-stat-label">Avg. words</span>
                  </div>
                </div>
                <div className="db-stat-card">
                  <div className="db-stat-icon db-stat-icon--green"><TotalStatIcon /></div>
                  <div className="db-stat-body">
                    <span className="db-stat-value">{totalWords}</span>
                    <span className="db-stat-label">Total words</span>
                  </div>
                </div>
              </div>

              {/* Shortcut hint card */}
              <div className="db-shortcut-hint">
                <div className="db-shortcut-hint-icon"><MicStatIcon /></div>
                <div className="db-shortcut-hint-body">
                  <span className="db-shortcut-hint-title">Quick start</span>
                  <span className="db-shortcut-hint-desc">
                    Hold <kbd>Ctrl</kbd> + <kbd><WinKeyIcon /></kbd> anywhere to record. Use <kbd>Alt</kbd> + <kbd><WinKeyIcon /></kbd> for Composer.
                  </span>
                </div>
              </div>

              {/* Recent transcripts preview */}
              {transcripts.length > 0 ? (
                <div className="db-recent">
                  <div className="db-section-header">
                    <h2 className="db-section-title">Recent transcripts</h2>
                    <button className="db-see-all" onClick={() => setSection('transcripts')}>
                      View all →
                    </button>
                  </div>
                  <div className="db-recent-grid">
                    {transcripts.slice(0, 3).map(t => (
                      <article key={t.id} className="db-recent-card">
                        <p className="db-recent-card-text">{t.text}</p>
                        <footer className="db-recent-card-footer">
                          <span className="db-recent-card-time">{relativeTime(t.timestamp)}</span>
                          <span className="db-recent-card-wc">{t.text.split(/\s+/).filter(Boolean).length} words</span>
                          <button
                            className={`db-recent-card-btn${copied === t.id ? ' copied' : ''}`}
                            onClick={() => copyTranscript(t)}
                            title="Copy"
                          >
                            {copied === t.id ? <CheckIcon /> : <CopyIcon />}
                            {copied === t.id ? 'Copied' : 'Copy'}
                          </button>
                        </footer>
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="db-empty-home">
                  <div className="db-empty-icon-wrap"><MicBigIcon /></div>
                  <p className="db-empty-title">No transcripts yet</p>
                  <p className="db-empty-sub">
                    Hold <kbd>Ctrl</kbd> + <kbd><WinKeyIcon /></kbd> anywhere to start recording.
                    Your transcripts will appear here automatically.
                  </p>
                  <button className="db-empty-cta" onClick={() => setSection('transcripts')}>
                    Go to Transcripts
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── TRANSCRIPTS ──────────────────────────────────────────────────── */}
          {section === 'transcripts' && (
            <div className="db-transcripts">
              <div className="db-transcripts-header">
                <div className="db-transcripts-header-left">
                  <h1 className="db-transcripts-title">Transcripts</h1>
                  {transcripts.length > 0 && (
                    <span className="db-transcripts-count">{transcripts.length} saved</span>
                  )}
                </div>
                {transcripts.length > 0 && (
                  <button className="db-clear-btn" onClick={clearAll}>Clear all</button>
                )}
              </div>

              {transcripts.length > 0 && (
                <div className="db-search-row">
                  <div className="db-search-wrap">
                    <SearchIcon />
                    <input
                      className="db-search-input"
                      type="text"
                      placeholder="Search transcripts…"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button className="db-search-clear" onClick={() => setSearchQuery('')} title="Clear search">
                        <CloseSmIcon />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {transcripts.length === 0 ? (
                <div className="db-empty db-empty-transcripts">
                  <div className="db-empty-icon-wrap"><TranscriptBigIcon /></div>
                  <p className="db-empty-title">No transcripts yet</p>
                  <p className="db-empty-sub">
                    Hold <kbd>Ctrl</kbd> + <kbd><WinKeyIcon /></kbd> anywhere to record.
                    Every transcription will be saved here automatically.
                  </p>
                </div>
              ) : filteredTranscripts.length === 0 ? (
                <div className="db-empty db-empty-results">
                  <SearchIcon />
                  <p className="db-empty-title">No results</p>
                  <p className="db-empty-sub">Try a different search term.</p>
                </div>
              ) : (
                <div className="db-transcript-list">
                  {(searchQuery.trim()
                    ? [{ label: `${filteredTranscripts.length} result${filteredTranscripts.length !== 1 ? 's' : ''}`, items: filteredTranscripts }]
                    : groupTranscripts(filteredTranscripts)
                  ).map(group => (
                    <section key={group.label} className="db-transcript-group">
                      <h3 className="db-group-label">{group.label}</h3>
                      <div className="db-transcript-timeline">
                        {group.items.map(t => (
                          <article key={t.id} className="db-transcript-tile">
                            <div className="db-transcript-tile-accent" />
                            <div className="db-transcript-tile-body">
                              <p className="db-transcript-tile-text">{t.text}</p>
                            </div>
                            <footer className="db-transcript-tile-footer">
                              <span className="db-transcript-tile-meta">
                                <ClockIcon />
                                {new Date(t.timestamp).toLocaleString([], {
                                  month: 'short', day: 'numeric',
                                  hour: '2-digit', minute: '2-digit',
                                })}
                              </span>
                              <span className="db-transcript-tile-wc">
                                {t.text.split(/\s+/).filter(Boolean).length} words
                              </span>
                              <div className="db-transcript-tile-actions">
                                <button
                                  className={`db-tile-btn${copied === t.id ? ' copied' : ''}`}
                                  onClick={() => copyTranscript(t)}
                                  title={copied === t.id ? 'Copied!' : 'Copy'}
                                >
                                  {copied === t.id ? <CheckIcon /> : <CopyIcon />}
                                  {copied === t.id ? 'Copied' : 'Copy'}
                                </button>
                                <button
                                  className="db-tile-btn db-tile-btn-delete"
                                  onClick={() => deleteTranscript(t.id)}
                                  title="Delete"
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                            </footer>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SETTINGS ─────────────────────────────────────────────────────── */}
          {section === 'settings' && (
            <div className="db-settings-wrap">
              <div className="sw-content-header">
                <h1 className="sw-title">{SETTINGS_NAV.find(n => n.id === settingsTab)?.label}</h1>
              </div>
              <SettingsContent section={settingsTab} onShowToast={showToast} onThemeChange={setTheme} />
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function WinKeyIcon() {
  return (
    <svg
      width="10" height="10" viewBox="0 0 10 10"
      fill="currentColor" aria-label="Windows key"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <rect x="0"   y="0"   width="4.5" height="4.5" rx="0.6"/>
      <rect x="5.5" y="0"   width="4.5" height="4.5" rx="0.6"/>
      <rect x="0"   y="5.5" width="4.5" height="4.5" rx="0.6"/>
      <rect x="5.5" y="5.5" width="4.5" height="4.5" rx="0.6"/>
    </svg>
  )
}

function UpdateIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  )
}

function HamburgerIcon() {
  return (
    <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
      <line x1="0" y1="1"  x2="15" y2="1"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="0" y1="6"  x2="15" y2="6"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="0" y1="11" x2="15" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function TranscriptIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

function CloseSmIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
      <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function MicBigIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="9"  y1="22" x2="15" y2="22"/>
    </svg>
  )
}

function TranscriptBigIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

function MicStatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  )
}

function WordsStatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6"  x2="20" y2="6"/>
      <line x1="4" y1="10" x2="20" y2="10"/>
      <line x1="4" y1="14" x2="14" y2="14"/>
    </svg>
  )
}

function TotalStatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2"  y="14" width="4" height="7"/>
      <rect x="9"  y="9"  width="4" height="12"/>
      <rect x="16" y="4"  width="4" height="17"/>
    </svg>
  )
}
