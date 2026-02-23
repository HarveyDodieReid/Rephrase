# Changelog

## v1.4.0 (2026-02-23)

### Updates on the splash screen
- **Update flow on splash** — Checking for updates now runs during the splash screen. When a new version is available, the splash shows "A new update is available" with version, **Install now** and **Not now**. Install now starts the download (with progress), then "Restart to install" when ready; Not now continues into the app.
- **Splash theme** — The splash panel uses the same theme (light/dark) as the rest of the app, including the logo and update buttons.
- **Preload** — Added `onUpdateChecking` so the UI can react to the start of an update check.

### Voice and overlay
- **Voice overlay** — "Listening" and "Transcribing…" are larger and more prominent. Clipboard is cleared after paste so pasted text doesn't duplicate.
- **Overlay look** — Voice overlay is now a semi-transparent pill with backdrop blur instead of a solid white background.
- **Voice recording** — Minimum recording length (700ms) before stop to avoid "audio too short" and instant stop; transcription uses a proper Node buffer to fix corrupt WebM / EBML header errors when sending audio to Whisper.
- **Insert text** — Main process waits for the voice overlay to close and uses a short delay so focus returns to the target app before pasting.

### Onboarding and dashboard
- **Mic step** — New onboarding step "Pick your microphone": microphone dropdown, "Press keybind and speak" hint, read-only test field that shows your transcript, and Continue; selected mic is saved in settings.
- **Dashboard layout** — Notes and Style removed from navigation. A single "Now on your local machine" feature card sits under the welcome and stats, above Recent transcripts, with friendlier copy.
- **Voice training** — New onboarding-style Voice Training screen (Settings → Voice). "Open voice training" is temporarily disabled with "Coming soon."

### Settings and Whisper
- **Whisper language** — New setting for transcription language (auto or English); used when calling Whisper. Settings → Voice has a language dropdown.
- **Composer keybind** — Composer shortcut is configurable in Settings (e.g. Alt+Super) alongside voice and rephrase shortcuts.

### Composer
- **Composer widget** — Shows buffer segments, uses Ollama URL and model from settings, and checks that Ollama is running before generating. Clearer error messages when Ollama is unavailable or generation fails.

### Installer and download
- **Download modal** — When the download is done, the modal now shows only a **Continue** button (the "Download with ticket" / green "Downloaded" tick block was removed).

### Windows / Electron
- **PowerShell** — Fixed "spawn powershell ENOENT" on Windows by resolving the PowerShell path (e.g. `System32\WindowsPowerShell\v1.0\powershell.exe`) and using it for push-to-talk, key monitoring, and other scripts so they work in all environments.

---

## v1.3.0 (2026-02-22)

- **Mac now available** — Rephrase is now available for macOS (Intel and Apple Silicon). On Windows, a pop-up announcement appears with the Apple logo and a link to download the Mac build.
- **Banner appearance** — The “Mac Now Available” notice is now shown as a modal pop-up (with backdrop) instead of an inline banner, for a clearer, more focused announcement.
- Update check fix so the app no longer shows “Update available” when already on the latest version.

## v1.2.0 (2026-02-22)

- Mac build fix (512x512 icon)
- Release workflow (Windows + Mac)
- Rephrase-Setup-mac naming

## v1.0.0 (2026-02-22)

- Initial release
- Groq AI rephrase widget
- Voice dictation and composer
- Electron auto-updater
- Mac version added (Intel & Apple Silicon)
