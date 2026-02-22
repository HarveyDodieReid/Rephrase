import { useState, useEffect, useRef } from 'react'
import './VoiceOverlay.css'

// 13 bars with a max-height ceiling — JS drives the actual height each frame
const BARS = [
  { maxH: 10 }, { maxH: 20 }, { maxH: 15 }, { maxH: 28 }, { maxH: 18 },
  { maxH: 32 }, { maxH: 22 }, { maxH: 17 }, { maxH: 26 }, { maxH: 12 },
  { maxH: 24 }, { maxH: 14 }, { maxH: 8  },
]
const N = BARS.length

// Generic fallback badge — shown only when Windows icon extraction fails
function FallbackIcon() {
  return (
    <svg viewBox="0 0 28 28" width="28" height="28">
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
  const [scheme,     setScheme]     = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

  const effectiveTheme = theme === 'system' ? scheme : theme

  // Smoothed levels buffer (avoids stale closure in rAF loop)
  const smoothRef = useRef(new Array(N).fill(0))
  const rafRef    = useRef(null)

  // ── Theme ────────────────────────────────────────────────────────────────
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

  // ── IPC: status + icon ──────────────────────────────────────────────────
  useEffect(() => {
    const unsubStatus = window.electronAPI?.onVoiceOverlayStatus?.((s) => setStatus(s))

    // Icon may arrive in two ways:
    // 1) polled immediately on mount (icon might not be ready yet → null)
    window.electronAPI?.getOverlayIcon?.().then((d) => {
      if (d?.iconB64) setIconB64(d.iconB64)
      if (d?.appName) setAppName(d.appName)
    }).catch(() => {})

    // 2) pushed from main once background detection finishes
    const unsubIcon = window.electronAPI?.onVoiceOverlayIcon?.((d) => {
      if (d?.iconB64) setIconB64(d.iconB64)
      if (d?.appName) setAppName(d.appName)
    })

    return () => {
      unsubStatus?.()
      unsubIcon?.()
    }
  }, [])

  // ── Audio-reactive bars (only animate when listening + talking) ──────────
  useEffect(() => {
    if (status !== 'listening') {
      // Collapse all bars when not listening
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
        analyser.fftSize               = 64   // 32 frequency bins
        analyser.smoothingTimeConstant = 0.5
        src.connect(analyser)

        const data = new Uint8Array(analyser.frequencyBinCount)  // 32 bins

        function tick() {
          if (!active) return
          analyser.getByteFrequencyData(data)
          const sm = smoothRef.current
          const next = BARS.map((b, i) => {
            // Spread bars evenly across the lower 60% of frequency bins
            const bin    = Math.min(Math.floor((i / N) * data.length * 0.6), data.length - 1)
            const target = data[bin] / 255          // 0 → 1
            sm[i] = sm[i] * 0.65 + target * 0.35  // gentle lerp
            return Math.max(2, sm[i] * b.maxH)
          })
          setBarHeights(next)
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      })
      .catch(() => {
        // Mic permission denied or unavailable — bars stay flat
      })

    return () => {
      active = false
      cancelAnimationFrame(rafRef.current)
      stream?.getTracks().forEach(t => t.stop())
      audioCtx?.close()
    }
  }, [status])

  return (
    <div className={`vo-root vo-${status}`} data-theme={effectiveTheme}>

      {/* ── App icon ── */}
      <div className="vo-icon-badge">
        {iconB64 ? (
          <img className="vo-app-img" src={`data:image/png;base64,${iconB64}`} alt={appName || 'app'}/>
        ) : (
          <FallbackIcon />
        )}
      </div>

      {/* ── Bars — driven by mic level when listening, frozen when transcribing ── */}
      {status !== 'error' && status !== 'done' && (
        <div className={`vo-wave ${status === 'transcribing' ? 'vo-wave-freeze' : ''}`}>
          {BARS.map((b, i) => (
            <span
              key={i}
              className="vo-bar"
              style={{ height: `${status === 'listening' ? barHeights[i] : b.maxH * 0.35}px` }}
            />
          ))}
        </div>
      )}

      {/* ── Error icon ── */}
      {status === 'error' && (
        <div className="vo-error-icon">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" fill="#ef4444" fillOpacity="0.15"/>
            <path d="M6 6 L12 12 M12 6 L6 12" stroke="#dc2626" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* ── Done check ── */}
      {status === 'done' && (
        <div className="vo-done-check">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" fill="#22c55e" fillOpacity="0.15"/>
            <path d="M4.5 8.5 L7 11 L11.5 6" stroke="#16a34a" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

    </div>
  )
}
