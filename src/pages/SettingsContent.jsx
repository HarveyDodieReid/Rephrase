import { useState, useEffect, useRef, memo, useCallback } from 'react'

const WHISPER_MODELS = [
  { value: 'tiny.en',        label: 'Tiny — English only',           size: '75 MB',  speed: 'Fastest',
    desc: 'Smallest and fastest model. Good for quick, low-accuracy dictation on weak hardware.',
    params: '39M parameters', quality: 'Low accuracy' },
  { value: 'base.en',        label: 'Base — English only',           size: '142 MB', speed: 'Fast',
    desc: 'Great balance of speed and accuracy for everyday English transcription. Recommended starting point.',
    params: '74M parameters', quality: 'Good accuracy' },
  { value: 'small.en',       label: 'Small — English only',          size: '466 MB', speed: 'Balanced',
    desc: 'Noticeably better accuracy than Base. Ideal for longer recordings or noisy environments.',
    params: '244M parameters', quality: 'High accuracy' },
  { value: 'medium.en',      label: 'Medium — English only',         size: '1.5 GB', speed: 'Slow',
    desc: 'Near state-of-the-art English transcription. Requires more RAM and a decent CPU/GPU.',
    params: '769M parameters', quality: 'Very high accuracy' },
  { value: 'tiny',           label: 'Tiny — Multilingual',           size: '75 MB',  speed: 'Fastest',
    desc: 'Fastest multilingual model. Supports 99 languages but with limited accuracy.',
    params: '39M parameters', quality: 'Low accuracy' },
  { value: 'base',           label: 'Base — Multilingual',           size: '142 MB', speed: 'Fast',
    desc: 'Good multilingual starting point. Handles common languages well at reasonable speed.',
    params: '74M parameters', quality: 'Good accuracy' },
  { value: 'small',          label: 'Small — Multilingual',          size: '466 MB', speed: 'Balanced',
    desc: 'Strong multilingual model. Good accuracy across most languages.',
    params: '244M parameters', quality: 'High accuracy' },
  { value: 'large-v3-turbo', label: 'Large v3 Turbo — Multilingual', size: '1.6 GB', speed: 'Fast',
    desc: 'Distilled from Large v3 — nearly the same accuracy but significantly faster inference.',
    params: '809M parameters', quality: 'Very high accuracy' },
  { value: 'large-v3',       label: 'Large v3 — Multilingual',       size: '3.1 GB', speed: 'Slowest',
    desc: 'Best available model. Maximum accuracy for all 99 languages. Needs powerful hardware.',
    params: '1.5B parameters', quality: 'Best accuracy' },
]

export const SETTINGS_NAV = [
  { id: 'general', label: 'General', icon: GeneralIcon },
  { id: 'model',    label: 'Model',  icon: ApiIcon     },
  { id: 'theme',    label: 'Theme',  icon: ThemeIcon   },
  { id: 'voice',    label: 'Voice',  icon: MicIcon     },
]

