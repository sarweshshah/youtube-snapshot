# YouTube Snapshot Architecture

This document covers repository structure, script responsibilities, and runtime flow for snapshot and GIF capture.

## Repository Structure

![Repository structure](repo%20structure.png)

| Script | Role |
|------|------|
| `background.js` | Creates the offscreen document when needed and relays runtime messages between tab and offscreen contexts. |
| `content.js` | Runs in YouTube pages/embeds, injects snapshot UI, handles shortcuts, captures PNG/JPG frames, and starts/stops GIF recording. |
| `gif-recorder.js` | Captures frames in a loop, sends frame data for encoding, receives progress/chunks, and finalizes GIF download. |
| `offscreen.js` | Receives frames, coordinates GIF encoding through `gif.js` workers, and streams encoded chunks/progress back to the active tab. |
| `popup.js` | Reads/writes `chrome.storage.sync` settings for snapshot and GIF preferences. |

## Script Flow

### Snapshot (PNG/JPG)

![Snapshot script flow](snapshot%20script%20flow.png)

Snapshot capture remains in `content.js`; it does not require offscreen encoding.

### GIF Recording and Encoding

![GIF recording sequence](sequence%20diagram.png)

`popup.js` manages settings in `chrome.storage.sync`; capture and encoding logic read those values at runtime.
