# Rephrase

Always-on-top Groq AI rephrase widget for Windows and macOS. Voice to text, anywhere.

## What it does

Rephrase is a desktop app that lets you:

- **Voice dictation** — Windows: Hold Ctrl + Win to record. Mac: Press Cmd + Shift + Space (toggle). Your speech is transcribed and saved as transcripts.
- **Read aloud** — Click **Read** on any transcript to hear it spoken using your system’s voice.
- **Composer** — Queue thoughts while recording and generate drafts or emails with AI.
- **Rephrase widget** — Rewrite selected text in any app using Groq AI.
- **Start at login** — Optional setting to launch Rephrase when you sign in.

The app runs in the system tray. Click the tray icon to open the dashboard.

## Requirements

- **Windows**: Windows 10/11 (64-bit)
- **Mac**: macOS 10.15+ (Intel or Apple Silicon)
- [Groq API key](https://console.groq.com/keys) (free)
- Microphone (for voice features)

## Setup

1. Download and install Rephrase from the [Releases](https://github.com/HarveyDodieReid/Rephrase/releases) page.
2. Open Rephrase from the tray icon.
3. Go to **Settings → General** and add your Groq API key.
4. (Optional) Customize hotkeys in **Settings → Voice**.

## Keyboard shortcuts

| Shortcut | Action | Platform |
|----------|--------|----------|
| Ctrl + Win | Push to talk — hold to record voice | Windows |
| Cmd + Shift + Space | Voice — press to start, press again to stop | Mac |
| Alt + Win | Composer — hold to queue thoughts | Windows |
| Cmd + Option | Composer — toggle mode | Mac |
| Ctrl/Cmd + Shift + Space | Rephrase widget — rewrite selected text | Both |

All shortcuts can be changed in Settings.

## Development

```bash
npm install
npm run dev
```

### Build

**Windows:**
```bash
npm run build
```
Outputs the installer to `dist-electron/Rephrase Setup X.X.X.exe`.

**Mac (Intel & Apple Silicon):**
```bash
npm run build:mac
```
Outputs `.dmg` and `.zip` to `dist-electron/`.

### Create release

```powershell
$env:GITHUB_TOKEN = "your_token"
.\create-release.ps1
```

## Tech stack

- **Electron** — Desktop app
- **React** + **Vite** — UI
- **Groq** — AI (LLM + Whisper transcription)
- **electron-updater** — Auto-updates

## License

Copyright © 2026
