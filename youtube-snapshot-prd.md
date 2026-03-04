# PRD: YouTube Snapshot — Screenshot & GIF Capture Extension

**Version:** 1.0 Draft  
**Author:** Sarwesh Shah  
**Last Updated:** March 4, 2026  
**Status:** Draft — Pending Review

---

## 1. Overview

YouTube Snapshot is a Chrome extension that lets users capture high-quality screenshots and animated GIFs directly from YouTube video players — both on youtube.com and embedded players across the web. It eliminates the need for external screen-capture tools by injecting capture controls directly into the player UI.

### 1.1 Problem Statement

Capturing a specific frame or short clip from a YouTube video today requires one of the following:

- **OS-level screenshot tools** — lose video metadata, require manual cropping, no GIF support.
- **Dedicated screen recorders** (OBS, Loom, etc.) — heavyweight, overkill for a 3-second GIF.
- **Online GIF makers** — require uploading a URL, waiting for server-side processing, watermarks on free tiers.
- **Browser DevTools / Canvas hacks** — technical barrier too high for most users.

None of these approaches are fast, contextual, or integrated into the viewing experience. YouTube Snapshot solves this by making capture a single-click or single-keypress action embedded in the player itself.

### 1.2 Product Vision

The fastest way to go from "that's a great moment" to a shareable image or GIF — without ever leaving the tab.

---

## 2. Target Users & Personas

### 2.1 Primary Personas

| Persona | Description | Key Motivation |
|---|---|---|
| **Meme Creator** | Makes and shares memes on social platforms. Captures reaction faces, funny frames, short loops. | Speed. Wants frame → clipboard → paste into editor in under 2 seconds. |
| **Content Creator / Educator** | YouTubers, bloggers, teachers who reference other videos in their own content. | Accuracy. Needs exact frame at exact timestamp with proper attribution (filename includes title + time). |
| **Casual User** | General viewer who occasionally wants to save a funny or interesting moment. | Simplicity. Shouldn't need to read docs or configure anything. |

### 2.2 Secondary Personas

| Persona | Description |
|---|---|
| **UX/UI Designer** | Captures UI patterns, motion references, or interaction examples from video content. |
| **Researcher / Journalist** | Documents specific claims or visuals from video sources with timestamp provenance. |

---

## 3. User Stories

### 3.1 Snapshot Capture

| ID | Story | Priority |
|---|---|---|
| US-01 | As a user, I want to click a button in the YouTube player to capture the current frame as an image, so I can save it without external tools. | P0 |
| US-02 | As a user, I want to press `S` on my keyboard to capture a snapshot, so I can grab frames without moving my mouse. | P0 |
| US-03 | As a user, I want the snapshot to be automatically named with the video title and timestamp, so I can identify it later. | P0 |
| US-04 | As a user, I want to hear a camera shutter sound when a snapshot is taken, so I get confirmation the capture happened. | P1 |
| US-05 | As a user, I want to choose between PNG and JPG output format, so I can control file size vs. quality. | P1 |
| US-06 | As a user, I want the snapshot copied to my clipboard automatically, so I can paste it immediately into a chat or editor. | P0 |
| US-07 | As a user, I want the snapshot saved to my local file system, so I have a permanent copy. | P0 |
| US-08 | As a user, I want to configure whether capture goes to clipboard, file, or both, so it matches my workflow. | P1 |

### 3.2 GIF Capture

| ID | Story | Priority |
|---|---|---|
| US-09 | As a user, I want to press `G` to start recording a GIF and press `G` again to stop, so I can capture a specific moment as an animation. | P0 |
| US-10 | As a user, I want to see a visual indicator (e.g., red dot / timer) while GIF recording is active, so I know it's recording. | P0 |
| US-11 | As a user, I want the GIF encoded in a background process (offscreen document / web worker) to avoid freezing the player or tab. | P0 |
| US-12 | As a user, I want large GIFs to be handled gracefully without crashing the extension, so I can capture longer moments. | P0 |
| US-13 | As a user, I want the GIF automatically named with the video title and start timestamp, so I can identify it later. | P0 |
| US-14 | As a user, I want to preview the GIF before saving, so I can re-record if the timing was off. | P2 |

### 3.3 Settings & Configuration

