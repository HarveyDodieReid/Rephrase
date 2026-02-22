import { useState, useEffect, useRef, memo } from 'react'

const GROQ_MODEL = 'llama-3.3-70b-versatile'

const MODELS = [
  {
    id: 'groq',
    label: 'Groq',
    provider: 'Groq',
    desc: 'Fast, smart, and always free — the default Rephrase model',
    value: GROQ_MODEL,
    available: true,
  },
  {
    id: 'claude',
    label: 'Claude Sonnet 3.5',
    provider: 'Anthropic',
    desc: 'Advanced reasoning, nuanced writing, and long context',
    value: 'claude-sonnet-3-5',
    available: false,
  },
  {
    id: 'gpt4o',
    label: 'GPT-4o',
    provider: 'OpenAI',
    desc: 'Versatile multimodal intelligence from OpenAI',
    value: 'gpt-4o',
    available: false,
  },
  {
    id: 'gemini',
    label: 'Gemini 1.5 Pro',
    provider: 'Google',
    desc: 'Long-context reasoning across text, code, and data',
    value: 'gemini-1.5-pro',
    available: false,
  },
  {
    id: 'mistral',
    label: 'Mistral Large',
    provider: 'Mistral AI',
    desc: 'Efficient, multilingual, and open-weight AI',
    value: 'mistral-large',
    available: false,
  },
]

export const SETTINGS_NAV = [
  { id: 'general', label: 'General', icon: GeneralIcon },
  { id: 'voice',   label: 'Voice',   icon: MicIcon     },
]

