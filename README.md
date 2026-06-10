# LayerNote

A Chrome extension that overlays timestamped annotations on YouTube videos. Annotations sync with the player so they appear as floating toasts at the right moment. Share links with a `&layer=` parameter let anyone view a curated set of notes on any video.

## Features

- **Timestamped toasts** — annotations pop up as the video plays, synced to the second
- **Create & edit** — build your own annotation layers directly on YouTube
- **Share via link** — append `&layer=<slug>` to any YouTube URL to share a layer
- **Viewer mode** — shared layers are read-only; click any note to jump to that moment
- **Sync across devices** — data syncs to Supabase so your layers are available anywhere

## Quick start

### Prerequisites
- Node.js 18+
- npm

### Install & build

```bash
npm install
npm run build
```

### Load the extension (Chrome)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder

### Test a shared layer

To test the extension with existing annotations, visit:

```
https://www.youtube.com/watch?v=zxKPjD8urG4&layer=rome-trivia
```

## Project structure

```
src/
├── background/         # Service worker — handles sync, alarms
├── content/
│   ├── ui/             # Sidebar, annotation list, annotation form
│   ├── youtube.ts      # Entry — injects into YouTube pages
│   ├── layer-state.ts  # Zustand store for the active layer
│   └── timestamp-engine.ts  # Toast sync with video player
└── storage/
    ├── local.ts        # chrome.storage.local wrapper + Supabase sync
    ├── supabase.ts     # Supabase client init
    └── types.ts        # Shared types
build.mjs               # esbuild config
manifest.json           # Chrome extension manifest v3
```

## Tech stack

- **Chrome Extension MV3**
- **TypeScript**
- **Zustand** (vanilla) for state management
- **Supabase** for cloud sync
- **esbuild** for bundling

## Building for distribution

```bash
npm run build
```

The built extension lives in `dist/`. Zip this folder to distribute:

```bash
npx bestzip layernote.zip dist/*
```

---

Source code: [github.com/tanmayvdani/LayerNote](https://github.com/tanmayvdani/LayerNote)
