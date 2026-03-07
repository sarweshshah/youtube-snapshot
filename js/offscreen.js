// offscreen.js - Renders GIF using gif.js with real Web Workers
// Runs in an offscreen document (extension origin), free from page CSP restrictions.

let frames = [];
let gifWidth = 0;
let gifHeight = 0;
let currentGif = null;
let currentTabId = null;
let isCancelled = false;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target !== "offscreen") return;

  switch (msg.type) {
    case "gif-frame":
      gifWidth = msg.width;
      gifHeight = msg.height;
      frames.push(decodeFrame(msg.data, msg.width, msg.height));
      sendResponse({ ok: true });
      return true;

    case "gif-render":
      currentTabId = msg.tabId;
      isCancelled = false;
      renderGIF(msg.videoTitle, msg.formattedTime, msg.frameDelay || 100);
      sendResponse({ ok: true });
      return true;

    case "gif-cancel":
      isCancelled = true;
      if (currentGif) {
        try { currentGif.abort(); } catch (e) { /* ok */ }
      }
      cleanup();
      sendResponse({ ok: true });
      return true;
  }
});

function decodeFrame(base64, width, height) {
  const binary = atob(base64);
  const bytes = new Uint8ClampedArray(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new ImageData(bytes, width, height);
}

function sendToTab(message) {
  if (currentTabId == null) return;
  chrome.runtime.sendMessage({ ...message, tabId: currentTabId });
}

function renderGIF(videoTitle, formattedTime, frameDelay) {
  try {
    currentGif = new GIF({
      workers: 2,
      quality: 10,
      width: gifWidth,
      height: gifHeight,
      workerScript: chrome.runtime.getURL("js/libs/gif.worker.js"),
    });

    for (const imageData of frames) {
      currentGif.addFrame(imageData, { delay: frameDelay });
    }

    currentGif.on("progress", (p) => {
      if (isCancelled) return;
      sendToTab({ type: "gif-progress", progress: p });
    });

    currentGif.on("finished", (blob) => {
      if (isCancelled) {
        cleanup();
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (isCancelled) {
          cleanup();
          return;
        }
        const dataUrl = reader.result;
        const CHUNK_SIZE = 10 * 1024 * 1024;
        const totalChunks = Math.ceil(dataUrl.length / CHUNK_SIZE);

        for (let i = 0; i < totalChunks; i++) {
          if (isCancelled) break;
          const chunk = dataUrl.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          sendToTab({
            type: "gif-chunk",
            chunk,
            index: i,
            total: totalChunks,
            videoTitle,
            formattedTime,
          });
        }
        cleanup();
      };
      reader.readAsDataURL(blob);
    });

    currentGif.render();
  } catch (error) {
    console.error("Offscreen GIF render error:", error);
    sendToTab({ type: "gif-error", error: error.message });
    cleanup();
  }
}

function cleanup() {
  currentGif = null;
  frames = [];
  currentTabId = null;
}
