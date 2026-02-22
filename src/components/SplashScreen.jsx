import { useState, useEffect } from 'react'
import BrandMark from './BrandMark.jsx'
import './SplashScreen.css'

export default function SplashScreen({ onComplete, duration = 1800 }) {
  const [visible, setVisible] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(t)
  }, [])

  useEffect(() => {
    const hideAt = setTimeout(() => setVisible(false), duration)
    const completeAt = setTimeout(() => onComplete?.(), duration + 400)
    return () => { clearTimeout(hideAt); clearTimeout(completeAt) }
  }, [duration, onComplete])

  return (
    <div className={`splash-root ${visible ? '' : 'splash-exit'}`}>
      <div className={`splash-inner ${mounted ? 'splash-inner--visible' : ''}`}>
        <div className="splash-logo">
          <BrandMark size={80} variant="full" theme="light" alt="TransFlow" />
        </div>
        <p className="splash-tagline">Voice to text, anywhere</p>
        <div className="splash-loader">
          <span className="splash-loader-bar" />
        </div>
      </div>
    </div>
  )
}
