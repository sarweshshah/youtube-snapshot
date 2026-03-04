// content.js - Injects snapshot button, handles user settings, keyboard shortcuts, and GIF recording on YouTube

let currentShortcutKey = "s"; // Default shortcut key
let gifRecorder = new GIFRecorder(); // Initialize GIF recorder
let currentNotification = null;

// Track the most recently interacted-with player for keyboard shortcuts (FR-04)
let activePlayer = null;

// Debounce: prevent rapid snapshot presses (300ms cooldown)
let lastSnapshotTime = 0;
const SNAPSHOT_DEBOUNCE_MS = 300;

// --- Ad detection: check if an ad is currently playing ---
function isAdPlaying(video) {
  // YouTube adds .ad-showing to the player container during ads
  const player = video.closest(".html5-video-player");
  if (player && player.classList.contains("ad-showing")) return true;
  // Also check for ad overlay elements
  if (player && player.querySelector(".ytp-ad-player-overlay")) return true;
  return false;
}

// --- DRM detection: check if canvas capture returned a black frame ---
function isBlackFrame(canvas) {
  const ctx = canvas.getContext("2d");
  // Sample a grid of pixels across the frame
  const w = canvas.width;
  const h = canvas.height;
  const samplePoints = [
    [w * 0.25, h * 0.25],
    [w * 0.5, h * 0.25],
    [w * 0.75, h * 0.25],
    [w * 0.25, h * 0.5],
    [w * 0.5, h * 0.5],
    [w * 0.75, h * 0.5],
    [w * 0.25, h * 0.75],
    [w * 0.5, h * 0.75],
    [w * 0.75, h * 0.75],
  ];

  for (const [x, y] of samplePoints) {
    const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    // If any sampled pixel is non-black (R+G+B > 15), frame is valid
    if (pixel[0] + pixel[1] + pixel[2] > 15) return false;
  }
  return true;
}

// --- FR-12: White flash overlay on snapshot capture ---
function flashOverlay(video) {
  // Respect prefers-reduced-motion
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const player = video.closest(".html5-video-player") || video.parentElement;
  if (!player) return;

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

  // Ensure parent is positioned so the overlay sits correctly
  const parentPosition = getComputedStyle(player).position;
  if (parentPosition === "static") {
    player.style.position = "relative";
  }

  player.appendChild(flash);

  // Animate: transparent → white → transparent
  requestAnimationFrame(() => {
    flash.style.opacity = "0.7";
    setTimeout(() => {
      flash.style.opacity = "0";
      setTimeout(() => flash.remove(), 150);
    }, 100);
  });
}

// Inject the snapshot buttons immediately when the script loads
injectButtons();

// On window load, initialize user settings, observers, and keyboard shortcuts
window.onload = function () {
  console.log("Window loaded, initializing...");
  loadUserSettings(); // Load initial user settings
  observePage(); // Start observing for dynamic content changes
  injectButtons(); // Inject buttons into all players on the page
  setupKeyboardShortcut(); // Set up dynamic keypress functionality
  setupFullscreenListener(); // Re-inject buttons on fullscreen changes (FR-05)
  setupSPANavigationListener(); // Handle YouTube SPA navigation (FR-05)
};

// Load user settings or apply default settings
function loadUserSettings() {
  chrome.storage.sync.get(
    [
      "saveAsFile",
      "saveToClipboard",
      "enableKeypress",
      "shortcutKey",
      "fileFormat",
      "playSound",
    ],
    (data) => {
      // Apply default settings if none are found
      if (data.saveAsFile === undefined) {
        chrome.storage.sync.set({ saveAsFile: true }); // Default: Save as File is enabled
      }
      if (data.saveToClipboard === undefined) {
        chrome.storage.sync.set({ saveToClipboard: true }); // Default: Save to Clipboard is enabled
      }
      if (data.enableKeypress === undefined) {
        chrome.storage.sync.set({ enableKeypress: true }); // Default: Enable keyboard shortcuts
      }
      currentShortcutKey = data.shortcutKey || currentShortcutKey;
      // Default file format is PNG
      chrome.storage.sync.set({ fileFormat: data.fileFormat || "png" });
    }
  );
}

// MutationObserver to watch for DOM changes (for YouTube's dynamic content)
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (
      (mutation.type === "childList" || mutation.type === "attributes") &&
      document.querySelector(".ytp-right-controls")
    ) {
      injectButtons(); // Re-inject buttons if controls change
    }
  }
});

// Start observing the YouTube page for changes
function observePage() {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });
}

