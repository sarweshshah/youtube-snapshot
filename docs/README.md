# Youtube Snapshot

Capture and Save YouTube Moments with Ease

This simple and lightweight extension adds a "Snapshot" button to the YouTube video player, allowing you to quickly capture and save any frame of a video as a PNG image or record a GIF of your favorite moments. Perfect for grabbing those meme-worthy moments, saving reference images, or creating thumbnails for your own videos.

## Key Features

- **One-Click Snapshots**: Easily capture screenshots with a single click.
- **GIF Recording**: Record short GIFs of your favorite moments with a simple keyboard shortcut.
- **Save to Your Computer**: Download those snazzy screenshots as PNGs or JPGs.
- **Copy to Clipboard**: Paste those pics anywhere you want!
- **Keyboard Shortcuts**:
  - Set up your own shortcut for lightning-fast captures
  - Press 'g' to start/stop recording a GIF
- **Smart File Names**: No more guessing games! Your screenshots and GIFs will have the video title and timestamp.
- **Simple Setup:** Get snapping in seconds!
- **Support for Embedded videos**: Works for both Youtube website and embedded videos

## Repository Structure

```mermaid
flowchart TD
  Manifest["manifest.json<br/>MV3 entrypoint"]
  BG["js/background.js<br/>service worker"]
  Content["js/content.js<br/>YouTube capture UI + shortcuts"]
  Recorder["js/libs/gif-recorder.js<br/>frame capture + messaging"]
  OffscreenHTML["html/offscreen.html<br/>offscreen shell"]
  Offscreen["js/offscreen.js<br/>GIF encoder coordinator"]
  GifJS["js/libs/gif.js<br/>encoder library"]
  GifWorker["js/libs/gif.worker.js<br/>worker runtime"]
  PopupHTML["html/popup.html<br/>settings UI"]
  PopupJS["js/popup.js<br/>popup logic"]
  PopupCSS["css/popup.css<br/>popup styles"]
  Assets["icons/ + audio/<br/>extension assets"]
  Docs["docs/README.md<br/>documentation"]
  Storage[("chrome.storage.sync")]

  Manifest --> BG
  Manifest --> Content
  Manifest --> PopupHTML
  Manifest --> OffscreenHTML
  Content --> Recorder
  OffscreenHTML --> Offscreen
  OffscreenHTML --> GifJS
  Offscreen --> GifWorker
  PopupHTML --> PopupJS
  PopupHTML --> PopupCSS
  Content -. uses .-> Assets
  PopupJS -. reads/writes .-> Storage
  Content -. reads .-> Storage
  Recorder -. reads .-> Storage
  Docs -. describes .-> Manifest
```

| Script | Role |
|------|------|
| **background.js** | Creates the offscreen document when needed; relays messages between content script (YouTube tab) and offscreen document. |
| **content.js** | Runs in every YouTube (and embed) frame: injects snapshot button, handles S key / G key, takes PNG/JPG snapshots, starts/stops GIF recording via `GIFRecorder`. |
| **gif-recorder.js** | Captures video frames in a loop, encodes frame data, requests offscreen doc from background, sends frames then “render” command; receives GIF chunks and progress, triggers download and UI events. |
| **offscreen.js** | Runs in extension offscreen document: receives frames and “gif-render”, uses gif.js (and workers) to encode GIF, sends progress and data-url chunks back via `chrome.runtime.sendMessage` (with `tabId`); background relays to the tab. |
| **popup.js** | Reads/writes `chrome.storage.sync` for snapshot options (file/clipboard, format, quality, sound) and GIF options (framerate, max duration, max width); no direct messaging with content or offscreen. |

## Script Flow

### Snapshot (PNG/JPG)

```mermaid
flowchart LR
  User["User click / shortcut"] --> ContentSnap["content.js"]
  ContentSnap --> Checks["Ad + DRM checks"]
  Checks --> Canvas["Draw current frame to canvas"]
  Canvas --> Settings["Read snapshot settings from chrome.storage.sync"]
  Settings --> Download["Download PNG/JPG file"]
  Settings --> Clipboard["Copy image to clipboard"]
  Canvas --> Feedback["Flash overlay + optional sound"]
```

