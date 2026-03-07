// content.js - Injects snapshot button, handles keyboard shortcuts, and GIF recording on YouTube

let currentShortcutKey = "s";
let gifRecorder = null;
let currentNotification = null;
let activePlayer = null;
let lastSnapshotTime = 0;
let recordingIndicator = null;
let recordingTimerInterval = null;

const SNAPSHOT_DEBOUNCE_MS = 300;

// --- Initialization ---

window.onload = function () {
  loadUserSettings();
  observePage();
  injectButtons();
  setupKeyboardShortcut();
  setupFullscreenListener();
  setupSPANavigationListener();
};

// --- User settings ---

function loadUserSettings() {
  chrome.storage.sync.get(
    ["saveAsFile", "saveToClipboard", "enableKeypress", "shortcutKey", "fileFormat", "playSound"],
    (data) => {
      if (data.saveAsFile === undefined) chrome.storage.sync.set({ saveAsFile: true });
      if (data.saveToClipboard === undefined) chrome.storage.sync.set({ saveToClipboard: true });
      if (data.enableKeypress === undefined) chrome.storage.sync.set({ enableKeypress: true });
      currentShortcutKey = data.shortcutKey || currentShortcutKey;
      chrome.storage.sync.set({ fileFormat: data.fileFormat || "png" });
    },
  );
}

// --- DOM observation ---

let injectDebounceTimer = null;

const observer = new MutationObserver(() => {
  if (injectDebounceTimer) return;
  injectDebounceTimer = setTimeout(() => {
    injectDebounceTimer = null;
    if (document.querySelector(".ytp-right-controls")) {
      injectButtons();
    }
  }, 200);
});

function observePage() {
  observer.observe(document.body, { childList: true, subtree: true });
}

// --- Player helpers ---

function getVideoForPlayer(playerEl) {
  return playerEl ? playerEl.querySelector("video") : null;
}

function getPlayerContainer(el) {
  return el ? el.closest(".html5-video-player") : null;
}

function trackActivePlayer(event) {
  const player = getPlayerContainer(event.target);
  if (player) activePlayer = player;
}

function resolveActiveVideo() {
  if (activePlayer && activePlayer.isConnected) {
    const video = getVideoForPlayer(activePlayer);
    if (video) return video;
  }
  const videos = document.querySelectorAll("video");
  for (const v of videos) {
    if (!v.paused) return v;
  }
  return videos[0] || null;
}

// --- Button injection ---

function injectButtons() {
  const allControls = document.querySelectorAll(".ytp-right-controls");

  for (const controls of allControls) {
    if (controls.querySelector(".yt-snapshot-btn")) continue;

    const playerContainer = getPlayerContainer(controls);

    const btn = document.createElement("button");
    btn.className = "yt-snapshot-btn";
    btn.title = "Take Snapshot (S) | Record GIF (G)";
    btn.classList.add("ytp-button");
    btn.setAttribute("aria-label", "Take screenshot");
    Object.assign(btn.style, {
      width: "auto",
      height: "100%",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      padding: "0 12px",
      marginRight: "4px",
      marginLeft: "4px",
    });

    const img = document.createElement("img");
    img.src = chrome.runtime.getURL("icons/snapshot-icon.png");
    Object.assign(img.style, { width: "auto", height: "50%", display: "block" });
    btn.appendChild(img);

    controls.insertBefore(btn, controls.firstChild);

    btn.addEventListener("click", () => {
      const video = getVideoForPlayer(playerContainer);
      if (video) {
        activePlayer = playerContainer;
        takeSnapshot(video);
      }
    });

    if (playerContainer) {
      playerContainer.addEventListener("click", trackActivePlayer);
      playerContainer.addEventListener("mouseover", trackActivePlayer);
      playerContainer.addEventListener("focusin", trackActivePlayer);
    }
  }
}

// --- Fullscreen & SPA navigation ---

function setupFullscreenListener() {
  document.addEventListener("fullscreenchange", () => setTimeout(injectButtons, 200));
}

function setupSPANavigationListener() {
  document.addEventListener("yt-navigate-finish", () => {
    activePlayer = null;
    if (gifRecorder?.isRecording()) {
      removeVideoPauseListeners();
      removeRecordingIndicator();
      gifRecorder.cancelRecording();
    }
    setTimeout(injectButtons, 300);
  });
}

// --- Keyboard shortcuts ---

