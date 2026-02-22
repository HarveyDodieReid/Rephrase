import { useState, useEffect } from 'react'
import BrandMark from '../components/BrandMark.jsx'
import './UpdateNotif.css'

export default function UpdateNotif() {
  const [info, setInfo] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [downloaded, setDownloaded] = useState(false)
  const [theme, setTheme] = useState('light')
  const [scheme, setScheme] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

  useEffect(() => {
    window.electronAPI?.getUpdateInfo?.().then(i => { if (i) setInfo(i) })
    window.electronAPI?.getSettings?.().then(s => { if (s?.theme) setTheme(s.theme) })
  }, [])

  useEffect(() => {
    const un1 = window.electronAPI?.onUpdateAvailable?.(i => { setInfo(i); setDownloading(false); setDownloaded(false) })
    const un2 = window.electronAPI?.onUpdateDownloadProgress?.(p => { setDownloading(true); setDownloadPercent(p?.percent ?? 0) })
    const un3 = window.electronAPI?.onUpdateDownloaded?.(() => { setDownloading(false); setDownloaded(true) })
    return () => { un1?.(); un2?.(); un3?.() }
  }, [])

  useEffect(() => {
    const m = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!m) return
    const fn = () => setScheme(m.matches ? 'dark' : 'light')
    m.addEventListener('change', fn)
    return () => m.removeEventListener('change', fn)
  }, [])

  const effectiveTheme = theme === 'system' ? scheme : theme

  useEffect(() => {
    const id = setTimeout(() => window.electronAPI?.closeUpdateNotif?.(), 9000)
    return () => clearTimeout(id)
  }, [])

  const handleUpdate = () => {
    if (downloaded && window.electronAPI?.installUpdate) {
      window.electronAPI.installUpdate()
    } else if (window.electronAPI?.downloadUpdate) {
      window.electronAPI.downloadUpdate()
      setDownloading(true)
    } else if (info?.url && window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(info.url)
    }
    if (downloaded) window.electronAPI?.closeUpdateNotif?.()
  }

  const dismiss = () => window.electronAPI?.closeUpdateNotif?.()

  return (
    <div className="un-root" data-theme={effectiveTheme}>
      <div className="un-titlebar">
        <div className="un-tb-left">
          <BrandMark size={18} variant="full" theme={effectiveTheme} className="un-brand" alt="Rephrase" />
          <span className="un-tb-sep" />
          <span className="un-tb-tag">{downloaded ? 'Ready to install' : 'Update available'}</span>
        </div>
        <button className="un-close" onClick={dismiss} title="Dismiss">
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="un-body">
        <div className="un-version-pill">v{info?.version ?? '…'}</div>
        <p className="un-notes">
          {downloading
            ? `Downloading… ${Math.round(downloadPercent)}%`
            : downloaded
              ? 'Update downloaded. Click below to restart and install.'
              : (info?.notes ?? 'New features and improvements are ready to install.')}
        </p>
        {downloading && (
          <div className="un-progress-bar">
            <div className="un-progress-fill" style={{ width: `${downloadPercent}%` }} />
          </div>
        )}
      </div>

      <div className="un-actions">
        <button className="un-btn un-btn--primary" onClick={handleUpdate} disabled={downloading}>
          {downloaded ? 'Restart to update' : downloading ? 'Downloading…' : 'Update Now'}
        </button>
        <button className="un-btn un-btn--ghost" onClick={dismiss}>Later</button>
      </div>

      <div className="un-progress" />
    </div>
  )
}
