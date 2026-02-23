import { useState, useEffect, useRef } from 'react'
import BrandMark from './BrandMark.jsx'
import './SplashScreen.css'

const STEPS = [
  { id: 'prefs',   label: 'Loading preferences…' },
  { id: 'updates', label: 'Checking for updates…' },
  { id: 'whisper', label: 'Checking Whisper.cpp…' },
  { id: 'ollama',  label: 'Starting Ollama…' },
  { id: 'model',   label: 'Verifying model…' },
  { id: 'ready',   label: 'All services running' },
]

const UPDATE_WAIT_MS = 10000

export default function SplashScreen({ onComplete, theme: themeProp }) {
  const [visible, setVisible] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [results, setResults] = useState({})
  const [theme, setTheme] = useState(themeProp || 'dark')
  const [updateStatus, setUpdateStatus] = useState(null) // null | 'checking' | 'available' | 'none'
  const [updateInfo, setUpdateInfo] = useState(null)
  const [downloadPct, setDownloadPct] = useState(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const done = useRef(false)

  // Resolve theme from prop or settings (so splash matches app theme)
  useEffect(() => {
    if (themeProp) {
      setTheme(themeProp)
      return
    }
    let scheme = 'dark'
    const m = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (m) scheme = m.matches ? 'dark' : 'light'
    window.electronAPI?.getSettings?.().then(s => {
      const t = s?.theme === 'system' ? scheme : (s?.theme || scheme)
      setTheme(t || 'dark')
    }).catch(() => setTheme(scheme))
  }, [themeProp])

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      const wait = (ms) => new Promise(r => setTimeout(r, ms))

      // Step 0 — preferences
      setCurrent(0)
      let settings = null
      try { settings = await window.electronAPI?.getSettings?.() } catch {}
      setResults(r => ({ ...r, prefs: true }))
      await wait(600)
      if (cancelled) return

      // Step 1 — updates: run real check and wait for result
      setCurrent(1)
      setUpdateStatus('checking')
      const updateResult = await new Promise((resolve) => {
        let cleanup = () => {}
        const unsubAvail = window.electronAPI?.onUpdateAvailable?.((info) => {
          cleanup()
          resolve({ status: 'available', info })
        })
        const unsubNot = window.electronAPI?.onUpdateNotAvailable?.(() => {
          cleanup()
          resolve('none')
        })
        const unsubErr = window.electronAPI?.onUpdateError?.(() => {
          cleanup()
          resolve('none')
        })
        cleanup = () => {
          clearTimeout(t)
          unsubAvail?.()
          unsubNot?.()
          unsubErr?.()
        }
        const t = setTimeout(() => {
          cleanup()
          resolve('none')
        }, UPDATE_WAIT_MS)
        window.electronAPI?.checkForUpdate?.().catch(() => {})
      })
      const resolvedStatus = typeof updateResult === 'object' && updateResult?.status === 'available' ? 'available' : 'none'
      if (resolvedStatus === 'available') {
        const info = typeof updateResult === 'object' && updateResult?.info ? updateResult.info : null
        if (info) setUpdateInfo(info)
        else {
          try {
            const fetched = await window.electronAPI?.getUpdateInfo?.()
            if (fetched) setUpdateInfo(fetched)
          } catch {}
        }
        setUpdateStatus('available')
        setResults(r => ({ ...r, updates: true }))
        return // pause here; user will click Install now or Not now
      }
      setUpdateStatus('none')
      setResults(r => ({ ...r, updates: true }))
      await wait(400)
      if (cancelled) return

      await runSteps2To5(settings, wait, cancelled, finish)
      if (cancelled) return
      finish()
    }

    async function runSteps2To5(settings, wait, cancelled, finish) {
      // Step 2 — whisper binary
      setCurrent(2)
      let setup = null
      try { setup = await window.electronAPI?.checkSetup?.() } catch {}
      const whisperOk = !!setup?.whisperBinary
      setResults(r => ({ ...r, whisper: whisperOk }))
      await wait(500)
      if (cancelled) return

      // Step 3 — ollama
      setCurrent(3)
      const ollamaOk = !!setup?.running
      setResults(r => ({ ...r, ollama: ollamaOk }))
      await wait(600)
      if (cancelled) return

      // Step 4 — model
      setCurrent(4)
      let modelOk = false
      try {
        const models = await window.electronAPI?.getDownloadedModels?.()
        const selected = settings?.whisperModel || 'base.en'
        modelOk = !!models?.[selected]
      } catch {}
      setResults(r => ({ ...r, model: modelOk }))
      await wait(500)
      if (cancelled) return

      // Step 5 — ready
      setCurrent(5)
      setResults(r => ({ ...r, ready: true }))
      await wait(900)
    }

    function finish() {
      if (done.current) return
      done.current = true
      setVisible(false)
      setTimeout(() => onComplete?.(), 400)
    }

    run()

    const maxTimer = setTimeout(finish, 15000)
    return () => { cancelled = true; clearTimeout(maxTimer) }
  }, [onComplete])

  const handleNotNow = async () => {
    setUpdateStatus('none')
    setUpdateInfo(null)
    const wait = (ms) => new Promise(r => setTimeout(r, ms))
    let settings = null
    try { settings = await window.electronAPI?.getSettings?.() } catch {}
    await runSteps2To5(settings, wait, () => false, () => {})
    if (done.current) return
    done.current = true
    setVisible(false)
    setTimeout(() => onComplete?.(), 400)
  }

  async function runSteps2To5(settings, wait, cancelled, finish) {
    setCurrent(2)
    let setup = null
    try { setup = await window.electronAPI?.checkSetup?.() } catch {}
    setResults(r => ({ ...r, whisper: !!setup?.whisperBinary }))
    await wait(500)
    if (cancelled()) return
    setCurrent(3)
    setResults(r => ({ ...r, ollama: !!setup?.running }))
    await wait(600)
    if (cancelled()) return
    setCurrent(4)
    let modelOk = false
    try {
      const models = await window.electronAPI?.getDownloadedModels?.()
      const selected = settings?.whisperModel || 'base.en'
      modelOk = !!models?.[selected]
    } catch {}
    setResults(r => ({ ...r, model: modelOk }))
    await wait(500)
    if (cancelled()) return
    setCurrent(5)
    setResults(r => ({ ...r, ready: true }))
    await wait(900)
  }

  const handleInstallNow = () => {
    window.electronAPI?.downloadUpdate?.()
    setDownloadPct(0)
    const unprog = window.electronAPI?.onUpdateDownloadProgress?.((d) => setDownloadPct(d?.percent ?? null))
    const undown = window.electronAPI?.onUpdateDownloaded?.(() => {
      unprog?.()
      undown?.()
      setUpdateDownloaded(true)
      setDownloadPct(null)
    })
  }

  const handleRestartToInstall = () => {
    window.electronAPI?.installUpdate?.()
  }

  const currentStep = STEPS[current] || STEPS[STEPS.length - 1]
  const showUpdateUI = updateStatus === 'available'

  return (
    <div className={`splash-root ${visible ? '' : 'splash-exit'}`} data-theme={theme}>
      <div className={`splash-inner ${mounted ? 'splash-inner--visible' : ''}`}>
        <div className="splash-logo">
          <BrandMark size={80} theme={theme} alt="Rephrase" />
        </div>
        <p className="splash-tagline">Voice to text, anywhere</p>

        {showUpdateUI ? (
          <div className="splash-update-block">
            <p className="splash-update-title">A new update is available</p>
            {updateInfo?.version && <p className="splash-update-version">Version {updateInfo.version}</p>}
            {updateDownloaded ? (
              <>
                <p className="splash-update-status">Ready to install</p>
                <div className="splash-update-actions">
                  <button type="button" className="splash-btn splash-btn--primary" onClick={handleRestartToInstall}>
                    Restart to install
                  </button>
                  <button type="button" className="splash-btn splash-btn--secondary" onClick={handleNotNow}>
                    Not now
                  </button>
                </div>
              </>
            ) : downloadPct != null ? (
              <p className="splash-update-status">Downloading… {Math.round(downloadPct)}%</p>
            ) : (
              <div className="splash-update-actions">
                <button type="button" className="splash-btn splash-btn--primary" onClick={handleInstallNow}>
                  Install now
                </button>
                <button type="button" className="splash-btn splash-btn--secondary" onClick={handleNotNow}>
                  Not now
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <p className="splash-status">{currentStep.label}</p>
            <div className="splash-loader">
              {current === STEPS.length - 1
                ? <span className="splash-loader-done" />
                : <span className="splash-loader-bar" />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
