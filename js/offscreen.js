// offscreen.js - Renders GIF using gif.js with real Web Workers
// Runs in an offscreen document (extension origin), free from page CSP restrictions.

let frames = [];
let gifWidth = 0;
let gifHeight = 0;
let currentGif = null;
let currentTabId = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target !== "offscreen") return;

  switch (msg.type) {
    case "gif-frame":
      gifWidth = msg.width;
      gifHeight = msg.height;
      frames.push(decodeFrame(msg.data, msg.width, msg.height));
      sendResponse({ ok: true });
      break;

    case "gif-render":
      currentTabId = msg.tabId;
      renderGIF(msg.videoTitle, msg.formattedTime, msg.frameDelay || 100);
      sendResponse({ ok: true });
      break;

    case "gif-cancel":
      cancelRender();
      sendResponse({ ok: true });
      break;
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
      sendToTab({ type: "gif-progress", progress: p });
    });

    currentGif.on("finished", (blob) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
        const totalChunks = Math.ceil(dataUrl.length / CHUNK_SIZE);
        
        for (let i = 0; i < totalChunks; i++) {
          const chunk = dataUrl.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          sendToTab({
            type: "gif-chunk",
            chunk: chunk,
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

function cancelRender() {
  if (currentGif) {
    currentGif.abort();
  }
  cleanup();
}

function cleanup() {
  currentGif = null;
  frames = [];
  currentTabId = null;
}