| ID | Story | Priority |
|---|---|---|
| US-15 | As a user, I want to customize keyboard shortcuts for snapshot and GIF, so they don't conflict with other extensions. | P2 |
| US-16 | As a user, I want to set default image format (PNG/JPG) and, when JPG is selected, configure the compression quality level (e.g., 10%–100%). | P1 |
| US-17 | As a user, I want to set default save destination (clipboard / file / both). | P1 |
| US-18 | As a user, I want to toggle the camera shutter sound on/off. | P2 |
| US-19 | As a user, I want to configure GIF framerate (e.g., 10, 15, 24 fps) and max resolution to balance quality vs. file size. | P2 |

---

## 4. Functional Requirements

### 4.1 Player Detection & Button Injection

| ID | Requirement | Details |
|---|---|---|
| FR-01 | Detect YouTube video players on any page. | Must work on `youtube.com`, `youtube.com/embed/*`, and `<iframe>` embeds on third-party sites. |
| FR-02 | Inject a "Snapshot" button into the player's right-side control bar. | Button must match YouTube's existing control styling (icon size, hover behavior, tooltip). Must not break existing controls. |
| FR-03 | Handle dynamic player insertion. | Use `MutationObserver` to detect players added after initial page load (e.g., SPA navigation on youtube.com, lazy-loaded embeds). |
| FR-04 | Handle multiple players on a single page. | Each player instance gets its own button. Keyboard shortcuts apply to the player currently in focus or most recently interacted with. |
| FR-05 | Support all YouTube player modes. | Default, Theater, Fullscreen, Mini-player, Picture-in-Picture. Button and shortcuts must work in all modes. |

### 4.2 Snapshot Capture Engine

| ID | Requirement | Details |
|---|---|---|
| FR-06 | Capture the current video frame from the `<video>` element. | Use `canvas.drawImage(videoElement, ...)` to extract the frame at the video's native resolution. |
| FR-07 | Support PNG and JPG output. | PNG is lossless (default). JPG supports configurable quality (0.1–1.0, default 0.92). |
| FR-08 | Auto-generate filename. | Format: `{Video Title} [{HH.MM.SS}].{ext}`. Sanitize title (remove filesystem-unsafe characters: `/ \ : * ? " < > \|`). Truncate title to 100 characters if needed. |
| FR-09 | Save to local filesystem. | Use the `chrome.downloads` API to trigger a browser download. Respect the user's default download directory. |
| FR-10 | Copy to system clipboard. | Use `ClipboardItem` + `navigator.clipboard.write()` for PNG. For JPG, convert to PNG blob for clipboard (clipboard API only supports PNG). |
| FR-11 | Play camera shutter sound on capture. | Bundle a short `.mp3` shutter sound (~50KB). Play via `Audio` API. Mutable via settings. |
| FR-12 | Show visual feedback on capture. | Brief white flash overlay on the video player (CSS animation, ~150ms) to confirm the capture. |

### 4.3 GIF Capture Engine

