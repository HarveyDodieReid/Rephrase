import { useState, useEffect } from 'react'
import './ComposerWidget.css'

export default function ComposerWidget() {
  const [buffer, setBuffer] = useState([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [ollamaModel, setOllamaModel] = useState('')

  useEffect(() => {
    window.electronAPI?.getComposerBuffer?.().then(b => { if (b) setBuffer(b) })
    window.electronAPI?.getSettings?.().then(s => {
      if (s?.ollamaModel) setOllamaModel(s.ollamaModel)
    })

    const unsubUpdate = window.electronAPI?.onComposerUpdate?.((d) => setBuffer(d || []))
    const unsubGen = window.electronAPI?.onComposerGenerating?.((b) => setGenerating(b))

    return () => {
      unsubUpdate?.()
      unsubGen?.()
    }
  }, [])

  const handleGenerate = async (type) => {
    setGenerating(true)
    setError(null)
    const result = await window.electronAPI?.generateComposer?.(type)
    if (!result?.ok) {
      setError(result?.error || 'Generation failed')
      setGenerating(false)
    }
  }

  const handleClear = () => {
    setError(null)
    window.electronAPI?.clearComposer?.()
  }

  const wordCount = buffer.join(' ').split(/\s+/).filter(Boolean).length

  return (
    <div className="cw-root">
      <div className="cw-header">
        <div className="cw-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="cw-icon">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          Composer
        </div>
        <button className="cw-close" onClick={handleClear} title="Discard & Close">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="1" y1="1" x2="9" y2="9"/>
            <line x1="9" y1="1" x2="1" y2="9"/>
          </svg>
        </button>
      </div>

      <div className="cw-body">
        {buffer.length === 0 ? (
          <p className="cw-empty">Hold Alt + Win to record a thought. Your words are transcribed locally and added here.</p>
        ) : (
          <>
            <div className="cw-stats">
              <span className="cw-stat-badge">{buffer.length} thought{buffer.length !== 1 ? 's' : ''}</span>
              <span className="cw-stat-badge">{wordCount} words</span>
            </div>
            <div className="cw-buffer-list">
              {buffer.map((text, i) => (
                <div key={i} className="cw-buffer-item">
                  <span className="cw-buffer-num">{i + 1}</span>
                  <p className="cw-buffer-text">{text}</p>
                </div>
              ))}
            </div>
          </>
        )}
        <p className="cw-hint">
          Record more with your shortcut, or generate below. Uses your local Ollama model{ollamaModel ? ` (${ollamaModel})` : ''}.
        </p>

        {error && <div className="cw-error">{error}</div>}
      </div>

      <div className="cw-actions">
        <button 
          className={`cw-btn cw-btn-email ${generating ? 'disabled' : ''}`}
          disabled={generating || buffer.length === 0}
          onClick={() => handleGenerate('email')}
        >
          {generating ? <span className="cw-spinner"/> : 'Generate Email'}
        </button>
        <button 
          className={`cw-btn cw-btn-doc ${generating ? 'disabled' : ''}`}
          disabled={generating || buffer.length === 0}
          onClick={() => handleGenerate('document')}
        >
          {generating ? <span className="cw-spinner"/> : 'Generate Document'}
        </button>
      </div>
    </div>
  )
}