// Utility: detect if a keyboard event originated from an editable context
function isEventFromEditable(event) {
  const active = document.activeElement;
  const target = event && event.target ? event.target : active;
  if (!target) return false;

  // If inside input, textarea, select, or any contenteditable container, treat as editable
  if (typeof target.closest === "function") {
    const editableContainer = target.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
    );
    if (editableContainer) return true;
  }

  const tag = target.tagName ? target.tagName.toUpperCase() : "";
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;

  return false;
}

// --- FR-04: Find the <video> element associated with a given player container ---
function getVideoForPlayer(playerEl) {
  if (!playerEl) return null;
  return playerEl.querySelector("video");
}

// --- FR-04: Find the player container (.html5-video-player) for a given element ---
function getPlayerContainer(el) {
  if (!el) return null;
  return el.closest(".html5-video-player");
}

// --- FR-04: Set the active player when the user interacts with any player ---
function trackActivePlayer(event) {
  const player = getPlayerContainer(event.target);
  if (player) {
    activePlayer = player;
  }
}

// --- FR-04: Resolve which video to use for keyboard shortcuts ---
// Priority: active (last interacted) → currently playing → first on page
function resolveActiveVideo() {
  // 1. Last interacted player
  if (activePlayer && activePlayer.isConnected) {
    const video = getVideoForPlayer(activePlayer);
    if (video) return video;
  }

  // 2. Currently playing video
  const videos = document.querySelectorAll("video");
  for (const v of videos) {
    if (!v.paused) return v;
  }

  // 3. First video on the page
  return videos[0] || null;
}

// --- FR-04: Inject snapshot button into ALL players on the page ---
function injectButtons() {
  const allControls = document.querySelectorAll(".ytp-right-controls");

  for (const controls of allControls) {
    // Skip if this control bar already has our button
    if (controls.querySelector(".yt-snapshot-btn")) continue;

    const playerContainer = getPlayerContainer(controls);

    // Create the snapshot button
    const snapshotButton = document.createElement("button");
    snapshotButton.className = "yt-snapshot-btn";
    snapshotButton.title = "Take Snapshot (S) | Record GIF (G)";
    snapshotButton.classList.add("ytp-button");
    snapshotButton.setAttribute("aria-label", "Take screenshot");

    // Style the button for proper dimensions and visibility
    Object.assign(snapshotButton.style, {
      width: "auto",
      height: "100%",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      padding: "0 12px",
      marginRight: "4px",
      marginLeft: "4px",
    });

    // Create the img element for the button icon
    const img = document.createElement("img");
    img.src = chrome.runtime.getURL("icons/snapshot-icon.png");
    Object.assign(img.style, {
      width: "auto",
      height: "50%",
      display: "block",
    });

    // Insert the image inside the button
    snapshotButton.appendChild(img);

    // Insert the button into the YouTube controls
    controls.insertBefore(snapshotButton, controls.firstChild);

    // Click captures from THIS player's video
    snapshotButton.addEventListener("click", () => {
      const video = getVideoForPlayer(playerContainer);
      if (video) {
        activePlayer = playerContainer;
        takeSnapshot(video);
      }
    });

    // Track active player on interaction (click, hover, focus)
    if (playerContainer) {
      playerContainer.addEventListener("click", trackActivePlayer);
      playerContainer.addEventListener("mouseover", trackActivePlayer);
      playerContainer.addEventListener("focusin", trackActivePlayer);
    }
  }
}

// --- FR-05: Re-inject buttons when fullscreen state changes ---
function setupFullscreenListener() {
  document.addEventListener("fullscreenchange", () => {
    // Short delay to let YouTube update its DOM after fullscreen toggle
    setTimeout(injectButtons, 200);
  });
}

// --- FR-05: Handle YouTube SPA navigation ---
function setupSPANavigationListener() {
  // YouTube fires this custom event on client-side navigation
  document.addEventListener("yt-navigate-finish", () => {
    // Reset active player since the page content changed
    activePlayer = null;

    // Cancel any in-progress GIF recording
    if (gifRecorder.isRecording()) {
      removeVideoPauseListeners();
      gifRecorder.cancelRecording();
    }

    // Re-inject buttons into the new page
    setTimeout(injectButtons, 300);
  });
}