| ID | Requirement | Details |
|---|---|---|
| FR-13 | Capture video frames at a configurable interval during recording. | Default: 10 fps. Capture frames by repeatedly calling `canvas.drawImage()` at the configured interval using `requestAnimationFrame` or `setInterval`. |
| FR-14 | Offload GIF encoding to an Offscreen Document. | YouTube's CSP blocks `eval()` and inline workers needed by most GIF encoders (e.g., gif.js). Use Chrome's Offscreen Document API (`chrome.offscreen.createDocument`) to run encoding in a CSP-free context. |
| FR-15 | Transfer frame data from content script → service worker → offscreen document. | Content script captures frames as `ImageData` or base64-encoded data URLs. Sends to service worker via `chrome.runtime.sendMessage`. Service worker relays to offscreen document for encoding. |
| FR-16 | Chunk the final GIF blob for IPC transfer. | Chrome's message-passing limit is ~64MB. Chunk the encoded GIF into 10MB slices. Reassemble in the service worker before triggering download via `chrome.downloads`. |
| FR-17 | Show recording indicator on the player. | Red pulsing dot + elapsed time counter overlaid on the video player during GIF recording. |
| FR-18 | Auto-stop safety limit. | Default max recording duration: 30 seconds. Configurable up to 60 seconds. Prevents runaway memory usage. |
| FR-19 | Handle video pause/seek during recording. | If the user pauses the video, pause frame capture (don't capture duplicate frames). If the user seeks, continue capturing from the new position (the GIF will reflect what the user saw). |
| FR-20 | GIF filename convention. | Format: `{Video Title} [{Start Timestamp}].gif`. |

### 4.4 Keyboard Shortcuts

| ID | Requirement | Details |
|---|---|---|
| FR-21 | Default snapshot shortcut: `S`. | Only active when a YouTube player is present and the user is not focused on an input/textarea element. |
| FR-22 | Default GIF shortcut: `G` (toggle start/stop). | Same focus rules as snapshot. |
| FR-23 | Shortcuts must be configurable via `chrome.commands` or the extension's settings page. | Use `chrome.commands` API for global shortcuts. Fall back to content-script `keydown` listeners for per-page shortcuts. |
| FR-24 | No conflicts with YouTube's native shortcuts. | YouTube uses `C` for captions, `M` for mute, `F` for fullscreen, etc. Neither `S` nor `G` are assigned natively. Safe to use without modifiers. |

### 4.5 Settings Page (Options UI)

| ID | Requirement | Details |
|---|---|---|
| FR-25 | Provide a dedicated options page accessible via the extension popup or Chrome's extension settings. | Clean, minimal UI. Group settings into logical sections. |
| FR-26 | Persist all settings via `chrome.storage.sync`. | Settings sync across the user's Chrome instances. |

**Settings inventory:**

**Snapshot**

| Setting | Type | Default | Options |
|---|---|---|---|
| Image format | Select | PNG | PNG, JPG |
| JPG quality | Slider | 92% | 10%–100% (only visible when JPG is selected) |
| Save destination | Multi-select | Both | Clipboard, File, Both |

**GIF**

| Setting | Type | Default | Options |
|---|---|---|---|
| GIF framerate | Select | 10 fps | 5, 10, 15, 24 fps |
| GIF max duration | Slider | 30s | 5s–60s |
| GIF max width | Select | Source | 480px, 720px, Source |

**Keyboard Shortcuts**

| Setting | Type | Default | Options |
|---|---|---|---|
| Snapshot shortcut | Key input | S | Any single key |
| GIF shortcut | Key input | G | Any single key |

**General**

| Setting | Type | Default | Options |
|---|---|---|---|
| Shutter sound | Toggle | On | On / Off |

---

## 5. Technical Architecture

### 5.1 Extension Components (Manifest V3)

```
youtube-snapshot/
├── manifest.json              # MV3 manifest
├── service-worker.js          # Background service worker
├── content-script.js          # Injected into pages with YouTube players
├── offscreen.html             # Offscreen document for GIF encoding
├── offscreen.js               # GIF encoder logic (gif.js or similar)
├── popup.html / popup.js      # Extension popup (quick settings + status)
├── options.html / options.js  # Full settings page
├── assets/
│   ├── shutter.mp3            # Camera sound effect
│   ├── icon-snapshot.svg      # Player button icon
│   └── icons/                 # Extension icons (16, 48, 128)
└── lib/
    └── gif.encoder.js         # GIF encoding library
```

### 5.2 Manifest V3 Permissions

| Permission | Reason |
|---|---|
| `activeTab` | Access to the current tab's content for frame capture. |
| `downloads` | Save files to the user's filesystem. |
| `storage` | Persist user settings across sessions. |
| `clipboardWrite` | Copy snapshots to clipboard. |
| `offscreen` | Create offscreen document for GIF encoding. |

**Content script matches:**
```json
"content_scripts": [{
  "matches": [
    "*://*.youtube.com/*",
    "*://*.youtube-nocookie.com/*"
  ],
  "js": ["content-script.js"],
  "all_frames": true
}]
```

> **Note on embedded players:** For YouTube embeds on third-party sites, the content script must run inside the embed iframe. This requires either `all_frames: true` with a broad match pattern or dynamic injection via `chrome.scripting.executeScript` when the user interacts with the extension. See Open Questions §9.2.

### 5.3 Data Flow — Snapshot

```
User clicks button / presses S
        │
        ▼
Content Script: canvas.drawImage(video) → blob
        │
        ├──► Clipboard: navigator.clipboard.write(ClipboardItem)
        │
        └──► File: chrome.runtime.sendMessage({ type: 'download', blob })
                    │
                    ▼
             Service Worker: chrome.downloads.download({ url: blobURL, filename })
```

### 5.4 Data Flow — GIF

```
User presses G (start)
        │
        ▼
Content Script: setInterval → canvas.drawImage(video) → ImageData frames[]
        │
User presses G (stop)
        │
        ▼
Content Script: sends frames[] to Service Worker via chunked messages
        │
        ▼
Service Worker: creates Offscreen Document (if not exists)
        │
        ▼
Service Worker → Offscreen Document: relays frame data
        │
        ▼
Offscreen Document: encodes frames → GIF blob
        │
        ▼
Offscreen Document → Service Worker: returns GIF blob in ≤10MB chunks
        │
        ▼
Service Worker: reassembles chunks → chrome.downloads.download()
```

### 5.5 GIF Encoding Strategy

**Why offscreen?** YouTube's CSP headers include `script-src` directives that block `eval()`, `new Function()`, and blob-URL workers. Most GIF encoding libraries (gif.js, gif.worker.js) rely on Web Workers created from blob URLs, which CSP blocks. The Offscreen Document runs in the extension's own origin, free from the host page's CSP.

**Encoding library options:**

| Library | Pros | Cons |
|---|---|---|
| **gif.js** | Mature, Web Worker support, good quality | Requires worker blob (CSP issue on host — fine in offscreen) |
| **gifenc** | Modern, lightweight, no worker dependency | Newer, less community testing |
| **FFmpeg.wasm** | Full-featured, high quality | Very heavy (~25MB), overkill |

**Recommendation:** Use `gif.js` inside the offscreen document where CSP is not a constraint.

### 5.6 Chunked IPC Transfer

Chrome's `chrome.runtime.sendMessage` and `chrome.runtime.Port.postMessage` have a practical serialization limit of ~64MB. A 720p, 30-second, 10fps GIF can easily exceed 20MB (and the intermediate frame data during transfer can be much larger).

**Strategy:**
1. After encoding, the offscreen document slices the GIF `ArrayBuffer` into chunks of ≤10MB.
2. Each chunk is sent as a separate message with metadata: `{ chunkIndex, totalChunks, data: base64Chunk }`.
3. The service worker collects all chunks, reassembles the `ArrayBuffer`, converts to a Blob, creates an object URL, and triggers `chrome.downloads.download()`.

**Memory considerations:**
- Frame data (pre-encoding) is the biggest memory consumer. A single 720p RGBA frame is ~3.7MB. At 10fps × 30s = 300 frames ≈ 1.1GB raw.
- **Mitigation:** Downscale frames to the configured max width before sending to the offscreen document. At 480px width, each frame is ~1MB → 300 frames ≈ 300MB (still significant).
- **Mitigation:** Stream frames to the offscreen document during recording rather than batching at the end. The offscreen document can begin encoding incrementally.

---

## 6. UI/UX Specifications

### 6.1 Player Button

- **Position:** Right-side control bar, adjacent to existing buttons (settings gear, fullscreen, etc.).
- **Icon:** Camera/snapshot icon. Consistent with YouTube's icon style (outlined, 24px, white with opacity transitions on hover).
- **Tooltip:** "Take snapshot (S) · GIF: press G"
- **Behavior:** Single click triggers snapshot. GIF capture is keyboard-only (`G` to toggle start/stop) — no visible GIF button in the player to keep controls clean.

### 6.2 Visual Feedback — Snapshot

- **Flash:** White overlay on the `<video>` element, opacity 0 → 0.7 → 0 over 200ms.
- **Sound:** Camera shutter click. Short, recognizable, non-intrusive (~0.3s).
- **Toast (optional, P2):** Small notification near the player: "Snapshot saved ✓" (fades after 2s).

### 6.3 Visual Feedback — GIF Recording

- **Recording indicator:** Red circle (pulsing) + `00:00` counter in the top-left corner of the video player. Updates every second.
- **Start:** Red dot appears, counter starts.
- **Stop:** Red dot disappears, replaced by a brief "Encoding..." spinner or progress indicator.
- **Completion:** Toast: "GIF saved ✓" or error message if encoding fails.

### 6.4 Extension Popup

Minimal popup with:
- Extension name and icon.
- Quick toggle: Snapshot format (PNG / JPG).
- Quick toggle: Save destination (Clipboard / File / Both).
- "Settings" link → opens full options page.
- Status indicator if GIF is currently encoding.

### 6.5 Options Page

Clean, single-page settings layout. Grouped by:
1. **Snapshot** — Format, JPG quality (conditional), save destination.
2. **GIF** — Framerate, max duration, max width.
3. **Keyboard Shortcuts** — Snapshot key, GIF key. Link to `chrome://extensions/shortcuts` for global shortcut config.
4. **General** — Shutter sound toggle.
5. **About** — Version, credits, link to GitHub / support.

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Requirement | Target |
|---|---|
| Snapshot capture latency (button click → file saved / clipboard written) | < 500ms |
| GIF encoding time (10s clip @ 10fps, 480p) | < 5 seconds |
| Memory overhead during GIF recording (480p, 10fps) | < 500MB |
| Extension idle memory footprint | < 5MB |
| No perceptible video playback jank during snapshot capture | Must not drop frames |
| No perceptible video playback jank during GIF recording | ≤ 1 dropped frame per 10 captured |

### 7.2 Compatibility

| Requirement | Details |
|---|---|
| Chrome version | Minimum: Chrome 109+ (Offscreen Document API support). |
| YouTube player versions | Must handle YouTube's periodic UI updates. Use resilient selectors (e.g., class-name patterns, `aria-label`, element structure) rather than brittle specific selectors. |
| Embedded players | `youtube.com/embed/*`, `youtube-nocookie.com/embed/*`, third-party sites with YouTube iframes. |
| Operating Systems | Windows, macOS, Linux, ChromeOS. |

### 7.3 Reliability & Error Handling

| Scenario | Expected Behavior |
|---|---|
| Video is DRM-protected (EME/Widevine) | Canvas capture will return a black frame. Detect this condition and show a clear error message: "This video is protected and cannot be captured." |
| Ad is currently playing | Block capture. Ignore keyboard shortcuts and button clicks. Show tooltip "Capture unavailable during ads" only when the user presses `S`, `G`, or clicks the snapshot button. No proactive/persistent indication. Detect via `.ad-showing` class or player ad state API. |
| Video hasn't loaded / is buffering | Disable capture button. Show tooltip: "Video not ready." |
| GIF encoding fails (out of memory) | Catch error, display user-friendly message, suggest reducing duration or resolution. |
| Offscreen document crashes | Detect disconnection, recreate offscreen document, and notify user to retry. |
| Multiple rapid snapshot presses | Debounce at 300ms. Queue if necessary. Each produces a separate file. |

### 7.4 Security & Privacy

| Requirement | Details |
|---|---|
| No data leaves the browser. | All processing is local. No analytics, no telemetry, no server calls. |
| Minimal permissions. | Only request permissions that are strictly necessary. No `<all_urls>`, no `tabs`, no `webRequest`. |
| No access to user's browsing history, cookies, or other tab data. | Extension is scoped to YouTube player interaction only. |
| CSP-compliant content script. | Content script must not inject inline scripts or use `eval()`. All logic in bundled JS files. |

### 7.5 Accessibility

| Requirement | Details |
|---|---|
| Injected button must be keyboard-focusable and have an `aria-label`. | "Take screenshot" / "Record GIF". |
| Visual feedback must not be the only indicator. | Sound (shutter) + visual (flash) together. For GIF, the counter serves as non-visual-only feedback. |
| Respect `prefers-reduced-motion`. | Skip the flash animation if the user has reduced motion enabled. |

---

## 8. Edge Cases & Considerations

### 8.1 YouTube SPA Navigation

YouTube is a single-page application. When a user navigates between videos, the player is recycled, not destroyed and recreated. The content script must:
- Detect `yt-navigate-finish` events (YouTube's custom SPA navigation event).
- Re-check the player state and ensure the snapshot button is still present.
- Reset any GIF recording state.

### 8.2 Multiple Videos on a Page

Pages like YouTube search results, channel pages, or third-party sites with multiple embeds may contain several `<video>` elements. The extension must:
- Track which player each button belongs to.
- Route keyboard shortcuts to the correct player (last focused / hovered / playing).

### 8.3 Fullscreen Mode

In fullscreen mode, injected UI elements may be hidden if they're not children of the fullscreen element. The content script must:
- Detect fullscreen state changes via `document.fullscreenElement`.
- Ensure the snapshot button and GIF recording indicator are inside the fullscreen container.

### 8.4 Picture-in-Picture (PiP)

When a video enters PiP mode, the `<video>` element is still accessible in the DOM. `canvas.drawImage()` should still work. However:
- The injected button won't be visible in the PiP window.
- Keyboard shortcuts become the primary capture method.
- Consider adding a note in the popup: "Use keyboard shortcuts in PiP mode."

### 8.5 Video Resolution vs. Capture Resolution

`canvas.drawImage()` captures the video at its current decoded resolution, which depends on the quality setting (auto, 360p, 720p, 1080p, etc.). The extension captures what the `<video>` element has decoded — it does not upscale or downscale the snapshot.

For GIFs, the user's configured `max width` setting applies a downscale to manage file size and encoding performance.

### 8.6 YouTube Shorts

YouTube Shorts use a vertical video player with a different DOM structure. The extension should detect Shorts players and inject the snapshot button in an appropriate location (or default to keyboard-shortcut-only mode for Shorts).

### 8.7 Incognito / Private Browsing

The extension should work in incognito mode if the user explicitly enables it in `chrome://extensions`. No special handling is needed beyond the standard `incognito: "spanning"` manifest setting.

---

## 9. Open Questions

These items require a decision before development begins. They are called out throughout the document and consolidated here.

### 9.1 Keyboard Shortcut Conflict with YouTube — Resolved ✅

YouTube's native shortcut for subtitles/captions is `C`, not `S`. After reviewing the full YouTube shortcut list, neither `S` nor `G` are assigned to any native YouTube function. Both are safe to use as defaults with no conflict.

**Decision:** Keep `S` (snapshot) and `G` (GIF toggle) as default shortcuts. Users can still remap via the extension settings if needed.

### 9.2 Third-Party Embed Permissions — Resolved ✅

**Decision:** Default to all sites. The content script runs inside YouTube-origin iframes (`*://*.youtube.com/*` with `all_frames: true`), not the parent page, so no broad host permissions are needed. This should also avoid Chrome Web Store review friction since the match pattern is scoped to YouTube's own domain.

### 9.3 GIF Button in Player — Resolved ✅

**Decision:** GIF capture is keyboard-only (`G` to toggle). No visible GIF button in the player controls. This keeps the player clean and uncluttered. The snapshot button tooltip will mention the GIF shortcut for discoverability (e.g., "Take snapshot (S) · GIF: press G").

### 9.4 Capturing During Ads — Resolved ✅

**Decision:** Block capture during ads. When an ad is playing, keyboard shortcuts and button clicks are silently ignored — a tooltip "Capture unavailable during ads" appears only when the user actively attempts a capture (presses `S`, `G`, or clicks the snapshot button). No proactive visual change to the button.

**Implementation note:** Detect ad state via YouTube's player API (`.getAdState()`) or by checking for the presence of ad-specific DOM elements (e.g., `.ad-showing` class on the player container, `.ytp-ad-player-overlay`).

### 9.5 GIF Preview Before Save — Resolved ✅

**Decision:** Deferred to v2. For v1, the GIF saves immediately after encoding completes. Users can re-record if unsatisfied.

### 9.6 Download Location — Resolved ✅

**Decision:** No custom subfolder. Files save directly to the user's default Downloads directory. If the user has Chrome's "Ask where to save each file before downloading" setting enabled, Chrome will prompt them as usual. The extension does not override or interfere with Chrome's native download behavior.

**Implementation note:** When calling `chrome.downloads.download()`, pass only the `filename` (not a path with subdirectories). Chrome handles the rest based on user preferences.

### 9.7 Notification vs. Toast Feedback

After a successful capture, should feedback be:
- **A)** An in-player toast (non-intrusive, scoped to the video).
- **B)** A Chrome notification (persistent, visible even if the user has scrolled away).
- **C)** Both.

