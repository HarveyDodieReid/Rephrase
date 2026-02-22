import { useState, useEffect } from 'react'
import BrandMark from '../components/BrandMark.jsx'
import './UpdateNotif.css'

export default function UpdateNotif() {
  const [info, setInfo] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [downloaded, setDownloaded] = useState(false)
  const [error, setError] = useState(null)
  const [theme, setTheme] = useState('light')
  const [scheme, setScheme] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

  useEffect(() => {
    window.electronAPI?.getUpdateInfo?.().then(i => { if (i) setInfo(i) })
    window.electronAPI?.getSettings?.().then(s => { if (s?.theme) setTheme(s.theme) })
  }, [])

  useEffect(() => {
    const un1 = window.electronAPI?.onUpdateAvailable?.(i => { setInfo(i); setDownloading(false); setDownloaded(false); setError(null) })
    const un2 = window.electronAPI?.onUpdateDownloadProgress?.(p => { setDownloading(true); setDownloadPercent(p?.percent ?? 0); setError(null) })
    const un3 = window.electronAPI?.onUpdateDownloaded?.(() => { setDownloading(false); setDownloaded(true); setError(null) })
    const un4 = window.electronAPI?.onUpdateError?.(e => { setDownloading(false); setError(e?.message ?? 'Download failed') })
    return () => { un1?.(); un2?.(); un3?.(); un4?.() }
  }, [])

  useEffect(() => {
    const m = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!m) return
    const fn = () => setScheme(m.matches ? 'dark' : 'light')
    m.addEventListener('change', fn)
    return () => m.removeEventListener('change', fn)
  }, [])

  const effectiveTheme = theme === 'system' ? scheme : theme

  // Only auto-dismiss after 12s when idle (not downloading/downloaded/error)
  useEffect(() => {
    if (downloading || downloaded || error) return
    const id = setTimeout(() => window.electronAPI?.closeUpdateNotif?.(), 12000)
    return () => clearTimeout(id)
  }, [downloading, downloaded, error])

  const handleUpdate = async () => {
    if (downloaded && window.electronAPI?.installUpdate) {
      window.electronAPI.installUpdate()
      window.electronAPI?.closeUpdateNotif?.()
      return
    }
    if (error && info?.url && window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(info.url)
      return
    }
    if (window.electronAPI?.downloadUpdate) {
      const res = await window.electronAPI.downloadUpdate()
      if (res?.devMode && info?.url && window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(info.url)
        return
      }
      setDownloading(true)
    } else if (info?.url && window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(info.url)
    }
  }

  const dismiss = () => window.electronAPI?.closeUpdateNotif?.()

  return (
    <div className="un-root" data-theme={effectiveTheme}>
      <div className="un-titlebar" style={{ WebkitAppRegion: 'drag' }}>
        <div className="un-tb-left">
          <BrandMark size={18} theme={effectiveTheme} className="un-brand" alt="Rephrase" />
          <span className="un-tb-sep" />
          <span className="un-tb-tag">
            {downloaded ? 'Ready to install' : error ? 'Download failed' : downloading ? 'Downloading update…' : 'Update available'}
          </span>
        </div>
        <button className="un-close" onClick={dismiss} title="Dismiss" style={{ WebkitAppRegion: 'no-drag' }}>
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="un-body" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="un-version-pill">v{info?.version ?? '…'}</div>
        <p className="un-notes">
          {downloading
            ? `Downloading… ${Math.round(downloadPercent)}%`
            : downloaded
              ? 'Update downloaded. Click below to restart and install.'
              : error
                ? error
                : (info?.notes ?? 'New features and improvements are ready to install.')}
        </p>
        {downloading && (
          <div className="un-progress-bar">
            <div className="un-progress-fill" style={{ width: `${downloadPercent}%` }} />
          </div>
        )}
      </div>

      <div className="un-actions" style={{ WebkitAppRegion: 'no-drag' }}>
        <button className="un-btn un-btn--primary" onClick={handleUpdate} disabled={downloading}>
          {downloaded ? 'Restart to update' : error ? 'Download manually' : downloading ? `Downloading… ${Math.round(downloadPercent)}%` : 'Update Now'}
        </button>
        <button className="un-btn un-btn--ghost" onClick={dismiss}>Later</button>
      </div>

      <div className="un-progress" />
    </div>
  )
}
