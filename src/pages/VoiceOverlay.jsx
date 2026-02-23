import { useState, useEffect, useRef } from 'react'
import './VoiceOverlay.css'

const N = 16

function FallbackIcon() {
  return (
    <svg viewBox="0 0 28 28" width="14" height="14">
      <defs><clipPath id="fb-c"><rect width="28" height="28" rx="7"/></clipPath></defs>
      <g clipPath="url(#fb-c)">
        <rect width="14" height="14" fill="#EA4335"/>
        <rect x="14" width="14" height="14" fill="#4285F4"/>
        <rect y="14" width="14" height="14" fill="#FBBC04"/>
        <rect x="14" y="14" width="14" height="14" fill="#34A853"/>
      </g>
    </svg>
  )
}

export default function VoiceOverlay() {
  const [status,     setStatus]     = useState('listening')
  const [iconB64,    setIconB64]    = useState(null)
  const [appName,    setAppName]    = useState('')
  const [barHeights, setBarHeights] = useState(() => new Array(N).fill(2))
  const [theme,      setTheme]      = useState('light')
  const [scheme,     setScheme]     = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )

  const effectiveTheme = theme === 'system' ? scheme : theme

  const smoothRef = useRef(new Array(N).fill(0))
  const rafRef    = useRef(null)

  // ── Theme ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    window.electronAPI?.getSettings?.().then((s) => { if (s?.theme) setTheme(s.theme) })
  }, [])
  useEffect(() => {
    const m = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!m) return
    const fn = () => setScheme(m.matches ? 'dark' : 'light')
    m.addEventListener('change', fn)
    return () => m.removeEventListener('change', fn)
  }, [])

  // ── IPC ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubStatus = window.electronAPI?.onVoiceOverlayStatus?.((s) => setStatus(s))

    window.electronAPI?.getOverlayIcon?.().then((d) => {
      if (d?.iconB64) setIconB64(d.iconB64)
      if (d?.appName) setAppName(d.appName)
    }).catch(() => {})

    const unsubIcon = window.electronAPI?.onVoiceOverlayIcon?.((d) => {
      if (d?.iconB64) setIconB64(d.iconB64)
      if (d?.appName) setAppName(d.appName)
    })

    return () => { unsubStatus?.(); unsubIcon?.() }
  }, [])

  // ── Audio-reactive bars ────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'listening') {
      cancelAnimationFrame(rafRef.current)
      setBarHeights(new Array(N).fill(2))
      return
    }

    let stream, audioCtx, analyser, active = true

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((s) => {
        if (!active) { s.getTracks().forEach(t => t.stop()); return }
        stream   = s
        audioCtx = new AudioContext()
        const src = audioCtx.createMediaStreamSource(stream)
        analyser  = audioCtx.createAnalyser()
        analyser.fftSize               = 64
        analyser.smoothingTimeConstant = 0.5
        src.connect(analyser)

        const MAXH = [6,12,18,22,26,28,26,22,20,24,18,14,10,16,12,8]
        const data = new Uint8Array(analyser.frequencyBinCount)

        function tick() {
          if (!active) return
          analyser.getByteFrequencyData(data)
          const sm = smoothRef.current
          const next = MAXH.map((maxH, i) => {
            const bin    = Math.min(Math.floor((i / N) * data.length * 0.6), data.length - 1)
            const target = data[bin] / 255
            sm[i] = sm[i] * 0.65 + target * 0.35
            return Math.max(2, sm[i] * maxH)
          })
          setBarHeights(next)
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      })
      .catch(() => {})

    return () => {
      active = false
      cancelAnimationFrame(rafRef.current)
      stream?.getTracks().forEach(t => t.stop())
      audioCtx?.close()
    }
  }, [status])

  const isListening    = status === 'listening'
  const isTranscribing = status === 'transcribing'
  const isDone         = status === 'done'
  const isError        = status === 'error'

  const labelText = isListening ? 'Listening' : isTranscribing ? 'Transcribing…' : isDone ? 'Done!' : 'Error'

  return (
    <div className={`vo-root vo-${status}`} data-theme={effectiveTheme}>

      {/* Left: app icon + pulsing dot */}
      <div className="vo-left">
        <div className="vo-icon-wrap">
          {iconB64
            ? <img className="vo-app-img" src={`data:image/png;base64,${iconB64}`} alt={appName || 'app'}/>
            : <FallbackIcon />
          }
          <span className={`vo-dot vo-dot-${status}`} />
        </div>
      </div>

      {/* Center: label + waveform / status icon */}
      <div className="vo-center">
        <span className="vo-label">{labelText}</span>

        {(isListening || isTranscribing) && (
          <div className={`vo-wave ${isTranscribing ? 'vo-wave-freeze' : ''}`}>
            {barHeights.map((h, i) => (
              <span
                key={i}
                className="vo-bar"
                style={{ height: `${isListening ? h : 3 + i % 4 * 2}px` }}
              />
            ))}
          </div>
        )}

        {isError && (
          <div className="vo-status-icon">
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" fill="#ef4444" fillOpacity="0.18"/>
              <path d="M4.5 4.5 L9.5 9.5 M9.5 4.5 L4.5 9.5" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
        )}

        {isDone && (
          <div className="vo-status-icon">
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" fill="#22c55e" fillOpacity="0.18"/>
              <path d="M3.5 7.2 L5.8 9.5 L10.5 5" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>

    </div>
  )
}