// ── Main exportable settings body ─────────────────────────────────────────────
// Renders the settings form (everything except the window chrome / title bar).
// `section`        — currently-active section id
// `onShowToast`    — function(msg: string) provided by the parent
export default function SettingsContent({ section, onShowToast, onThemeChange, onInstallStart, onOpenVoiceTraining }) {
  const [whisperModel,    setWhisperModel]   = useState('base.en')
  const [whisperLanguage, setWhisperLanguage] = useState('auto')
  const [ollamaModel,     setOllamaModel]    = useState('llama3.2')
  const [ollamaUrl,       setOllamaUrl]      = useState('http://localhost:11434')
  const [theme,           setTheme]          = useState('light')
  const [launchAtStartup, setLaunchAtStartup] = useState(false)
  const [hotkeyRephrase,  setHotkeyRephrase] = useState('CommandOrControl+Shift+Space')
  const [hotkeyVoice,     setHotkeyVoice]    = useState('Control+Super')
  const [hotkeyComposer,  setHotkeyComposer] = useState('Alt+Super')
  const [saveStatus,      setSaveStatus]     = useState('idle')

  // Microphone
  const [micDevices,  setMicDevices]  = useState([])
  const [selectedMic, setSelectedMic] = useState('default')
  const [micPerm,     setMicPerm]     = useState('unknown')

  const [cacheStatus,  setCacheStatus]  = useState('idle')   // idle | clearing

  useEffect(() => {
    window.electronAPI?.getSettings().then((s) => {
      if (s.whisperModel)       setWhisperModel(s.whisperModel)
      if (s.whisperLanguage !== undefined) setWhisperLanguage(s.whisperLanguage)
      if (s.ollamaModel)        setOllamaModel(s.ollamaModel)
      if (s.ollamaUrl)          setOllamaUrl(s.ollamaUrl)
      if (s.theme)              { setTheme(s.theme); onThemeChange?.(s.theme) }
      if (s.launchAtStartup !== undefined) setLaunchAtStartup(s.launchAtStartup)
      if (s.micDeviceId)        setSelectedMic(s.micDeviceId)
      if (s.hotkeyRephrase)     setHotkeyRephrase(s.hotkeyRephrase)
      if (s.hotkeyVoice)        setHotkeyVoice(s.hotkeyVoice)
      if (s.hotkeyComposer)     setHotkeyComposer(s.hotkeyComposer)
    })
    enumerateMics(false)
  }, [])

  async function enumerateMics(askPermission) {
    try {
      if (askPermission) {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        setMicPerm('granted')
      }
      const devices = await navigator.mediaDevices.enumerateDevices()
      const inputs  = devices.filter(d => d.kind === 'audioinput')
      setMicDevices(inputs)
      if (inputs.length > 0 && !inputs.find(d => d.deviceId === selectedMic))
        setSelectedMic(inputs[0].deviceId)
      if (inputs.some(d => d.label)) setMicPerm('granted')
    } catch { setMicPerm('denied') }
  }

  const handleClearCache = async () => {
    setCacheStatus('clearing')
    try {
      await window.electronAPI?.clearCache?.()
      onShowToast?.('Cache cleared')
    } catch {
      onShowToast?.('Failed to clear cache')
    }
    setCacheStatus('idle')
  }

  const resetShortcutsToDefault = () => {
    setHotkeyVoice('Control+Super')
    setHotkeyComposer('Alt+Super')
  }

  const save = async () => {
    setSaveStatus('saving')
    await window.electronAPI?.saveSettings({
      whisperModel,
      whisperLanguage,
      ollamaModel,
      ollamaUrl,
      theme,
      launchAtStartup,
      micDeviceId: selectedMic,
      hotkeyRephrase, hotkeyVoice, hotkeyComposer,
    })
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 1800)
  }

  return (
    <>
      <div className="sw-body">

        {section === 'general' && (
          <div className="sw-section">
            <SettingRow
              label="Start Rephrase at login"
              desc="Launch Rephrase when you sign in to Windows"
            >
              <Toggle value={launchAtStartup} onChange={setLaunchAtStartup} />
            </SettingRow>
            <Divider />
            <SettingRow
              label="Nuclear cache clear"
              desc="Clear HTTP cache, cookies, localStorage, and all on-disk cache (Code Cache, GPUCache)"
            >
              <button
                className={`sw-change-btn ${cacheStatus === 'clearing' ? 'disabled' : ''}`}
                onClick={handleClearCache}
                disabled={cacheStatus === 'clearing'}
              >
                {cacheStatus === 'clearing' ? 'Clearing…' : 'Clear cache'}
              </button>
            </SettingRow>
          </div>
        )}

        {section === 'model' && (
          <ModelSection
            whisperModel={whisperModel}
            setWhisperModel={setWhisperModel}
            ollamaModel={ollamaModel}
            setOllamaModel={setOllamaModel}
            ollamaUrl={ollamaUrl}
            setOllamaUrl={setOllamaUrl}
            onInstallStart={onInstallStart}
          />
        )}

        {section === 'theme' && (
          <div className="sw-section">
            <SettingRow
              label="App appearance"
              desc="Choose how the app looks"
            >
              <div className="chip-row">
                {['light', 'dark', 'system'].map((t) => (
                  <button
                    key={t}
                    className={`chip sm ${theme === t ? 'active' : ''}`}
                    onClick={() => { setTheme(t); onThemeChange?.(t) }}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </SettingRow>
          </div>
        )}

        {section === 'voice' && (<>
          <div className="sw-section">
            <SettingRow
              label="Microphone"
              desc={
                micPerm === 'denied' ? 'Access denied — click Allow to grant permission.' :
                micDevices.length === 0 ? 'Click Allow to detect your microphones.' :
                `${micDevices.length} device${micDevices.length !== 1 ? 's' : ''} found`
              }
            >
              <button className={`sw-change-btn ${micPerm !== 'granted' ? 'primary' : ''}`}
                onClick={() => enumerateMics(true)}>
                {micPerm !== 'granted' ? 'Allow' : 'Refresh'}
              </button>
            </SettingRow>
            {micDevices.length > 0 && <>
              <Divider />
              <SettingRow label="Select microphone" desc="Used for push-to-talk voice dictation">
                <select className="sw-select" value={selectedMic} onChange={e => setSelectedMic(e.target.value)}>
                  {micDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${d.deviceId.slice(0, 8)}…`}
                    </option>
                  ))}
                </select>
              </SettingRow>
            </>}
            <Divider />
            <SettingRow label="Transcription model" desc="Local whisper.cpp model — set in the API tab">
              <span className="sw-badge">{WHISPER_MODELS.find(m => m.value === whisperModel)?.label ?? whisperModel}</span>
            </SettingRow>
            <Divider />
            <SettingRow label="Language" desc="Auto-detect works with multilingual models (e.g. Base — Multilingual). English-only models always use English.">
              <select
                className="sw-select sw-select-sm"
                value={whisperLanguage}
                onChange={e => setWhisperLanguage(e.target.value)}
              >
                <option value="auto">Auto-detect (all languages)</option>
                <option value="en">English only</option>
              </select>
            </SettingRow>
            <Divider />
            <SettingRow
              label="Voice training"
              desc="Teach Rephrase how you speak. Coming soon."
            >
              <button
                type="button"
                className="sw-change-btn primary"
                disabled
                onClick={() => onOpenVoiceTraining?.()}
              >
                Open voice training
              </button>
            </SettingRow>
            <Divider />
            <div className="shortcuts-header">
              <span className="shortcuts-title">Keyboard shortcuts</span>
              <button className="sw-change-btn shortcut-reset" onClick={resetShortcutsToDefault}>
                Reset to default
              </button>
            </div>
            <ShortcutRow
              label="Push to talk"
              desc="Hold to record voice"
              value={hotkeyVoice}
              onChange={setHotkeyVoice}
            />
            <Divider />
            <ShortcutRow
              label="Composer / Drafts"
              desc="Queue a thought for document or email"
              value={hotkeyComposer}
              onChange={setHotkeyComposer}
            />
          </div>
        </>)}

      </div>

      <div className="sw-footer">
        <button className={`sw-save-btn ${saveStatus}`} onClick={save} disabled={saveStatus !== 'idle'}>
          {saveStatus === 'saving' && 'Saving…'}
          {saveStatus === 'saved'  && '✓ Saved'}
          {saveStatus === 'idle'   && 'Save changes'}
        </button>
      </div>
    </>
  )
}

// ── Shortcut row (inline label, desc, hotkey recorder) ────────────────────────

function ShortcutRow({ label, desc, value, onChange }) {
  return (
    <div className="sw-row shortcut-row">
      <div className="sw-row-left">
        <span className="sw-row-label">{label}</span>
        {desc && <span className="sw-row-desc">{desc}</span>}
      </div>
      <div className="sw-row-right">
        <HotkeyRecorder value={value} onChange={onChange} />
      </div>
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────

export function SettingRow({ label, desc, children }) {
  return (
    <div className="sw-row">
      <div className="sw-row-left">
        <span className="sw-row-label">{label}</span>
        {desc && <span className="sw-row-desc">{desc}</span>}
      </div>
      <div className="sw-row-right">{children}</div>
    </div>
  )
}

export function Toggle({ value, onChange }) {
  return (
    <button className={`sw-toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
      <span className="sw-toggle-knob" />
    </button>
  )
}

export function Divider() { return <div className="sw-divider" /> }

// ── Windows key logo ──────────────────────────────────────────────────────────

function WinKeyIcon() {
  return (
    <svg
      width="10" height="10" viewBox="0 0 10 10"
      fill="currentColor" aria-label="Windows key"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <rect x="0" y="0" width="4.5" height="4.5" rx="0.6"/>
      <rect x="5.5" y="0" width="4.5" height="4.5" rx="0.6"/>
      <rect x="0" y="5.5" width="4.5" height="4.5" rx="0.6"/>
      <rect x="5.5" y="5.5" width="4.5" height="4.5" rx="0.6"/>
    </svg>
  )
}

// ── Hotkey recorder ───────────────────────────────────────────────────────────

/** Returns an array of React elements so we can mix text and SVG icons */
function renderHotkey(acc) {
  const parts = acc.split('+')
  const out = []
  parts.forEach((p, i) => {
    if (i > 0) out.push(<span key={`sep${i}`} className="hk-sep"> + </span>)
    if (p === 'CommandOrControl' || p === 'Control') {
      out.push(<span key={i}>Ctrl</span>)
    } else if (p === 'Meta' || (p === 'Super' && window.electronAPI?.platform === 'darwin')) {
      out.push(<span key={i}>⌘</span>)
    } else if (p === 'Super') {
      out.push(<WinKeyIcon key={i} />)
    } else if (p === 'Return') {
      out.push(<span key={i}>Enter</span>)
    } else {
      out.push(<span key={i}>{p}</span>)
    }
  })
  return out
}

export const HotkeyRecorder = memo(function HotkeyRecorder({ value, onChange }) {
  const [recording, setRecording] = useState(false)

  useEffect(() => {
    if (!recording) return
    const onKey = (e) => {
      e.preventDefault(); e.stopPropagation()
      if (e.key === 'Escape') { setRecording(false); return }
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return
      const mods = []
      if (e.ctrlKey)  mods.push('CommandOrControl')
      if (e.shiftKey) mods.push('Shift')
      if (e.altKey)   mods.push('Alt')
      if (e.metaKey)  mods.push(window.electronAPI?.platform === 'darwin' ? 'Meta' : 'Super')
      let key = e.code
      if      (key.startsWith('Key'))    key = key.slice(3)
      else if (key.startsWith('Digit'))  key = key.slice(5)
      else if (key === 'Space')          key = 'Space'
      else if (key === 'Enter')          key = 'Return'
      else if (key === 'Backspace')      key = 'Backspace'
      else if (key === 'Tab')            key = 'Tab'
      else if (key === 'Delete')         key = 'Delete'
      else if (key.startsWith('Arrow'))  key = key.replace('Arrow', '')
      else if (/^F\d{1,2}$/.test(key))   key = key
      else                               key = e.key.length === 1 ? e.key.toUpperCase() : (e.key || key)
      onChange([...mods, key].join('+'))
      setRecording(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [recording, onChange])

  return (
    <button
      type="button"
      className={`hotkey-chip ${recording ? 'recording' : ''}`}
      onClick={() => setRecording(true)}
      onBlur={() => setRecording(false)}
      title={recording ? 'Press any key or shortcut • Esc to cancel' : 'Click to change shortcut'}
      tabIndex={0}
    >
      {recording ? (
        <span className="hotkey-recording-text">
          <span className="hk-dot" aria-hidden />
          Press any key
          <span className="hk-hint"> · Esc to cancel</span>
        </span>
      ) : (
        renderHotkey(value)
      )}
    </button>
  )
})

// ── Icons ──────────────────────────────────────────────────────────────────────

// ── Model section ─────────────────────────────────────────────────────────────

function ModelSection({ whisperModel, setWhisperModel, ollamaModel, setOllamaModel, ollamaUrl, setOllamaUrl, onInstallStart }) {
  const [downloaded,   setDownloaded]   = useState({})
  const [loading,      setLoading]      = useState(false)
  const [downloading,  setDownloading]  = useState({})
  const [dlErrors,     setDlErrors]     = useState({})
  const [modelSearch,  setModelSearch]  = useState('')

  const [whisperReady,       setWhisperReady]       = useState(false)
  const [whisperInstalling,  setWhisperInstalling]  = useState(false)
  const [whisperLog,         setWhisperLog]         = useState('')

  const [deleting,     setDeleting]     = useState({})
  const [uninstallingWhisper, setUninstallingWhisper] = useState(false)

  const [ollamaStatus,       setOllamaStatus]       = useState(null)
  const [installingOllama,   setInstallingOllama]    = useState(false)
  const [ollamaInstallStage, setOllamaInstallStage] = useState('')
  const [ollamaInstallPct,   setOllamaInstallPct]   = useState(null)
  const [ollamaInstallErr,   setOllamaInstallErr]   = useState('')

  const refreshDownloaded = useCallback(async () => {
    setLoading(true)
    const r = await window.electronAPI?.getDownloadedModels?.().catch(() => null)
    if (r) setDownloaded(r)
    setLoading(false)
  }, [])

  const refreshOllama = useCallback(async () => {
    const r = await window.electronAPI?.checkSetup?.().catch(() => null)
    if (r) {
      setWhisperReady(!!r.whisperBinary)
      setOllamaStatus({ running: r.running, modelPulled: r.modelPulled })
    }
  }, [])

  useEffect(() => {
    refreshDownloaded()
    refreshOllama()
    const unsub = window.electronAPI?.onSetupProgress?.((d) => {
      if (d.type === 'model' && d.modelName) {
        if (d.pct != null) setDownloading(s => ({ ...s, [d.modelName]: d.pct }))
        if (d.done) {
          setDownloading(s => { const n = { ...s }; delete n[d.modelName]; return n })
          setDownloaded(s => ({ ...s, [d.modelName]: true }))
        }
      }
      if (d.type === 'build') {
        if (d.log) setWhisperLog(l => (l + d.log).slice(-800))
        if (d.stage === 'done') { setWhisperInstalling(false); setWhisperReady(true) }
      }
      if (d.type === 'ollama-install') {
        if (d.stage === 'downloading') { setOllamaInstallStage('downloading'); if (d.pct != null) setOllamaInstallPct(d.pct) }
        if (d.stage === 'installing')  { setOllamaInstallStage('installing'); setOllamaInstallPct(null) }
        if (d.stage === 'done')        { setOllamaInstallStage('done'); setInstallingOllama(false); refreshOllama() }
      }
    })
    return () => unsub?.()
  }, [refreshDownloaded, refreshOllama])

  const installWhisper = async () => {
    onInstallStart?.('build', 'Installing Whisper.cpp')
    setWhisperInstalling(true); setWhisperLog('')
    const res = await window.electronAPI?.buildWhisper?.()
    if (!res?.ok) { setWhisperInstalling(false); setWhisperLog(prev => prev + '\n' + (res?.error || 'Install failed')) }
  }

  const startDownload = async (modelValue) => {
    const m = WHISPER_MODELS.find(x => x.value === modelValue)
    onInstallStart?.('model', `Downloading ${m?.label || modelValue}`)
    setDlErrors(e => { const n = { ...e }; delete n[modelValue]; return n })
    setDownloading(s => ({ ...s, [modelValue]: 0 }))
    const res = await window.electronAPI?.downloadWhisperModel?.(modelValue)
    if (!res?.ok) {
      setDlErrors(e => ({ ...e, [modelValue]: res?.error || 'Download failed' }))
      setDownloading(s => { const n = { ...s }; delete n[modelValue]; return n })
    }
  }

  const selectModel = useCallback(async (modelValue) => {
    setWhisperModel(modelValue)
    try {
      const current = await window.electronAPI?.getSettings?.()
      await window.electronAPI?.saveSettings?.({ ...current, whisperModel: modelValue })
    } catch {}
  }, [setWhisperModel])

  const deleteModel = async (modelValue) => {
    setDeleting(s => ({ ...s, [modelValue]: true }))
    const res = await window.electronAPI?.deleteWhisperModel?.(modelValue)
    if (res?.ok) {
      setDownloaded(s => { const n = { ...s }; delete n[modelValue]; return n })
      if (whisperModel === modelValue) selectModel('base.en')
    }
    setDeleting(s => { const n = { ...s }; delete n[modelValue]; return n })
  }

  const uninstallWhisper = async () => {
    setUninstallingWhisper(true)
    const res = await window.electronAPI?.uninstallWhisper?.()
    if (res?.ok) {
      setWhisperReady(false)
      setDownloaded({})
    }
    setUninstallingWhisper(false)
  }

  const installOllama = async () => {
    onInstallStart?.('ollama-install', 'Installing Ollama')
    setOllamaInstallErr(''); setInstallingOllama(true); setOllamaInstallPct(0); setOllamaInstallStage('downloading')
    const res = await window.electronAPI?.installOllama?.()
    setInstallingOllama(false)
    if (!res?.ok) { setOllamaInstallErr(res?.error || 'Install failed'); setOllamaInstallStage('') }
    else { setOllamaInstallStage('done'); setTimeout(refreshOllama, 2000) }
  }

  const filtered = WHISPER_MODELS.filter(m =>
    m.label.toLowerCase().includes(modelSearch.toLowerCase()) ||
    m.value.toLowerCase().includes(modelSearch.toLowerCase())
  )

  return (
    <div className="ml-wrap">

      {/* ═══ Whisper.cpp engine card ═══════════════════════════════════ */}
      <div className="sw-section">
        <div className="sw-row">
          <div className="sw-row-left">
            <span className="sw-row-label">Whisper.cpp engine</span>
            <span className="sw-row-desc">Local speech-to-text — runs entirely on your machine</span>
          </div>
          <div className="sw-row-right">
            <span className={`ml-status-pill ${whisperReady ? 'ml-pill-ok' : whisperInstalling ? 'ml-pill-busy' : 'ml-pill-missing'}`}>
              <span className="ml-pill-dot" />
              {whisperInstalling ? 'Installing…' : whisperReady ? 'Installed' : 'Not installed'}
            </span>
          </div>
        </div>
        {whisperReady && !uninstallingWhisper && (
          <>
            <div className="sw-divider" />
            <div className="sw-row">
              <div className="sw-row-left">
                <span className="sw-row-label">Uninstall engine</span>
                <span className="sw-row-desc">Remove whisper.cpp binary and all downloaded models</span>
              </div>
              <div className="sw-row-right">
                <button className="sw-change-btn ml-uninstall-btn" onClick={uninstallWhisper}>
                  <TrashIcon /> Uninstall
                </button>
              </div>
            </div>
          </>
        )}
        {uninstallingWhisper && (
          <>
            <div className="sw-divider" />
            <div className="ml-progress-row">
              <span className="ml-spinner" />
              <span className="ml-progress-label">Removing…</span>
            </div>
          </>
        )}
        {!whisperReady && !whisperInstalling && !uninstallingWhisper && (
          <>
            <div className="sw-divider" />
            <div className="sw-row">
              <div className="sw-row-left">
                <span className="sw-row-label">Download whisper.cpp</span>
                <span className="sw-row-desc">Pre-built binary — no build tools required</span>
              </div>
              <div className="sw-row-right">
                <button className="sw-change-btn primary" onClick={installWhisper}>
                  <DownloadIcon /> Install
                </button>
              </div>
            </div>
          </>
        )}
        {whisperInstalling && (
          <>
            <div className="sw-divider" />
            <div className="ml-progress-row">
              <span className="ml-spinner" />
              <span className="ml-progress-label">Downloading and extracting…</span>
            </div>
          </>
        )}
        {whisperLog && (
          <pre className="ml-build-log">{whisperLog}</pre>
        )}
      </div>

      {/* ═══ Voice models card ════════════════════════════════════════ */}
      <div className="sw-section sw-section-gap">
        <div className="sw-row ml-models-header">
          <div className="sw-row-left">
            <span className="sw-row-label">Voice models</span>
            <span className="sw-row-desc">Pick which Whisper model to use for transcription</span>
          </div>
          <div className="sw-row-right">
            <button className="ml-icon-btn" title="Refresh download status" onClick={refreshDownloaded} disabled={loading}>
              <RefreshIcon spin={loading} />
            </button>
          </div>
        </div>

        <div className="sw-divider" />

        <div className="ml-search-row">
          <SearchSmIcon />
          <input
            className="ml-search"
            placeholder="Filter models…"
            value={modelSearch}
            onChange={e => setModelSearch(e.target.value)}
            spellCheck={false}
          />
        </div>

        <div className="ml-model-list">
          {filtered.map(m => {
            const active   = whisperModel === m.value
            const isDl     = downloaded[m.value]
            const dlPct    = downloading[m.value]
            const isActive = dlPct != null
            const err      = dlErrors[m.value]

            return (
              <div key={m.value} className={`ml-model-row${active ? ' ml-model-active' : ''}`}>
                <button
                  className={`ml-radio${active ? ' ml-radio-on' : ''}`}
                  onClick={() => { if (isDl && !active) selectModel(m.value) }}
                  disabled={!isDl}
                  title={isDl ? (active ? 'Currently selected' : 'Use this model') : 'Download first'}
                >
                  <span className="ml-radio-dot" />
                </button>
                <div className="ml-model-info">
                  <div className="ml-model-name">{m.label}</div>
                  <div className="ml-model-meta">
                    <span className="ml-tag">{m.size}</span>
                    <span className="ml-tag">{m.speed}</span>
                    {isDl && <span className="ml-tag ml-tag-ready">Ready</span>}
                  </div>
                  {err && <span className="ml-model-err">{err}</span>}
                  {isActive && (
                    <div className="ml-bar-track">
                      <div className="ml-bar-fill" style={{ width: `${dlPct}%` }} />
                    </div>
                  )}
                </div>
                <div className="ml-model-actions">
                  <ModelInfoTip model={m} />
                  {isActive && <span className="ml-spinner" />}
                  {isActive && <span className="ml-pct">{dlPct}%</span>}
                  {isDl && !isActive && (
                    <button
                      className="ml-delete-btn"
                      onClick={() => deleteModel(m.value)}
                      disabled={deleting[m.value]}
                      title={`Delete ${m.label}`}
                    >
                      {deleting[m.value] ? <span className="ml-spinner ml-spinner-sm" /> : <TrashIcon />}
                    </button>
                  )}
                  {!isDl && !isActive && (
                    <button className="sw-change-btn" onClick={() => startDownload(m.value)} title={`Download ${m.label}`}>
                      <DownloadIcon /> Get
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ Ollama LLM card ═════════════════════════════════════════ */}
      <div className="sw-section sw-section-gap">
        <div className="sw-row">
          <div className="sw-row-left">
            <span className="sw-row-label">Ollama — local LLM</span>
            <span className="sw-row-desc">Cleans up transcriptions, tags files, and powers AI features</span>
          </div>
          <div className="sw-row-right">
            <span className={`ml-status-pill ${
              ollamaStatus?.running ? 'ml-pill-ok'
                : installingOllama ? 'ml-pill-busy'
                : ollamaInstallStage === 'done' ? 'ml-pill-partial'
                : 'ml-pill-missing'
            }`}>
              <span className="ml-pill-dot" />
              {ollamaStatus === null ? 'Checking…' :
               ollamaStatus.running ? 'Running'
                 : installingOllama
                   ? (ollamaInstallStage === 'downloading' ? 'Downloading…' : 'Installing…')
                   : ollamaInstallStage === 'done' ? 'Restart needed' : 'Not installed'}
            </span>
          </div>
        </div>

        {ollamaInstallErr && (
          <div className="ml-model-err" style={{padding:'0 20px 10px'}}>{ollamaInstallErr}</div>
        )}

        {!ollamaStatus?.running && !installingOllama && ollamaInstallStage !== 'done' && (
          <>
            <div className="sw-divider" />
            <div className="sw-row">
              <div className="sw-row-left">
                <span className="sw-row-label">Install Ollama</span>
                <span className="sw-row-desc">Downloads and installs the Ollama service on your system</span>
              </div>
              <div className="sw-row-right">
                <button className="sw-change-btn primary" onClick={installOllama}>
                  <DownloadIcon /> Install
                </button>
              </div>
            </div>
          </>
        )}

        <div className="sw-divider" />

        <div className="sw-row">
          <div className="sw-row-left">
            <span className="sw-row-label">Server URL</span>
            <span className="sw-row-desc">Where Ollama is running</span>
          </div>
          <div className="sw-row-right">
            <input
              type="text" className="sw-input"
              placeholder="http://localhost:11434"
              value={ollamaUrl} onChange={e => setOllamaUrl(e.target.value)}
              autoComplete="off" spellCheck={false}
            />
          </div>
        </div>

        <div className="sw-divider" />

        <div className="sw-row">
          <div className="sw-row-left">
            <span className="sw-row-label">Model name</span>
            <span className="sw-row-desc">
              Which model Ollama should use ·{' '}
              <a className="ml-link" href="#"
                onClick={e => { e.preventDefault(); window.electronAPI?.openExternal?.('https://ollama.com/library') }}>
                browse library
              </a>
            </span>
          </div>
          <div className="sw-row-right">
            <input
              type="text" className="sw-input"
              placeholder="llama3.2"
              value={ollamaModel} onChange={e => setOllamaModel(e.target.value)}
              autoComplete="off" spellCheck={false}
            />
          </div>
        </div>

        <div className="sw-divider" />
        <div className="sw-row">
          <div className="sw-row-left">
            <span className="sw-row-label">Check status</span>
            <span className="sw-row-desc">Re-check if Ollama is running and the model is available</span>
          </div>
          <div className="sw-row-right">
            <button className="sw-change-btn" onClick={refreshOllama}>
              <RefreshIcon /> Refresh
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}

function ModelInfoTip({ model }) {
  const [show, setShow] = useState(false)
  const ref = useRef(null)

  return (
    <div className="ml-info-anchor" ref={ref}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <button className="ml-info-btn" type="button" tabIndex={-1} aria-label="Model info">
        <InfoIcon />
      </button>
      {show && (
        <div className="ml-info-tip">
          <div className="ml-info-tip-title">{model.label}</div>
          <p className="ml-info-tip-desc">{model.desc}</p>
          <div className="ml-info-tip-row">{model.params}</div>
          <div className="ml-info-tip-row">{model.size} download</div>
          <div className="ml-info-tip-row">
            <span className="ml-info-tip-muted">Speed:</span> {model.speed}
          </div>
          <div className="ml-info-tip-row">
            <span className="ml-info-tip-muted">Quality:</span> {model.quality}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function RefreshIcon({ spin }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={spin ? { animation: 'spin 0.7s linear infinite' } : undefined}>
      <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  )
}

function SearchSmIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

function DismissIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function GeneralIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="9" y1="22" x2="15" y2="22"/>
    </svg>
  )
}

function ApiIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/>
      <path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function ThemeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
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
