# Rephrase

Always-on-top Groq AI rephrase widget for Windows. Voice to text, anywhere.

## What it does

Rephrase is a desktop app that lets you:

- **Voice dictation** — Hold your hotkey (default: Ctrl + Win) to record. Your speech is transcribed and saved as transcripts.
- **Read aloud** — Click **Read** on any transcript to hear it spoken using your system’s voice.
- **Composer** — Queue thoughts while recording and generate drafts or emails with AI.
- **Rephrase widget** — Rewrite selected text in any app using Groq AI.
- **Start with PC** — Optional setting to launch Rephrase when you sign in to Windows.

The app runs in the system tray. Click the tray icon to open the dashboard.

## Requirements

- Windows 10/11 (64-bit)
- [Groq API key](https://console.groq.com/keys) (free)
- Microphone (for voice features)

## Setup

1. Download and install Rephrase from the [Releases](https://github.com/HarveyDodieReid/Rephrase/releases) page.
2. Open Rephrase from the tray icon.
3. Go to **Settings → General** and add your Groq API key.
4. (Optional) Customize hotkeys in **Settings → Voice**.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl + Win | Push to talk — hold to record voice |
| Alt + Win | Composer — queue thoughts for drafts |
| Ctrl + Shift + Space | Rephrase widget — rewrite selected text |

All shortcuts can be changed in Settings. Single keys (e.g. F5, Space) are supported.

## Development

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

Outputs the installer to `dist-electron/Rephrase Setup X.X.X.exe`.

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