// Set up dynamic keypress shortcut functionality
function setupKeyboardShortcut() {
  let keypressListener;

  // Helper to update the keypress event listener
  const updateKeypressListener = () => {
    // Remove the old listener if it exists
    if (keypressListener) {
      document.removeEventListener("keypress", keypressListener);
    }

    // Get current keypress settings from storage
    chrome.storage.sync.get(["enableKeypress", "shortcutKey"], (data) => {
      // Always enable keyboard shortcuts (can be changed to respect user setting)
      const isEnabled = true; // Force enable keyboard shortcuts
      const shortcutKey = data.shortcutKey || "s";

      keypressListener = (event) => {
        if (isEventFromEditable(event)) return; // Ignore shortcuts while typing in editable fields

        const video = resolveActiveVideo();
        if (!video) return;

        const pressedKey = event.key.toLowerCase();

        // Check snapshot shortcut first
        if (pressedKey === shortcutKey) {
          takeSnapshot(video);
        }
        // Only handle GIF shortcut if it doesn't conflict with snapshot shortcut
        else if (pressedKey === "g" && shortcutKey !== "g") {
          handleGifRecording(video);
        }
      };
      document.addEventListener("keypress", keypressListener);
    });
  };

  // Initial setup
  updateKeypressListener();

  // Listen for changes to enableKeypress or shortcutKey
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && (changes.enableKeypress || changes.shortcutKey)) {
      updateKeypressListener();
    }
  });
}

// Handle GIF recording logic (start/stop, show notifications, handle progress/cancel)
function handleGifRecording(video) {
  // Ad detection: block GIF capture during ads
  if (isAdPlaying(video)) {
    showNotification("Capture unavailable during ads", "info");
    return;
  }

  if (!gifRecorder.isRecording()) {
    if (gifRecorder.startRecording(video)) {
      showNotification("GIF recording started", "info");

      // Listen for auto-stop and process the GIF
      const onAutoStop = () => {
        document.removeEventListener("gifAutoStopped", onAutoStop);
        removeVideoPauseListeners();
        showGifProcessingUI();
      };
      document.addEventListener("gifAutoStopped", onAutoStop);

      // Show toast when video is paused/resumed during recording
      const onPause = () => {
        if (gifRecorder.isRecording()) {
          showNotification("Recording paused", "info");
        }
      };
      const onPlay = () => {
        if (gifRecorder.isRecording()) {
          showNotification("Recording resumed", "info");
        }
      };
      video.addEventListener("pause", onPause);
      video.addEventListener("play", onPlay);

      // Store references for cleanup
      gifRecorder._videoPauseCleanup = () => {
        video.removeEventListener("pause", onPause);
        video.removeEventListener("play", onPlay);
      };
    } else {
      showNotification("Failed to start GIF recording", "error");
    }
  } else {
    removeVideoPauseListeners();
    gifRecorder.stopRecording();
    showGifProcessingUI();
  }
}

// Remove video pause/play listeners attached during GIF recording
function removeVideoPauseListeners() {
  if (gifRecorder._videoPauseCleanup) {
    gifRecorder._videoPauseCleanup();
    gifRecorder._videoPauseCleanup = null;
  }
}