**Recommendation:** Option A (in-player toast) for snapshots. Option B (Chrome notification) for GIF completion since encoding is async and the user may have moved on.

---

## 10. Success Metrics

### 10.1 Adoption

| Metric | Target (90 days post-launch) |
|---|---|
| Chrome Web Store installs | 5,000+ |
| Weekly active users | 1,500+ |
| Store rating | 4.5+ stars |

### 10.2 Engagement

| Metric | Target |
|---|---|
| Snapshots captured per active user per week | ≥ 3 |
| GIFs captured per active user per week | ≥ 1 |
| Retention (Week 4 / Week 1) | ≥ 40% |

### 10.3 Quality

| Metric | Target |
|---|---|
| Crash-free sessions | ≥ 99.5% |
| GIF encoding success rate | ≥ 95% |
| Average snapshot latency | < 300ms |
| Support tickets / 1,000 users / month | < 5 |

> **Note:** Since the extension collects no telemetry (§7.4), these metrics would need to come from Chrome Web Store analytics and optional, opt-in usage pings. If telemetry is out of scope entirely, success metrics are limited to store reviews and install counts.

---

## 11. Release Plan

### 11.1 MVP (v1.0)

All P0 user stories. Specifically:
- Snapshot capture (button + keyboard shortcut).
- GIF capture (keyboard shortcut + player button).
- Auto-naming with video title + timestamp.
- Save to file and/or clipboard.
- Offscreen GIF encoding with chunked IPC.
- Camera shutter sound.
- Basic settings (format, destination, shortcuts).
- Works on youtube.com and YouTube embeds.

