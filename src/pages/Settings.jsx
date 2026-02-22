import { useState, useEffect } from 'react'
import './Settings.css'

const MODELS = [
  { value: 'llama-3.1-8b-instant',    label: 'Fast',     desc: 'Llama 3.1 8B' },
  { value: 'llama-3.3-70b-versatile', label: 'Powerful', desc: 'Llama 3.3 70B' },
  { value: 'gemma2-9b-it',            label: 'Balanced', desc: 'Gemma 2 9B' },
  { value: 'mixtral-8x7b-32768',      label: 'Long',     desc: 'Mixtral 8×7B' },
]

const DELAYS = [
  { value: 1500, label: '1.5s' },
  { value: 2000, label: '2s' },
  { value: 3000, label: '3s' },
  { value: 4000, label: '4s' },
]

export default function Settings({ onDone }) {
  const [model, setModel] = useState('llama-3.1-8b-instant')
  const [autoFix, setAutoFix] = useState(false)
  const [autoFixDelay, setAutoFixDelay] = useState(2000)
  const [saveStatus, setSaveStatus] = useState('idle')

  useEffect(() => {
    window.electronAPI?.getSettings().then((s) => {
      if (s.model)        setModel(s.model)
      if (s.autoFix != null) setAutoFix(s.autoFix)
      if (s.autoFixDelay) setAutoFixDelay(s.autoFixDelay)
    })
  }, [])

  const handleSave = async () => {
    setSaveStatus('saving')
    try {
      await window.electronAPI?.saveSettings({ model, autoFix, autoFixDelay })
      setSaveStatus('saved')
      setTimeout(() => { setSaveStatus('idle'); onDone() }, 700)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  return (
    <div className="settings">

      {/* Model */}
      <div className="settings-section">
        <label className="settings-label">Model</label>
        <div className="chip-row">
          {MODELS.map((m) => (
            <button
              key={m.value}
              className={`chip ${model === m.value ? 'active' : ''}`}
              onClick={() => setModel(m.value)}
              title={m.desc}
            >
              {m.label}
            </button>
          ))}
        </div>
        <span className="settings-hint">{MODELS.find(m => m.value === model)?.desc}</span>
      </div>

      {/* Auto-fix divider */}
      <div className="settings-divider" />

      {/* Auto-fix toggle */}
      <div className="settings-section">
        <div className="toggle-row">
          <div className="toggle-info">
            <span className="toggle-title">Auto-fix while typing</span>
            <span className="toggle-desc">
              Silently fixes spelling &amp; grammar after you pause. Never interrupts mid-sentence.
            </span>
          </div>
          <button
            className={`toggle-switch ${autoFix ? 'on' : ''}`}
            onClick={() => setAutoFix(v => !v)}
            aria-label="Toggle auto-fix"
          >
            <span className="toggle-knob" />
          </button>
        </div>

        {autoFix && (
          <div className="delay-row">
            <span className="settings-label">Fix after pause of</span>
            <div className="chip-row">
              {DELAYS.map((d) => (
                <button
                  key={d.value}
                  className={`chip sm ${autoFixDelay === d.value ? 'active' : ''}`}
                  onClick={() => setAutoFixDelay(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        className={`save-btn ${saveStatus}`}
        onClick={handleSave}
        disabled={saveStatus === 'saving' || saveStatus === 'saved'}
      >
        {saveStatus === 'saving' && 'Saving…'}
        {saveStatus === 'saved'  && '✓ Done'}
        {saveStatus === 'error'  && 'Try again'}
        {saveStatus === 'idle'   && 'Save'}
      </button>
    </div>
  )
}
