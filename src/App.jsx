import AuthWindow    from './pages/AuthWindow.jsx'
import Dashboard     from './pages/Dashboard.jsx'
import SettingsWindow from './pages/SettingsWindow.jsx'
import SafetyOverlay from './pages/SafetyOverlay.jsx'
import VoiceOverlay   from './pages/VoiceOverlay.jsx'
import VoiceRecorder  from './pages/VoiceRecorder.jsx'
import UpdateNotif    from './pages/UpdateNotif.jsx'
import ComposerWidget from './pages/ComposerWidget.jsx'
import './App.css'

const HASH = window.location.hash

export default function App() {
  if (HASH === '#auth')           return <AuthWindow />
  if (HASH === '#dashboard')      return <Dashboard />
  if (HASH === '#settings')       return <SettingsWindow />
  if (HASH === '#safety-overlay') return <SafetyOverlay />
  if (HASH === '#voice-overlay')  return <VoiceOverlay />
  if (HASH === '#update-notif')   return <UpdateNotif />
  if (HASH === '#composer-widget') return <ComposerWidget />

  // Main background window — invisible, hosts the voice recorder
  return <VoiceRecorder />
}
