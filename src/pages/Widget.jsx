import { useState, useEffect, useRef, useCallback } from 'react'
import './Widget.css'

export default function Widget() {
  const [status, setStatus]               = useState('idle')   // idle|loading|success|error|recording
  const [message, setMessage]             = useState('')
  const [autoFixStatus, setAutoFixStatus] = useState('off')
  const [lastOutput, setLastOutput]       = useState('')
  const [audioLevel, setAudioLevel]       = useState(0)

  const mediaRecorderRef = useRef(null)
  const audioCtxRef      = useRef(null)
  const chunksRef        = useRef([])
  const animFrameRef     = useRef(null)
  const isRecordingRef   = useRef(false)

  const isRecording = status === 'recording'

  // ── Push events from main ────────────────────────────────────────────────
  useEffect(() => {
    // Manual rewrite shortcut feedback
    const c1 = window.electronAPI?.onRephraseStatus((data) => {
      setStatus(data.status === 'idle' ? 'idle' : data.status)
      setMessage(data.message || '')
      if (data.status === 'idle') setMessage('')
    })

    // Auto-fix status dot
    const c2 = window.electronAPI?.onAutoFixStatus((s) => setAutoFixStatus(s))

    // Push-to-talk: HOLD → START
    const c3 = window.electronAPI?.onVoiceStart(() => {
      // #region agent log
      window.electronAPI?.__debugLog?.({hypothesisId:'H-A',location:'Widget.jsx:onVoiceStart',message:'voice-start received in Widget'});
      // #endregion
      openMic()
    })

    // Push-to-talk: RELEASE → STOP → transcribe
    const c4 = window.electronAPI?.onVoiceStop(() => closeMic())

    return () => { c1?.(); c2?.(); c3?.(); c4?.() }
  }, [])  // eslint-disable-line

  // ── Open microphone (called on voice-start OR mic button press) ──────────
  const openMic = useCallback(async () => {
    // #region agent log
    window.electronAPI?.__debugLog?.({hypothesisId:'H-B',location:'Widget.jsx:openMic-entry',message:'openMic called',data:{alreadyRecording:isRecordingRef.current}});
    // #endregion
    if (isRecordingRef.current) return
    try {
      // Use the saved mic device if one was chosen in Settings
      const settings = await window.electronAPI?.getSettings().catch(() => ({}))
      const deviceId = settings?.micDeviceId && settings.micDeviceId !== 'default'
        ? { exact: settings.micDeviceId }
        : undefined
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId } : true,
        video: false,
      })

      // Web Audio for live level visualisation
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      audioCtx.createMediaStreamSource(stream).connect(analyser)
      const buf = new Uint8Array(analyser.frequencyBinCount)

      const tick = () => {
        if (!isRecordingRef.current) return
        analyser.getByteFrequencyData(buf)
        setAudioLevel(Math.min(100, (buf.reduce((a, b) => a + b, 0) / buf.length) * 2))
        animFrameRef.current = requestAnimationFrame(tick)
      }
      animFrameRef.current = requestAnimationFrame(tick)

      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => handleAudioReady(stream, audioCtx)

      mr.start(100)
      isRecordingRef.current = true
      setStatus('recording')
      setMessage('Listening… hold Ctrl + ⊞')
      // #region agent log
      window.electronAPI?.__debugLog?.({hypothesisId:'H-B',location:'Widget.jsx:openMic-success',message:'Mic opened & MediaRecorder started',data:{deviceId:deviceId||'default'}});
      // #endregion
    } catch (err) {
      // #region agent log
      window.electronAPI?.__debugLog?.({hypothesisId:'H-B',location:'Widget.jsx:openMic-error',message:'openMic FAILED',data:{error:err?.message||String(err)}});
      // #endregion
      setStatus('error')
      setMessage('Microphone access denied.')
      setTimeout(reset, 3000)
    }
  }, [])

  // ── Close microphone (called on voice-stop OR mic button press) ──────────
  const closeMic = useCallback(() => {
    if (!isRecordingRef.current) return
    isRecordingRef.current = false
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setAudioLevel(0)
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== 'inactive') mr.stop()
  }, [])

  // ── After MediaRecorder stops: transcribe → clean → paste ────────────────
  const handleAudioReady = useCallback(async (stream, audioCtx) => {
    stream.getTracks().forEach(t => t.stop())
    audioCtx.close().catch(() => {})

    // #region agent log
    window.electronAPI?.__debugLog?.({hypothesisId:'H-C',location:'Widget.jsx:handleAudioReady',message:'handleAudioReady called',data:{chunks:chunksRef.current.length}});
    // #endregion

    if (chunksRef.current.length === 0) { reset(); return }

    setStatus('loading')
    setMessage('Transcribing…')

    const blob   = new Blob(chunksRef.current, { type: 'audio/webm' })
    const buffer = await blob.arrayBuffer()
    // #region agent log
    window.electronAPI?.__debugLog?.({hypothesisId:'H-C',location:'Widget.jsx:before-transcribe',message:'Calling transcribeAudio',data:{bufferBytes:buffer.byteLength}});
    // #endregion

    const result = await window.electronAPI.transcribeAudio(buffer)
    // #region agent log
    window.electronAPI?.__debugLog?.({hypothesisId:'H-ALL',location:'Widget.jsx:after-transcribe',message:'transcribeAudio returned',data:{ok:result?.ok,error:result?.error,hasText:!!(result?.text)}});
    // #endregion

    if (result.ok && result.text.trim()) {
      setMessage('Pasting…')
      await window.electronAPI.insertText(result.text.trim())
      setStatus('success')
      setMessage(result.text.trim())
      setLastOutput(trim100(result.text.trim()))
    } else {
      setStatus('error')
      setMessage(result.error || 'Could not transcribe — try again.')
    }

    setTimeout(reset, 4000)
  }, [])

  const reset = () => { setStatus('idle'); setMessage('') }

  // ── Manual rewrite button ────────────────────────────────────────────────
  const handleRewrite = async () => {
    if (status === 'loading' || isRecording) return
    setStatus('loading'); setMessage('Rewriting…')
    const result = await window.electronAPI.rephrase()
    if (result.ok) {
      setStatus('success'); setMessage('Done!')
      if (result.rephrased) setLastOutput(trim100(result.rephrased))
    } else {
      setStatus('error'); setMessage(result.error || 'Something went wrong.')
    }
    setTimeout(reset, 3500)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="widget">

      {/* Header */}
      <div className="widget-header">
        <span className="widget-subtitle">Any text field on your desktop</span>
        {autoFixStatus !== 'off' && (
          <div className={`autofix-badge ${autoFixStatus}`}>
            {autoFixStatus === 'fixing' && <span className="micro-spin" />}
            {autoFixStatus === 'idle'   && 'Auto-fix on'}
            {autoFixStatus === 'fixing' && 'Fixing…'}
            {autoFixStatus === 'fixed'  && '✓ Fixed!'}
          </div>
        )}
      </div>

      {/* Active Recording Panel — full takeover */}
      {isRecording && (
        <div className="recording-panel">
          <div className="recording-orb-wrap">
            <div className="recording-orb" style={{ '--level': audioLevel }}>
              <div className="recording-orb-ring" />
              <MicIcon recording />
            </div>
          </div>
          <div className="recording-waveform">
            {Array.from({ length: 20 }).map((_, i) => {
              const phase   = (i / 19) * Math.PI * 2
              const jitter  = Math.sin(phase * 3.7 + i * 0.4)
              const raw     = audioLevel * (0.45 + 0.55 * Math.abs(Math.sin(phase + i * 0.6)))
              const h       = Math.max(3, raw * (1 + jitter * 0.18))
              return (
                <span
                  key={i}
                  className="rec-bar"
                  style={{ '--h': `${h}px`, '--delay': `${(i * 43) % 400}ms` }}
                />
              )
            })}
          </div>
          <p className="recording-label">Listening…</p>
          <p className="recording-sub">Release <kbd>Ctrl + <WinKeyIcon /></kbd> to transcribe</p>
          <button className="recording-stop-btn" onClick={closeMic}>
            <span className="stop-square" /> Stop
          </button>
        </div>
      )}

      {/* Body — shown only when NOT recording */}
      {!isRecording && (
        <div className="widget-body">

          {/* Transcribing spinner */}
          {status === 'loading' && (
            <div className="widget-loading">
              <span className="spinner" />
              <span>{message}</span>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="widget-feedback success">
              <CheckIcon />
              <div>
                <strong>Typed into field</strong>
                <p className="feedback-preview">{message}</p>
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="widget-feedback error">
              <WarnIcon />
              <span>{message}</span>
            </div>
          )}

          {/* Idle — last output */}
          {status === 'idle' && lastOutput && (
            <div className="last-rewrite">
              <span className="last-rewrite-label">Last output</span>
              <p className="last-rewrite-text">{lastOutput}</p>
            </div>
          )}

          {/* Idle — first-run hint */}
          {status === 'idle' && !lastOutput && (
            <p className="widget-hint">
              <strong>Hold Ctrl + <WinKeyIcon /></strong> to dictate by voice.<br />
              Click in a text field &amp; press <strong>Rewrite</strong> to rephrase.
            </p>
          )}
        </div>
      )}

      {/* Footer — hidden while recording */}
      {!isRecording && (
        <div className="widget-footer">
          <div className="footer-shortcuts">
            <span className="shortcut-pill" title="Hold to dictate">
              Ctrl+<WinKeyIcon /> <span>voice</span>
            </span>
            <span className="shortcut-pill" title="Rewrite shortcut">
              ⌃⇧Space <span>rewrite</span>
            </span>
          </div>
          <div className="footer-actions">
            <button
              className="mic-btn"
              onClick={openMic}
              title="Start voice dictation"
            >
              <MicIcon recording={false} />
            </button>
            <button
              className={`rewrite-btn${status === 'loading' ? ' loading' : ''}`}
              onClick={handleRewrite}
              disabled={status === 'loading'}
            >
              {status === 'loading'
                ? <><span className="btn-spinner" />Working…</>
                : 'Rewrite'
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const trim100 = (s) => s.length > 100 ? s.slice(0, 100) + '…' : s

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

function MicIcon({ recording }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={recording ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="9"  y1="22" x2="15" y2="22" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:2}}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function WarnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:2}}>
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}