### 11.2 v1.1

- P1 user stories (configurable JPG quality, custom subfolder, improved settings UI).
- YouTube Shorts support.
- Chrome Web Store publication.

### 11.3 v2.0

- GIF preview and trim before saving.
- Capture history / gallery (local, stored in IndexedDB).
- Right-click context menu integration on video elements.
- Optional: WebM/MP4 short clip export (as alternative to GIF).
- Optional: Annotation / text overlay on snapshot before save.

---

## 12. Legal & Compliance Considerations

- **YouTube Terms of Service:** Capturing frames from YouTube videos for personal use, memes, commentary, and criticism generally falls within fair use norms. The extension does not circumvent DRM (EME/Widevine-protected content will produce black frames, and the extension does not attempt to bypass this).
- **Chrome Web Store policies:** The extension must comply with the Chrome Web Store Developer Program Policies, including the single-purpose policy, minimal permissions, and clear privacy disclosures.
- **Privacy policy:** Required for Chrome Web Store submission. Should state: no data collection, no analytics, all processing local.
- **Copyright disclaimer:** The extension is a tool. Users are responsible for how they use captured content. Include a brief disclaimer in the extension description and options page.

---

## 13. Technical Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| YouTube changes player DOM structure, breaking button injection. | High (YouTube updates frequently) | Medium — button disappears until patch | Use resilient, multi-strategy selectors. Monitor YouTube updates. Implement a fallback "floating button" mode. |
| GIF encoding runs out of memory for long recordings. | Medium | High — tab crash | Enforce max duration. Downscale frames. Stream frames to offscreen document during recording. Show memory warning at 80% limit. |
| Chrome deprecates or changes the Offscreen Document API. | Low | High — core GIF architecture breaks | Monitor Chrome release notes. Offscreen API is relatively new but stable. Alternative: use a dedicated extension page (tab) for encoding. |
| Chrome Web Store rejects due to broad permissions. | Low | Medium — delays launch | Justify each permission in the store listing. Use `activeTab` where possible. Provide documentation for reviewers. |
| `canvas.drawImage()` returns blank/black for certain videos. | Medium (DRM content) | Low — graceful degradation | Detect black frame (sample pixels), show clear error message. |

