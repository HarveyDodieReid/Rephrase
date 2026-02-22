import { useRef, useCallback } from 'react'
import './TitleBar.css'

export default function TitleBar() {
  const startPos = useRef(null)

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    startPos.current = { x: e.screenX, y: e.screenY }

    const onMove = (ev) => {
      if (!startPos.current) return
      const dx = ev.screenX - startPos.current.x
      const dy = ev.screenY - startPos.current.y
      startPos.current = { x: ev.screenX, y: ev.screenY }
      window.electronAPI?.moveWindow({ dx, dy })
    }

    const onUp = () => {
      startPos.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  return (
    <div className="titlebar" onMouseDown={handleMouseDown}>
      <div className="titlebar-left">
        <div className="titlebar-dot" />
        <span className="titlebar-name">Rephrase</span>
      </div>
      <div className="titlebar-actions" onMouseDown={(e) => e.stopPropagation()}>
        <button
          className="titlebar-btn"
          onClick={() => window.electronAPI?.openSettingsWindow()}
          title="Settings"
        >
          <SettingsIcon />
        </button>
        <button
          className="titlebar-btn close"
          onClick={() => window.electronAPI?.close()}
          title="Close"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  )
}

function SettingsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
      <path d="M1 1L8 8M8 1L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