// Show GIF processing UI with progress, cancel button, and event listeners
function showGifProcessingUI() {
  const progressBox = showNotification("Processing GIF...", "progress", 0);

  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancel";
  Object.assign(cancelButton.style, {
    marginLeft: "4px",
    padding: "4px 8px",
    backgroundColor: "#ff4444",
    border: "none",
    borderRadius: "4px",
    color: "white",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  });
  cancelButton.onmouseover = () =>
    (cancelButton.style.backgroundColor = "#ff6666");
  cancelButton.onmouseout = () =>
    (cancelButton.style.backgroundColor = "#ff4444");

  cancelButton.onclick = () => {
    removeVideoPauseListeners();
    gifRecorder.cancelRecording();
    cleanup();
    progressBox.remove();
    currentNotification = null;
    showNotification("GIF processing cancelled", "info");
  };

  progressBox.appendChild(cancelButton);

  const onProgress = (e) => {
    if (currentNotification === progressBox) {
      const tempButton = progressBox.querySelector("button");
      progressBox.textContent = `Processing GIF... ${String(
        Math.round(e.detail * 100)
      ).padStart(2, "0")}%`;
      progressBox.appendChild(tempButton);
    }
  };

  const onFinished = () => {
    cleanup();
    if (currentNotification === progressBox) {
      progressBox.remove();
      currentNotification = null;
      showNotification("GIF saved successfully!", "success");
    }
  };

  const onError = () => {
    cleanup();
    if (currentNotification === progressBox) {
      progressBox.remove();
      currentNotification = null;
      showNotification("Failed to process GIF", "error");
    }
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

// Show notification (info, success, error, or progress)
function showNotification(message, type = "info", duration = 3000) {
  // Remove previous notification if it exists
  if (currentNotification) {
    currentNotification.remove();
    currentNotification = null;
  }

  const alertBox = document.createElement("div");
  alertBox.textContent = message;
  Object.assign(alertBox.style, {
    fontSize: "14px",
    position: "fixed",
    bottom: "20px",
    right: "20px",
    backgroundColor:
      type === "info" ? "#333" : type === "success" ? "#409656" : "#ff4444",
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
    spinner.className = "spinner";
    Object.assign(spinner.style, {
      width: "12px",
      height: "12px",
      border: "2px solid #fff",
      borderTop: "2px solid transparent",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
    });

    const style = document.createElement("style");
    style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
    document.head.appendChild(style);
    alertBox.insertBefore(spinner, alertBox.firstChild);
  }

  document.body.appendChild(alertBox);

  // Trigger reflow to enable transition
  alertBox.offsetHeight;
  alertBox.style.opacity = "1";

  currentNotification = alertBox;

  if (duration > 0) {
    setTimeout(() => {
      if (currentNotification === alertBox) {
        alertBox.style.opacity = "0";
        setTimeout(() => {
          if (currentNotification === alertBox) {
            alertBox.remove();
            currentNotification = null;
          }
        }, 300);
      }
    }, duration);
  }
  return alertBox;
}

// Function to capture the snapshot from a specific video element
function takeSnapshot(video) {
  if (!video) return;

  // Debounce: ignore rapid presses within 300ms
  const now = Date.now();
  if (now - lastSnapshotTime < SNAPSHOT_DEBOUNCE_MS) return;
  lastSnapshotTime = now;

  // Ad detection: block capture during ads
  if (isAdPlaying(video)) {
    showNotification("Capture unavailable during ads", "info");
    return;
  }

  // Fetch YouTube video title from <title> tag in <head>
  const videoTitle = getTitleFromHeadTag();

  // Get the current time of the video
  const currentTime = video.currentTime;
  const formattedTime = formatTime(currentTime);

  // Sanitize the video title to make it filename-friendly
  const sanitizedTitle = videoTitle.trim();

  chrome.storage.sync.get(
    ["fileFormat", "jpgQuality", "saveAsFile", "saveToClipboard", "playSound"],
    (data) => {
      if (!data.saveAsFile && !data.saveToClipboard) {
        showNotification(
          "No output enabled — check extension settings",
          "error"
        );
        return;
      }

      const format = data.fileFormat || "png";
      const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
      const extension = format === "jpg" ? "jpg" : "png";
      const jpgQuality = (data.jpgQuality ?? 92) / 100; // Convert percentage to 0-1

      // Generate a dynamic filename with the chosen extension
      const filename = `${sanitizedTitle} [${formattedTime}].${extension}`;

      // Create a canvas and capture the current video frame
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // DRM detection: check if the captured frame is entirely black
      if (isBlackFrame(canvas)) {
        showNotification(
          "This video is protected and cannot be captured",
          "error"
        );
        return;
      }

      // FR-12: White flash overlay
      flashOverlay(video);

      // Convert canvas to image in the selected format (pass quality for JPG)
      const dataURL = format === "jpg"
        ? canvas.toDataURL(mimeType, jpgQuality)
        : canvas.toDataURL(mimeType);

      // Handle save-to-file and clipboard options
      if (data.saveAsFile) {
        // Save the image as a file
        const link = document.createElement("a");
        link.href = dataURL;
        link.download = filename; // Use generated filename with the correct extension
        link.click();
      }

      if (data.saveToClipboard) {
        // Save the image to the clipboard
        saveImageToClipboard(canvas);
      }

      if (data.playSound !== false) {
        // Default to true
        const audio = new Audio(
          chrome.runtime.getURL("audio/download-sound.mp3")
        );
        audio
          .play()
          .catch((error) => console.error("Error playing sound:", error));
      }
    }
  );
}

// Function to save image to the clipboard
async function saveImageToClipboard(canvas) {
  try {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve));
    const item = new ClipboardItem({ "image/png": blob });
    await navigator.clipboard.write([item]);
    showNotification("Snapshot copied to clipboard!", "success");
  } catch (err) {
    console.error("Failed to copy image to clipboard: ", err);
  }
}

// Function to fetch the video title from the <title> tag
function getTitleFromHeadTag() {
  let title = document.title;

  // Remove leading notification count, e.g., (2) from the title
  title = title.replace(/^\(\d+\)\s*/, "");

  // YouTube usually appends " - YouTube" to the title, so we strip it off
  if (title.endsWith(" - YouTube")) {
    title = title.replace(" - YouTube", "");
  }

  return title.trim(); // Return the cleaned-up title
}

// Helper function to format time as HH-MM-SS
function formatTime(seconds) {
  const date = new Date(0);
  date.setSeconds(seconds);
  return date.toISOString().substring(11, 19).replace(/:/g, "."); // Format as HH.MM.SS
}
