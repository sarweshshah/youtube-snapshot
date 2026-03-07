# YouTube Snapshot

Capture YouTube frames as images and short moments as GIFs.

This extension adds a Snapshot button to YouTube players (including embeds) so you can save the current frame or record a quick GIF.

## Features

- One-click snapshot capture
- GIF recording with keyboard shortcut (`g`)
- Save as PNG/JPG and optionally copy to clipboard
- Configurable format, quality, sound, framerate, duration, and width
- Timestamped filenames using video title + time

## Repository Structure

![Repository structure](repo%20structure.png)

| Script | Role |
|------|------|
| `background.js` | Creates offscreen document when needed and relays messages between tab and offscreen contexts. |
| `content.js` | Injects UI in YouTube pages/embeds, handles shortcuts, captures PNG/JPG snapshots, starts/stops GIF recording. |
| `gif-recorder.js` | Captures frames, sends them for encoding, receives chunks/progress, and finalizes GIF download. |
| `offscreen.js` | Encodes GIF frames via `gif.js` workers and returns progress/chunks to the active tab. |
| `popup.js` | Reads/writes `chrome.storage.sync` settings for snapshots and GIF behavior. |

## Script Flow

### Snapshot (PNG/JPG)

![Snapshot script flow](snapshot%20script%20flow.png)

Snapshot capture runs entirely in `content.js` and does not use offscreen encoding.

### GIF recording and encoding

![GIF recording sequence](sequence%20diagram.png)

`popup.js` only updates settings in `chrome.storage.sync`; capture and encoding scripts read those values at runtime.

## Privacy Policy

The extension does not collect, store, or transmit personal data. All capture and GIF processing happens locally in your browser.

### Permissions used

- `storage`: save user preferences
- `webNavigation`: detect embedded YouTube contexts
- `scripting`: inject capture UI/logic in player pages
- Host permissions: access YouTube players on supported pages

### Data handling

- No third-party sharing
- No external upload of captures
- Policy updates are posted on the Chrome Web Store page

**Effective date:** October 12, 2024

[![Download YouTube Snapshot extension](banner.png)](https://chromewebstore.google.com/detail/youtube-snapshot/cpecoochkebbnkkonbjikioehccfclfa)

## License

All rights reserved. Unauthorized copying, modification, distribution, or use is prohibited without prior written permission from the author.
