const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls (work for any window via event.sender in main)
  close:        () => ipcRenderer.invoke('window-close'),
  minimize:     () => ipcRenderer.invoke('window-minimize'),
  maximize:     () => ipcRenderer.invoke('window-maximize'),
  moveWindow:   (delta) => ipcRenderer.invoke('window-move', delta),
  setFocusable: (focusable) => ipcRenderer.invoke('set-focusable', focusable),

  // Settings window
  openSettingsWindow: () => ipcRenderer.invoke('open-settings-window'),

  // Settings data
  getSettings:  () => ipcRenderer.invoke('get-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  clearCache:   () => ipcRenderer.invoke('clear-cache'),

  // Manual rewrite
  rephrase: () => ipcRenderer.invoke('rephrase'),

  // Vibe Code: pick file and edit with AI
  // Voice dictation
  transcribeAudio: (buffer) => ipcRenderer.invoke('transcribe-audio', buffer),
  insertText:      (text)   => ipcRenderer.invoke('insert-text', text),

  // Voice training
  getTrainingPhrases:      ()     => ipcRenderer.invoke('get-training-phrases'),
  getVoiceProfile:         ()     => ipcRenderer.invoke('get-voice-profile'),
  saveVoiceTrainingEnabled:(e)    => ipcRenderer.invoke('save-voice-training-enabled', e),
  processTrainingSample:   (data) => ipcRenderer.invoke('process-training-sample', data),
  buildVoiceProfile:       (data) => ipcRenderer.invoke('build-voice-profile', data),
  clearVoiceProfile:       ()     => ipcRenderer.invoke('clear-voice-profile'),

  // Push events: main → renderer
  onRephraseStatus: (cb) => {
    ipcRenderer.on('rephrase-status', (_, d) => cb(d))
    return () => ipcRenderer.removeAllListeners('rephrase-status')
  },
  onAutoFixStatus: (cb) => {
    ipcRenderer.on('autofix-status', (_, s) => cb(s))
    return () => ipcRenderer.removeAllListeners('autofix-status')
  },
  onVoiceStart: (cb) => {
    ipcRenderer.on('voice-start', () => cb())
    return () => ipcRenderer.removeAllListeners('voice-start')
  },
  onVoiceStop: (cb) => {
    ipcRenderer.on('voice-stop', () => cb())
    return () => ipcRenderer.removeAllListeners('voice-stop')
  },
  // Voice overlay status (listening → transcribing → done)
  onVoiceOverlayStatus: (cb) => {
    ipcRenderer.on('voice-overlay-status', (_, s) => cb(s))
    return () => ipcRenderer.removeAllListeners('voice-overlay-status')
  },
  // Real Windows icon + process name of the focused app (polled on mount)
  getOverlayIcon: () => ipcRenderer.invoke('get-overlay-icon'),
  // Pushed from main once icon extraction finishes (may arrive after mount)
  onVoiceOverlayIcon: (cb) => {
    ipcRenderer.on('voice-overlay-icon', (_, d) => cb(d))
    return () => ipcRenderer.removeAllListeners('voice-overlay-icon')
  },

  // Maximize state changes (for the settings window title bar button icon)
  onWindowMaximized: (cb) => {
    ipcRenderer.on('window-maximized', () => cb())
    return () => ipcRenderer.removeAllListeners('window-maximized')
  },
  onWindowUnmaximized: (cb) => {
    ipcRenderer.on('window-unmaximized', () => cb())
    return () => ipcRenderer.removeAllListeners('window-unmaximized')
  },

  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  platform: process.platform,

  // ── Auth ──────────────────────────────────────────────────────────────────
  // Called by AuthWindow after a successful sign-in — saves session & transitions to dashboard
  switchToDashboard: (session) => ipcRenderer.invoke('switch-to-dashboard', session),
  // Legacy: kept for any remaining callers
  setAuthSession: (session) => ipcRenderer.invoke('set-auth-session', session),
  // Query the current auth state from main (returns { isAuthenticated, email })
  getAuthState:   ()        => ipcRenderer.invoke('get-auth-state'),
  // Sign out — resizes window back to auth and reloads
  signOut:        ()        => ipcRenderer.invoke('sign-out'),
  // Pushed from main when an OAuth browser redirect completes (Windows)
  onOAuthTokens: (cb) => {
    ipcRenderer.on('oauth-tokens', (_, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('oauth-tokens')
  },

  // ── Transcripts ───────────────────────────────────────────────────────────
  getTranscripts:    ()    => ipcRenderer.invoke('get-transcripts'),
  deleteTranscript:  (id)  => ipcRenderer.invoke('delete-transcript', id),
  clearTranscripts:  ()    => ipcRenderer.invoke('clear-transcripts'),
  // Pushed from main when a new transcript is ready (real-time update)
  onNewTranscript: (cb) => {
    ipcRenderer.on('new-transcript', (_, t) => cb(t))
    return () => ipcRenderer.removeAllListeners('new-transcript')
  },

  // ── System info ───────────────────────────────────────────────────────────
  getComputerName: () => ipcRenderer.invoke('get-computer-name'),
  getUserAvatar:   () => ipcRenderer.invoke('get-user-avatar'),

  // ── Updates ───────────────────────────────────────────────────────────────
  getAppVersion:   () => ipcRenderer.invoke('get-app-version'),
  // Returns null (no update) or { version, url, notes }; in prod, result comes via events
  checkForUpdate:  () => ipcRenderer.invoke('check-for-update'),
  downloadUpdate:  () => ipcRenderer.invoke('download-update'),
  installUpdate:   () => ipcRenderer.invoke('install-update'),
  getUpdateInfo:   () => ipcRenderer.invoke('get-update-info'),
  openUpdateWindow: (info) => ipcRenderer.invoke('open-update-window', info),
  closeUpdateNotif: () => ipcRenderer.invoke('close-update-notif'),
  onUpdateChecking:        (cb) => { ipcRenderer.on('update-checking', () => cb()); return () => ipcRenderer.removeAllListeners('update-checking') },
  onUpdateAvailable:       (cb) => { ipcRenderer.on('update-available', (_, d) => cb(d)); return () => ipcRenderer.removeAllListeners('update-available') },
  onUpdateNotAvailable:    (cb) => { ipcRenderer.on('update-not-available', () => cb()); return () => ipcRenderer.removeAllListeners('update-not-available') },
  onUpdateDownloadProgress:(cb) => { ipcRenderer.on('update-download-progress', (_, d) => cb(d)); return () => ipcRenderer.removeAllListeners('update-download-progress') },
  onUpdateDownloaded:      (cb) => { ipcRenderer.on('update-downloaded', (_, d) => cb(d)); return () => ipcRenderer.removeAllListeners('update-downloaded') },
  onUpdateError:           (cb) => { ipcRenderer.on('update-error', (_, d) => cb(d)); return () => ipcRenderer.removeAllListeners('update-error') },

  // ── Composer ──────────────────────────────────────────────────────────────
  getComposerBuffer: () => ipcRenderer.invoke('get-composer-buffer'),
  clearComposer:     () => ipcRenderer.invoke('clear-composer'),
  generateComposer:  (type) => ipcRenderer.invoke('generate-composer', type),
  onComposerUpdate:  (cb) => {
    ipcRenderer.on('composer-update', (_, d) => cb(d))
    return () => ipcRenderer.removeAllListeners('composer-update')
  },
  onComposerGenerating: (cb) => {
    ipcRenderer.on('composer-generating', (_, b) => cb(b))
    return () => ipcRenderer.removeAllListeners('composer-generating')
  },

  // ── Safety ────────────────────────────────────────────────────────────────
  onSafetyStatus: (cb) => {
    ipcRenderer.on('safety-status', (_, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('safety-status')
  },
  safetyProceed: () => ipcRenderer.invoke('safety-proceed'),
  safetyClose:   () => ipcRenderer.invoke('safety-close'),

  // ── Setup / install ───────────────────────────────────────────────────────
  checkSetup:           (model) => ipcRenderer.invoke('check-setup', model),
  getDownloadedModels:  ()      => ipcRenderer.invoke('get-downloaded-models'),
  downloadWhisperModel: (model) => ipcRenderer.invoke('download-whisper-model', model),
  buildWhisper:        ()      => ipcRenderer.invoke('build-whisper'),
  installOllama:       ()      => ipcRenderer.invoke('install-ollama'),
  pullOllamaModel:     ()      => ipcRenderer.invoke('pull-ollama-model'),
  deleteWhisperModel:  (model) => ipcRenderer.invoke('delete-whisper-model', model),
  uninstallWhisper:    ()      => ipcRenderer.invoke('uninstall-whisper'),
  onSetupProgress: (cb) => {
    ipcRenderer.on('setup-progress', (_, d) => cb(d))
    return () => ipcRenderer.removeAllListeners('setup-progress')
  },

  // #region agent log — debug bridge
  __debugLog: (payload) => ipcRenderer.invoke('__debug_log', payload),
  // #endregion
})
