import React, { useState, useEffect } from 'react'

const styles = {
  /* ── Checking pill ───────────────────────────────────────────────────────── */
  checkingRoot: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    borderRadius: 12,
    gap: 8,
    userSelect: 'none',
    WebkitAppRegion: 'no-drag',
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
    fontSize: 15,
  },

  /* ── Safe pill ───────────────────────────────────────────────────────────── */
  safeRoot: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #15803d, #22c55e)',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: 700,
    fontSize: 14,
    borderRadius: 12,
    gap: 8,
    userSelect: 'none',
    animation: 'fadeOut 1.8s ease-out forwards',
  },

  /* ── Scam compact notification (no full-screen) ───────────────────────────── */
  scamRoot: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
    color: '#fff',
    padding: 12,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    borderRadius: 12,
  },
  scamInner: { textAlign: 'center', maxWidth: '100%' },
  scamIcon: { fontSize: 20, marginBottom: 4 },
  scamTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#fecaca',
    margin: '0 0 4px',
  },
  scamUrl: {
    fontSize: 11,
    color: '#fca5a5',
    marginBottom: 8,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  analysisBox: { display: 'none' },
  analysisLabel: {},
  analysisText: {},
  btnRow: { display: 'flex', gap: 8, marginTop: 4 },
  btnSafe: {
    padding: '6px 14px',
    background: '#fff',
    color: '#7f1d1d',
    fontWeight: 600,
    fontSize: 12,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  btnProceed: {
    padding: '6px 12px',
    background: 'transparent',
    color: '#fca5a5',
    fontWeight: 500,
    fontSize: 11,
    border: '1px solid #dc2626',
    borderRadius: 6,
    cursor: 'pointer',
  },
}

// Inject keyframes into <head> once
const KEYFRAMES = `
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes fadeOut { 0% { opacity:1; } 80% { opacity:1; } 100% { opacity:0; } }
@keyframes fadeIn  { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
`
if (typeof document !== 'undefined') {
  const tag = document.createElement('style')
  tag.textContent = KEYFRAMES
  document.head.appendChild(tag)
}

export default function SafetyOverlay() {
  const [status, setStatus] = useState('checking') // checking | safe | scam
  const [url, setUrl] = useState('')
  const [analysis, setAnalysis] = useState('')

  useEffect(() => {
    const handleStatus = (data) => {
      if (data.status) setStatus(data.status)
      if (data.url) setUrl(data.url)
      if (data.analysis) setAnalysis(data.analysis)
    }

    let cleanup
    if (window.electronAPI) {
      cleanup = window.electronAPI.onSafetyStatus(handleStatus)
    }
    return () => { if (cleanup) cleanup() }
  }, [])

  const handleProceed = () => {
    window.electronAPI.safetyProceed()
  }

  const handleClose = () => {
    window.electronAPI.safetyClose()
  }

  // ── Safe ──────────────────────────────────────────────────────────────────
  if (status === 'safe') {
    return (
      <div style={styles.safeRoot}>
        <span>✅</span>
        Website is Safe
      </div>
    )
  }

  // ── Checking ─────────────────────────────────────────────────────────────
  if (status === 'checking') {
    return (
      <div style={styles.checkingRoot}>
        <span style={styles.spinner}>⏳</span>
        Checking website safety…
      </div>
    )
  }

  // ── Scam ─────────────────────────────────────────────────────────────────
  if (status === 'scam') {
    return (
      <div style={styles.scamRoot}>
        <div style={styles.scamInner}>
          <div style={styles.scamIcon}>⚠️</div>
          <h1 style={styles.scamTitle}>Warning: Potential Scam Website</h1>
          <p style={styles.scamUrl}>
            This website (<strong>{url}</strong>) has been flagged as potentially unsafe.
          </p>

          {analysis && (
            <div style={styles.analysisBox}>
              <div style={styles.analysisLabel}>AI Analysis</div>
              <p style={styles.analysisText}>{analysis}</p>
            </div>
          )}

          <div style={styles.btnRow}>
            <button
              style={styles.btnSafe}
              onClick={handleClose}
              onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
            >
              Go Back to Safety
            </button>
            <button
              style={styles.btnProceed}
              onClick={handleProceed}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#fca5a5' }}
            >
              Proceed Anyway (Unsafe)
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
