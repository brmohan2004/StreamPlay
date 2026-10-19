# StreamPlay (NetMirror + Spotify Unified)

A high-performance, cross-platform media entertainment hub combining **NetMirror** (movies & web series with OTT categorization) and **Spotify** (unlimited 320kbps audio streaming) into a single, unified player.

Built with **Tauri 2.0 (Rust backend) + React 19 + TypeScript + Vite**.

---

## ✨ Features

- **100% Real Live Streams (No Mock Data)**:
  - **Movies & Web Series**: Powered by the live **Cinemeta API** (`v3-cinemeta.strem.io`) with multi-provider fallback embeds (`2embed.cc`, `embedmaster.link`, `cinesrc.st`).
  - **Spotify High-Bitrate Music**: Real song search, album art, and direct **320kbps Ultra-HD audio** playback powered by DES-ECB CDN stream decryption with `crypto-js`.
  - **Zero Cost**: All APIs and stream resolvers are public and free.
- **JioHotstar-Inspired UI**:
  - Obsidian dark gradient background with neon cyan, Hotstar blue, and Spotify green accents.
  - Billboard Hero Banner with dynamic blockbusters and "Watch Now Free" buttons.
  - Smooth card hover zoom and elevation with `framer-motion`.
- **OTT Hub Filtering**:
  - Filter by your favorite networks: **Netflix, JioHotstar, Amazon Prime Video, Apple TV+, Sony LIV, and Zee5**.
- **Persistent Mini-Player**:
  - Spotify-style floating bar at the bottom with seek slider, volume control, and playback controls.
  - Keep listening to music while browsing movies and web series across tabs.
- **Multi-Screen Responsive**:
  - Seamless layout across Desktop, Tablet, Mobile (with touch slide-out drawer), and 4K/TV screens.

---

## 🚀 Getting Started

### 1. Web / Browser Mode
```bash
npm install
npm run dev
```
Open [http://localhost:1420](http://localhost:1420) or preview production with:
```bash
npm run build
npm run preview
```

### 2. Desktop Mode (Tauri 2.0 Native)
Prerequisites:
- [Rust](https://rustup.rs/)
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Desktop development with C++)

Run in desktop window:
```bash
npm run tauri dev
```
Build standalone desktop installer:
```bash
npm run tauri build
```
