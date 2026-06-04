# Tsjaad Olifant — macOS Port

This is a cross-platform macOS port of the original Windows WPF desktop pet
([TsjaadHuisdier](../)). It uses Electron so it can run on macOS, Linux, and
Windows from a single codebase.

## What is this?

A small pixelated elephant that walks around your desktop, talks nonsense,
sometimes wants to open a random website, and lets you pet it.

The original WPF version was Windows-only (.NET Framework 4.8). This port
keeps the same vibe but makes it work natively on macOS — including
transparent borderless window, always-on-top across all Spaces, and
click-through so you can keep using the apps behind it.

## Features

- True transparent window (not a colored background)
- Walks around the desktop on its own
- Speaks random funny lines (and sometimes asks to open a website)
- Goes to sleep and wakes up
- You can pet it (once per second)
- Pixelated retro dialog boxes
- Click-through: doesn't block apps behind it
- Shows on all macOS Spaces and above fullscreen apps without disrupting them
- Dock icon + Cmd+Q to quit

## Running it

### Option 1: Use the prebuilt `.app`

If you have a built `TsjaadOlifant.app`, just double-click it. If macOS
blocks it, right-click → Open the first time.

You can also use the included launcher:

```bash
./start_tsjaad.command
```

### Option 2: Build from source

You need Node.js 18+ and npm.

**One-shot self-builder** (handles install, icon generation, build, and
zips the result as a ready-to-run bundle):

```bash
cd mac
node tsjaadbuilder.js --mac --run
```

The final ready-to-run zip is `mac/TsjaadOlifant-mac-arm64.zip` — extract it
and double-click `TsjaadOlifant.command` to launch (it strips Gatekeeper
and signs the app for you).

**Manual build** (if you want more control):

```bash
cd mac
npm install
./node_modules/.bin/electron-builder --mac
```

The built app will be in `mac/dist/mac-arm64/TsjaadOlifant.app`
(or `mac/dist/mac/` on Intel).

## File layout

- `mac/main.js` — Electron main process (window, click-through, IPC)
- `mac/index.html` — The elephant UI + dialog
- `mac/Tsjaad.png`, `mac/Aai.png`, `mac/Slaap.png` — Elephant sprites
- `mac/Praat.wav` — Talk sound
- `start_tsjaad.command` — Shell launcher

## Differences from the WPF original

- Built on Electron (Chromium + Node.js) instead of WPF
- Cross-platform (runs on macOS, Linux, Windows)
- Pet sound and random talk sounds use the same WAV file but with random
  pitch/speed for variety
- Internet links are opened with `window.open` instead of `Process.Start`