Snapshot capture stays entirely in `content.js`; it does not go through `background.js` or the offscreen document.

### GIF recording and encoding

```mermaid
sequenceDiagram
  participant User
  participant Content as content.js
  participant Recorder as gif-recorder.js
  participant BG as background.js
  participant Offscreen as offscreen.js
  participant gifjs as gif.js + workers

  User->>Content: Press G (start)
  Content->>Recorder: startRecording(video)
  Recorder->>Recorder: captureFrame loop (canvas → ImageData)
  User->>Content: Press G again (stop)
  Content->>Recorder: stopRecording()
  Recorder->>BG: create-offscreen
  BG->>Offscreen: create offscreen doc (if needed)
  BG-->>Recorder: { ready, tabId }

  loop For each frame
    Recorder->>BG: gif-frame (target: offscreen)
    BG->>Offscreen: gif-frame
    Offscreen->>Offscreen: decodeFrame, store
    Offscreen-->>BG: ok
  end

  Recorder->>BG: gif-render (target: offscreen, tabId)
  BG->>Offscreen: gif-render
  Offscreen->>gifjs: encode GIF
  gifjs-->>Offscreen: progress / finished (blob)
  Offscreen->>Offscreen: blob → data URL chunks
  Offscreen->>BG: gif-progress / gif-chunk (tabId)
  BG->>Content: gif-progress / gif-chunk (relay to tabId)
  Content->>Recorder: onMessage (gif-chunk / gif-progress)
  Recorder->>Recorder: handleChunk → assemble URL → download
  Recorder->>Content: dispatch gifFinished
  Content->>User: "GIF saved" notification
```

- **Popup** reads and writes **chrome.storage** only; content and offscreen read the same keys (e.g. `gifFramerate`, `gifMaxDuration`, `fileFormat`) when capturing or encoding.

## Privacy Policy

This Privacy Policy describes how the YouTube Snapshot Chrome extension ("the Extension") handles your information.

**Information We Collect**\
The Extension does **not** collect, store, or transmit any personal information or browsing data. It operates solely within your browser and interacts only with the active YouTube video page.

**Permissions**\
The Extension requests the following permissions:

- **Storage**: This permission allows the extension to store user preferences for keyboard shortcuts and how snapshots are saved (to file or clipboard).
- **WebNavigation**: Since embedded iframes do not trigger the usual page load events that a standard content script relies on, webNavigation is necessary to identify and access these embedded videos dynamically.
- **Scripting**: This is essential for interacting with the YouTube video controls inside the iframe and injecting the snapshot button. Without scripting, the extension would be unable to dynamically inject content.js into iframes.
- **Host permissions**: This permission allows the extension to interact with the YouTube video player from any website and enable the snapshot functionality.

**How We Use Information**\
The Extension uses the granted permissions solely to enable its core functionality: capturing a snapshot of the current YouTube video frame and saving it as an image file on your local device, or recording a GIF of the video. No data is transmitted or stored outside of your browser.

**Third-Party Sharing**\
The Extension does not share any information with third-party services or websites.

**Data Security**\
Since the Extension does not collect or store any user data, there is no user data to secure. However, the Extension's code is regularly reviewed to ensure it functions as intended and does not pose any security risks.

**Changes to this Privacy Policy**\
This Privacy Policy may be updated from time to time. Any updates will be posted on the Extension's page on the Chrome Web Store.

**Contact Us**\
If you have any questions or concerns about this Privacy Policy, please contact us through the Chrome Web Store.

**Effective Date:** October 12, 2024

[![Download YouTube snapshot Chrome Extension](banner.png)](https://chromewebstore.google.com/detail/youtube-snapshot/cpecoochkebbnkkonbjikioehccfclfa)

## License

All rights reserved. Unauthorized copying, modification, distribution, or use of this project, via any medium, is strictly prohibited without prior written permission from the author.