---

## Appendix A: Filename Sanitization Rules

Characters stripped from video titles for filename generation:

| Character | Replacement |
|---|---|
| `/ \ : * ? " < > \|` | Removed or replaced with `_` |
| Leading/trailing spaces | Trimmed |
| Consecutive spaces | Collapsed to single space |
| Title > 100 characters | Truncated with `…` |
| Empty title (edge case) | Default to `YouTube Capture` |

**Examples:**
- `Funny Cats Compilation #3!` → `Funny Cats Compilation #3! [00.02.34].png`
- `How to: Build a PC (2024 Guide)` → `How to_ Build a PC (2024 Guide) [01.15.22].gif`
- `Video with "Quotes" and *Stars*` → `Video with Quotes and Stars [00.00.05].jpg`

---

## Appendix B: Competitive Landscape

| Tool | Type | Snapshot | GIF | Inline Player UI | Free |
|---|---|---|---|---|---|
| **Screenshot YouTube** (ext) | Chrome Extension | Yes | No | Yes | Yes |
| **YouTube Screenshot** (ext) | Chrome Extension | Yes | No | Yes | Yes |
| **Gyazo** | Desktop + Extension | Yes | Yes (short) | No | Freemium |
| **ShareX** | Desktop (Windows) | Yes | Yes | No | Yes |
| **Gifcap** | Web App | No | Yes | No | Yes |
| **YouTube Snapshot (this)** | Chrome Extension | Yes | Yes | Yes | Yes |

**Differentiator:** YouTube Snapshot is the only solution combining inline player UI, both snapshot and GIF, local-only processing, and smart auto-naming — all in a lightweight Chrome extension.