// ── Main exportable settings body ─────────────────────────────────────────────
// Renders the settings form (everything except the window chrome / title bar).
// `section`        — currently-active section id
// `onShowToast`    — function(msg: string) provided by the parent
export default function SettingsContent({ section, onShowToast, onThemeChange }) {
  const [model,           setModel]          = useState(GROQ_MODEL)
  const [groqApiKey,      setGroqApiKey]     = useState('')
  const [theme,           setTheme]          = useState('light')
  const [hotkeyRephrase,  setHotkeyRephrase] = useState('CommandOrControl+Shift+Space')
  const [hotkeyVoice,     setHotkeyVoice]    = useState('Control+Super')
  const [hotkeyComposer,  setHotkeyComposer] = useState('Alt+Super')
  const [hotkeyHandsFree, setHotkeyHandsFree] = useState('Control+Space+Super')
  const [saveStatus,      setSaveStatus]     = useState('idle')

  // Microphone
  const [micDevices,  setMicDevices]  = useState([])
  const [selectedMic, setSelectedMic] = useState('default')
  const [micPerm,     setMicPerm]     = useState('unknown')

  const [cacheStatus,  setCacheStatus]  = useState('idle')   // idle | clearing

  useEffect(() => {
    window.electronAPI?.getSettings().then((s) => {
      if (s.model)              setModel(s.model)
      if (s.groqApiKey)         setGroqApiKey(s.groqApiKey)
      if (s.theme)              { setTheme(s.theme); onThemeChange?.(s.theme) }
      if (s.micDeviceId)        setSelectedMic(s.micDeviceId)
      if (s.hotkeyRephrase)     setHotkeyRephrase(s.hotkeyRephrase)
      if (s.hotkeyVoice)        setHotkeyVoice(s.hotkeyVoice)
      if (s.hotkeyComposer)     setHotkeyComposer(s.hotkeyComposer)
      if (s.hotkeyHandsFree)    setHotkeyHandsFree(s.hotkeyHandsFree)
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
    setHotkeyHandsFree('Control+Space+Super')
  }

  const save = async () => {
    setSaveStatus('saving')
    await window.electronAPI?.saveSettings({
      model,
      groqApiKey,
      theme,
      micDeviceId: selectedMic,
      hotkeyRephrase, hotkeyVoice, hotkeyHandsFree, hotkeyComposer,
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
              label="Groq API Key"
              desc="Required for rephrase, voice, and composer. Get one at console.groq.com"
            >
              <div className="sw-groq-row">
                <input
                  type="password"
                  className="sw-input"
                  placeholder="gsk_..."
                  value={groqApiKey}
                  onChange={e => setGroqApiKey(e.target.value)}
                  autoComplete="off"
                />
                <a
                  className="sw-groq-link"
                  href="#"
                  onClick={(e) => { e.preventDefault(); window.electronAPI?.openExternal?.('https://console.groq.com/keys'); }}
                >
                  Get API key →
                </a>
              </div>
            </SettingRow>
            <Divider />
            <SettingRow
              label="Theme"
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
            <Divider />
            <ShortcutRow
              label="Hands-free mode"
              desc="Toggle dictation on or off"
              value={hotkeyHandsFree}
              onChange={setHotkeyHandsFree}
            />
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
            <SettingRow label="Transcription model" desc="Powered by Groq Whisper large-v3-turbo — fast and accurate">
              <span className="sw-badge">whisper-large-v3-turbo</span>
            </SettingRow>
            <Divider />
            <SettingRow label="Language" desc="Whisper automatically detects your spoken language">
              <span className="sw-badge">Auto-detect</span>
            </SettingRow>
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

// ── Model picker (hidden for now) ─────────────────────────────────────────────

function ModelPicker({ model, setModel }) {
  const [expanded, setExpanded] = useState(false)
  const active = MODELS.find(m => m.value === model) || MODELS[0]
  const rest   = MODELS.filter(m => m.id !== active.id)

  return (
    <div className="model-picker-v2">
      {/* ── Always-shown active model ─────────────────────── */}
      <div className="model-row model-available model-selected">
        <div className="model-logo-wrap">
          <ModelLogo id={active.id} />
        </div>
        <div className="model-info">
          <div className="model-name-row">
            <span className="model-name">{active.label}</span>
            <span className="model-provider">{active.provider}</span>
          </div>
          <span className="model-desc">{active.desc}</span>
        </div>
        <div className="model-side">
          <span className="model-badge-free">Free</span>
          <svg className="model-check" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" fill="#5046e4"/>
            <path d="m5 8 2 2 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* ── Expand / collapse button ──────────────────────── */}
      <div className="model-expand-row">
        <button
          className="model-expand-btn"
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? (
            <><ChevronUpIcon /> Show fewer models</>
          ) : (
            <><ChevronDownIcon /> View {rest.length} more models</>
          )}
        </button>
      </div>

      {/* ── Expanded list ─────────────────────────────────── */}
      {expanded && (
        <div className="model-expanded">
          {rest.map(m => (
            <div key={m.id}>
              <div className="sw-divider" />
              <div
                className={`model-row ${m.available ? 'model-available' : 'model-locked'} ${model === m.value ? 'model-selected' : ''}`}
                onClick={() => m.available && setModel(m.value)}
              >
                <div className="model-logo-wrap">
                  <ModelLogo id={m.id} />
                </div>
                <div className="model-info">
                  <div className="model-name-row">
                    <span className="model-name">{m.label}</span>
                    <span className="model-provider">{m.provider}</span>
                  </div>
                  <span className="model-desc">{m.desc}</span>
                </div>
                <div className="model-side">
                  {m.available ? (
                    <>
                      <span className="model-badge-free">Free</span>
                      {model === m.value && (
                        <svg className="model-check" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="7" fill="#5046e4"/>
                          <path d="m5 8 2 2 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="model-badge-pro">
                        <svg width="9" height="11" viewBox="0 0 9 11" fill="none">
                          <rect x="1" y="4.5" width="7" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
                          <path d="M2.5 4.5V3a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                        Pro
                      </span>
                      <div className="model-tooltip">
                        We're currently integrating {m.label} — available with our Pro plan. Groq is always free.
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Brand logos ───────────────────────────────────────────────────────────────

function ModelLogo({ id }) {
  if (id === 'groq')    return <GroqLogo />
  if (id === 'claude')  return <AnthropicLogo />
  if (id === 'gpt4o')   return <OpenAILogo />
  if (id === 'gemini')  return <GeminiLogo />
  if (id === 'mistral') return <MistralLogo />
  return null
}

/** Groq — orange rounded square with bold G */
function GroqLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <rect width="30" height="30" rx="8" fill="#FF6A14"/>
      {/* Bold G formed from two rectangles */}
      <path
        d="M22 11H14C11.2 11 9 13.2 9 16C9 18.8 11.2 21 14 21H17V18.5H14C12.6 18.5 11.5 17.4 11.5 16C11.5 14.6 12.6 13.5 14 13.5H22V11Z"
        fill="white"
      />
      <rect x="17" y="16" width="5" height="2.5" rx="0.5" fill="white"/>
    </svg>
  )
}

/** Anthropic — warm terracotta with stylised A (triangle + crossbar) */
function AnthropicLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <rect width="30" height="30" rx="8" fill="#C5704A"/>
      {/* Outer A shape */}
      <path d="M15 6.5L21.5 23H18.5L15 13L11.5 23H8.5L15 6.5Z" fill="white" fillOpacity="0.95"/>
      {/* Crossbar cutout */}
      <rect x="11.5" y="17.5" width="7" height="2" rx="0.5" fill="#C5704A"/>
    </svg>
  )
}

/** OpenAI — black with the classic 6-petal swirl */
function OpenAILogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <rect width="30" height="30" rx="8" fill="#000"/>
      {/* 6 elliptical petals rotated at 60° intervals around centre (15,15) */}
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse
          key={deg}
          cx="15"
          cy="10.5"
          rx="2.1"
          ry="4.5"
          fill="white"
          fillOpacity="0.9"
          transform={`rotate(${deg} 15 15)`}
        />
      ))}
    </svg>
  )
}

/** Google Gemini — white card with the 4-colour Google G */
function GeminiLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <rect width="30" height="30" rx="8" fill="#fff" stroke="rgba(0,0,0,0.10)" strokeWidth="1"/>
      {/* Clip path — the G outline */}
      <defs>
        <clipPath id="gg-clip">
          <path d="M24 15.5H16V18H20.8C20.3 20 18.4 21.5 16 21.5C13 21.5 10.5 19 10.5 16S13 10.5 16 10.5C17.4 10.5 18.7 11 19.6 11.9L21.7 9.8C20.2 8.4 18.2 7.5 16 7.5C11.3 7.5 7.5 11.3 7.5 16S11.3 24.5 16 24.5C20.7 24.5 24 21.3 24 16.5V15.5Z"/>
        </clipPath>
      </defs>
      {/* Blue — left arc */}
      <rect x="7" y="7" width="9" height="9" fill="#4285F4" clipPath="url(#gg-clip)"/>
      {/* Red — top-right */}
      <rect x="16" y="7" width="8" height="9" fill="#EA4335" clipPath="url(#gg-clip)"/>
      {/* Yellow — horizontal bar */}
      <rect x="16" y="15" width="8" height="5" fill="#FBBC05" clipPath="url(#gg-clip)"/>
      {/* Green — bottom */}
      <rect x="7" y="16" width="13" height="9" fill="#34A853" clipPath="url(#gg-clip)"/>
    </svg>
  )
}

/** Mistral — dark slate with orange layered wave marks */
function MistralLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      <rect width="30" height="30" rx="8" fill="#252220"/>
      {/* Mistral stacked horizontal bars (their "M" stack motif) */}
      <rect x="7"  y="9"  width="16" height="3"   rx="1.5" fill="#F54703"/>
      <rect x="7"  y="13.5" width="16" height="3" rx="1.5" fill="#F54703" fillOpacity="0.75"/>
      <rect x="7"  y="18" width="16" height="3"   rx="1.5" fill="#F54703" fillOpacity="0.45"/>
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2 4 6 8 10 4"/>
    </svg>
  )
}

function ChevronUpIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2 8 6 4 10 8"/>
    </svg>
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
      if (e.metaKey)  mods.push('Super')
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

function UpdateIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  )
}
