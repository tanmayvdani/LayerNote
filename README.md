# LayerNote

LayerNote adds timestamped, note-style annotations to YouTube videos. Notes pop up as floating toasts exactly when they matter in the video. Make your own notes, share them with a link, or browse what other people have written on the same video.

![LayerNote running on YouTube](screenshots/01-sidebar.png)

---

## Features

- **Live toast overlays** — notes appear on screen at the exact timestamp you wrote them
- **Your own notes** — type a note, hit enter, done
- **Share a link** — anyone with the link sees your notes on the video
- **Browse public notes** — see what other people have annotated on the same video, with 👍 / 👎 reactions
- **Multiple shared layers** — load notes from multiple friends, all shown at once
- **Light & dark mode** — picks the right icons for your YouTube theme
- **Works in fullscreen** — the add-note popup follows you even when the sidebar is gone
- **Cloud sync** — your notes are backed up to a server, available on any device

![My Notes tab](screenshots/02-my-notes.png)
![Shared tab](screenshots/03-shared.png)
![Browse tab](screenshots/04-browse.png)

---

## Install

1. Download the latest `layernote.zip` from the [Releases page](https://github.com/tanmayvdani/layernote/releases)
2. Extract it somewhere you can find it again
3. Open `chrome://extensions` in Chrome (or `edge://extensions` in Edge)
4. Turn on **Developer mode** (top right toggle)
5. Click **Load unpacked** and pick the extracted folder
6. Open any YouTube video and you're set

![Settings panel](screenshots/05-settings.png)

---

## Use

**Write a note:** click the **+** button on the player, type your note, press Enter.

**Share your notes:** click the **share** icon in the sidebar header. The link looks like `youtube.com/watch?v=…&layer=…`.

**Browse what others wrote:** open the **Browse** tab, find a collection you like, hit **Add to Shared** — it joins the active notes for that video.

**Settings:** click the **⚙** icon to change your username, toast duration, or whether new notes start as public.

![Floating add-note overlay in fullscreen](screenshots/06-overlay.png)

---

## Build from source

For developers:

```bash
npm install
npm run build
```

The compiled extension lands in `dist/`. Load that folder as an unpacked extension.

To package for distribution:

```bash
npx bestzip layernote.zip dist/*
```

---

## Project layout

```
src/
├── background/        service worker (sync, retries)
├── content/           injected into YouTube
│   ├── layer-state.ts zustand store
│   ├── timestamp-engine.ts  toast timing
│   ├── youtube.ts     entry point
│   └── ui/            sidebar, tabs, form, overlay
└── storage/           local cache + Supabase client
```

## License

MIT