function isEventFromEditable(event) {
  const target = event?.target || document.activeElement;
  if (!target) return false;

  if (typeof target.closest === "function") {
    if (target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) {
      return true;
    }
  }

  const tag = target.tagName?.toUpperCase() || "";
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function setupKeyboardShortcut() {
  let keypressListener;

  const updateKeypressListener = () => {
    if (keypressListener) document.removeEventListener("keypress", keypressListener);

    chrome.storage.sync.get(["enableKeypress", "shortcutKey"], (data) => {
      const shortcutKey = data.shortcutKey || "s";

      keypressListener = (event) => {
        if (isEventFromEditable(event)) return;

        const video = resolveActiveVideo();
        if (!video) return;

        const key = event.key.toLowerCase();
        if (key === shortcutKey) takeSnapshot(video);
        else if (key === "g" && shortcutKey !== "g") handleGifRecording(video);
      };
      document.addEventListener("keypress", keypressListener);
    });
  };

  updateKeypressListener();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && (changes.enableKeypress || changes.shortcutKey)) {
      updateKeypressListener();
    }
  });
}

// --- Ad & DRM detection ---

function isAdPlaying(video) {
  const player = video.closest(".html5-video-player");
  if (!player) return false;
  return player.classList.contains("ad-showing") || !!player.querySelector(".ytp-ad-player-overlay");
}

function isBlackFrame(canvas) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const data = ctx.getImageData(0, 0, w, h).data;
  const points = [0.25, 0.5, 0.75];
  for (const py of points) {
    for (const px of points) {
      const idx = (Math.floor(h * py) * w + Math.floor(w * px)) * 4;
      if (data[idx] + data[idx + 1] + data[idx + 2] > 15) return false;
    }
  }
  return true;
}

// --- Visual feedback ---

function flashOverlay(video) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const player = video.closest(".html5-video-player") || video.parentElement;
  if (!player) return;

  if (getComputedStyle(player).position === "static") player.style.position = "relative";

  const flash = document.createElement("div");
  Object.assign(flash.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "white",
    opacity: "0",
    pointerEvents: "none",
    zIndex: "999",
    transition: "opacity 100ms ease-out",
  });

  player.appendChild(flash);

  requestAnimationFrame(() => {
    flash.style.opacity = "0.7";
    setTimeout(() => {
      flash.style.opacity = "0";
      setTimeout(() => flash.remove(), 150);
    }, 100);
  });
}

// --- Recording indicator ---

function injectRecordingStyles() {
  if (document.getElementById("yt-snapshot-recording-styles")) return;
  const style = document.createElement("style");
  style.id = "yt-snapshot-recording-styles";
  style.textContent = `
    @keyframes yt-snapshot-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    @keyframes yt-snapshot-slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    @keyframes yt-snapshot-slide-out {
      from { transform: translateX(0);    opacity: 1; }
      to   { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

function showRecordingIndicator(video) {
  removeRecordingIndicator(true);

  const player = video.closest(".html5-video-player") || video.parentElement;
  if (!player) return;

  if (getComputedStyle(player).position === "static") player.style.position = "relative";

  injectRecordingStyles();

  const indicator = document.createElement("div");
  indicator.id = "yt-snapshot-recording-indicator";
  Object.assign(indicator.style, {
    position: "absolute",
    top: "12px",
    right: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    borderRadius: "20px",
    padding: "6px 12px 6px 10px",
    zIndex: "2147483647",
    pointerEvents: "none",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.5)",
    animation: "yt-snapshot-slide-in 0.3s ease-out forwards",
  });

  const dot = document.createElement("div");
  dot.className = "yt-snapshot-rec-dot";
  Object.assign(dot.style, {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    backgroundColor: "#ff0000",
    flexShrink: "0",
    animation: "yt-snapshot-pulse 1.5s ease-in-out infinite",
  });

  const timer = document.createElement("span");
  timer.className = "yt-snapshot-rec-timer";
  Object.assign(timer.style, {
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "0.5px",
    lineHeight: "1",
  });
  timer.textContent = "00:00";

  indicator.appendChild(dot);
  indicator.appendChild(timer);
  player.appendChild(indicator);
  recordingIndicator = indicator;

  const recStartTime = gifRecorder.startTime;
  let totalPausedMs = 0;
  let pausedAt = null;

  recordingTimerInterval = setInterval(() => {
    if (!gifRecorder.isRecording()) {
      removeRecordingIndicator();
      return;
    }

    const now = Date.now();
    let elapsedMs;
    if (video.paused) {
      if (pausedAt === null) pausedAt = now;
      elapsedMs = (pausedAt - recStartTime) - totalPausedMs;
    } else {
      if (pausedAt !== null) {
        totalPausedMs += now - pausedAt;
        pausedAt = null;
      }
      elapsedMs = (now - recStartTime) - totalPausedMs;
    }
    const elapsed = Math.max(0, Math.floor(elapsedMs / 1000));
    const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const secs = String(elapsed % 60).padStart(2, "0");
    const timerEl = indicator.querySelector(".yt-snapshot-rec-timer");
    if (timerEl) timerEl.textContent = `${mins}:${secs}`;

    const dotEl = indicator.querySelector(".yt-snapshot-rec-dot");
    if (dotEl) {
      if (video.paused) {
        dotEl.style.animation = "none";
        dotEl.style.opacity = "0.5";
      } else {
        dotEl.style.animation = "yt-snapshot-pulse 1.5s ease-in-out infinite";
        dotEl.style.opacity = "";
      }
    }
  }, 500);
}

function removeRecordingIndicator(immediate) {
  if (recordingTimerInterval) {
    clearInterval(recordingTimerInterval);
    recordingTimerInterval = null;
  }
  if (!recordingIndicator) return;

  const el = recordingIndicator;
  recordingIndicator = null;

  if (immediate) {
    el.remove();
  } else {
    el.style.animation = "yt-snapshot-slide-out 0.3s ease-in forwards";
    el.addEventListener("animationend", () => el.remove(), { once: true });
    setTimeout(() => { if (el.parentNode) el.remove(); }, 400);
  }
}

// --- GIF recording ---

async function getGifRecorder() {
  if (gifRecorder) return gifRecorder;
  const response = await chrome.runtime.sendMessage({ type: "inject-gif-recorder" });
  if (!response?.ok) throw new Error(response?.error || "Failed to inject GIF recorder");
  gifRecorder = new GIFRecorder();
  return gifRecorder;
}

async function handleGifRecording(video) {
  if (isAdPlaying(video)) {
    showNotification("Capture unavailable during ads", "info");
    return;
  }

  try {
    const rec = await getGifRecorder();
    if (!rec.isRecording()) {
      if (!rec.startRecording(video)) {
        showNotification("Failed to start GIF recording", "error");
        return;
      }

      showNotification("GIF recording started", "info");
      showRecordingIndicator(video);

      const onAutoStop = () => {
        document.removeEventListener("gifAutoStopped", onAutoStop);
        removeVideoPauseListeners();
        removeRecordingIndicator();
        showGifProcessingUI();
      };
      document.addEventListener("gifAutoStopped", onAutoStop);

      const onPause = () => {
        if (gifRecorder.isRecording()) showNotification("Recording paused", "info");
      };
      const onPlay = () => {
        if (gifRecorder.isRecording()) showNotification("Recording resumed", "info");
      };
      video.addEventListener("pause", onPause);
      video.addEventListener("play", onPlay);
      gifRecorder._videoPauseCleanup = () => {
        video.removeEventListener("pause", onPause);
        video.removeEventListener("play", onPlay);
      };
    } else {
      removeVideoPauseListeners();
      removeRecordingIndicator();
      gifRecorder.stopRecording();
      showGifProcessingUI();
    }
  } catch (err) {
    console.error("GIF recording error:", err);
    showNotification("Failed to start GIF recording", "error");
  }
}

function removeVideoPauseListeners() {
  if (gifRecorder._videoPauseCleanup) {
    gifRecorder._videoPauseCleanup();
    gifRecorder._videoPauseCleanup = null;
  }
}

function showGifProcessingUI() {
  const progressBox = showNotification("Processing GIF...", "progress", 0);

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  Object.assign(cancelBtn.style, {
    marginLeft: "4px",
    padding: "4px 8px",
    backgroundColor: "#ff4444",
    border: "none",
    borderRadius: "4px",
    color: "white",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  });
  cancelBtn.onmouseover = () => (cancelBtn.style.backgroundColor = "#ff6666");
  cancelBtn.onmouseout = () => (cancelBtn.style.backgroundColor = "#ff4444");
  cancelBtn.onclick = () => {
    removeVideoPauseListeners();
    removeRecordingIndicator();
    gifRecorder.cancelRecording();
    cleanup();
    progressBox.remove();
    currentNotification = null;
    showNotification("GIF processing cancelled", "info");
  };
  progressBox.appendChild(cancelBtn);

  const onProgress = (e) => {
    if (currentNotification !== progressBox) return;
    const btn = progressBox.querySelector("button");
    progressBox.textContent = `Processing GIF... ${String(Math.round(e.detail * 100)).padStart(2, "0")}%`;
    progressBox.appendChild(btn);
  };

  const onFinished = () => {
    cleanup();
    if (currentNotification !== progressBox) return;
    progressBox.remove();
    currentNotification = null;
    showNotification("GIF saved successfully!", "success");
  };

  const onError = () => {
    cleanup();
    if (currentNotification !== progressBox) return;
    progressBox.remove();
    currentNotification = null;
    showNotification("Failed to process GIF", "error");
  };

  function cleanup() {
    document.removeEventListener("gifProgress", onProgress);
    document.removeEventListener("gifFinished", onFinished);
    document.removeEventListener("gifError", onError);
  }

  document.addEventListener("gifProgress", onProgress);
  document.addEventListener("gifFinished", onFinished);
  document.addEventListener("gifError", onError);
}

// --- Notifications ---

function showNotification(message, type = "info", duration = 3000) {
  if (currentNotification) {
    currentNotification.remove();
    currentNotification = null;
  }

  const box = document.createElement("div");
  box.textContent = message;
  Object.assign(box.style, {
    fontSize: "14px",
    position: "fixed",
    bottom: "20px",
    right: "20px",
    backgroundColor: type === "info" ? "#333" : type === "success" ? "#409656" : "#ff4444",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "8px",
    zIndex: "1000",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    opacity: "0",
    transition: "opacity 0.2s ease-in-out",
  });

  if (type === "progress") {
    const spinner = document.createElement("div");
    Object.assign(spinner.style, {
      width: "12px",
      height: "12px",
      border: "2px solid #fff",
      borderTop: "2px solid transparent",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
    });
    if (!document.getElementById("yt-snapshot-spin-style")) {
      const style = document.createElement("style");
      style.id = "yt-snapshot-spin-style";
      style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }
    box.insertBefore(spinner, box.firstChild);
  }

  document.body.appendChild(box);
  box.offsetHeight; // Force reflow
  box.style.opacity = "1";
  currentNotification = box;

  if (duration > 0) {
    setTimeout(() => {
      if (currentNotification !== box) return;
      box.style.opacity = "0";
      setTimeout(() => {
        if (currentNotification === box) {
          box.remove();
          currentNotification = null;
        }
      }, 300);
    }, duration);
  }

  return box;
}

// --- Snapshot capture ---

function takeSnapshot(video) {
  if (!video) return;

  const now = Date.now();
  if (now - lastSnapshotTime < SNAPSHOT_DEBOUNCE_MS) return;
  lastSnapshotTime = now;

  if (isAdPlaying(video)) {
    showNotification("Capture unavailable during ads", "info");
    return;
  }

  const videoTitle = getTitleFromHeadTag();
  const formattedTime = formatTime(video.currentTime);
  const sanitizedTitle = videoTitle.trim();

  chrome.storage.sync.get(
    ["fileFormat", "jpgQuality", "saveAsFile", "saveToClipboard", "playSound"],
    (data) => {
      if (!data.saveAsFile && !data.saveToClipboard) {
        showNotification("No output enabled — check extension settings", "error");
        return;
      }

      const format = data.fileFormat || "png";
      const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
      const ext = format === "jpg" ? "jpg" : "png";
      const jpgQuality = (data.jpgQuality ?? 92) / 100;
      const filename = `${sanitizedTitle} [${formattedTime}].${ext}`;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

      if (isBlackFrame(canvas)) {
        showNotification("This video is protected and cannot be captured", "error");
        return;
      }

      flashOverlay(video);

      const dataURL = format === "jpg"
        ? canvas.toDataURL(mimeType, jpgQuality)
        : canvas.toDataURL(mimeType);

      if (data.saveAsFile) {
        const link = document.createElement("a");
        link.href = dataURL;
        link.download = filename;
        link.click();
      }

      if (data.saveToClipboard) saveImageToClipboard(canvas);

      if (data.playSound !== false) {
        new Audio(chrome.runtime.getURL("audio/download-sound.mp3"))
          .play()
          .catch((err) => console.error("Error playing sound:", err));
      }
    },
  );
}

async function saveImageToClipboard(canvas) {
  try {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    showNotification("Snapshot copied to clipboard!", "success");
  } catch (err) {
    console.error("Failed to copy image to clipboard:", err);
  }
}

// --- Utilities ---

function getTitleFromHeadTag() {
  let title = document.title.replace(/^\(\d+\)\s*/, "");
  if (title.endsWith(" - YouTube")) title = title.replace(" - YouTube", "");
  return title.trim();
}

function formatTime(seconds) {
  const date = new Date(0);
  date.setSeconds(seconds);
  return date.toISOString().substring(11, 19).replace(/:/g, ".");
}
