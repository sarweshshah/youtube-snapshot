// background.js - Service worker: extension install, iframe injection, offscreen doc management

chrome.runtime.onInstalled.addListener(() => {
  console.log("YouTube Snapshot Extension installed!");
});

// --- Iframe script injection ---

if (chrome.webNavigation && chrome.webNavigation.onCompleted) {
  chrome.webNavigation.onCompleted.addListener(
    (details) => {
      if (details.frameId !== 0 && details.url.includes("youtube.com/embed")) {
        setTimeout(() => {
          chrome.scripting.executeScript({
            target: {
              tabId: details.tabId,
              frameIds: [details.frameId],
            },
            files: ["js/content.js"],
          });
        }, 500);
      }
    },
    {
      url: [{ urlContains: "youtube.com/embed" }],
    },
  );
} else {
  console.warn(
    "chrome.webNavigation API is unavailable. Ensure 'webNavigation' permission is set in manifest.json.",
  );
}

// --- Offscreen document management ---

async function ensureOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  if (contexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: "html/offscreen.html",
    reasons: ["WORKERS"],
    justification: "GIF encoding requires Web Workers blocked by page CSP",
  });

  // Allow offscreen document scripts to initialize before returning
  await new Promise((r) => setTimeout(r, 100));
}

// --- Message relay between offscreen doc and content script tabs ---

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Messages targeted at the offscreen doc — skip entirely in the service worker
  if (msg.target === "offscreen") return;

  if (msg.type === "create-offscreen") {
    ensureOffscreenDocument()
      .then(() => sendResponse({ ready: true, tabId: sender.tab?.id }))
      .catch((err) => sendResponse({ ready: false, error: err.message }));
    return true;
  }

  // Relay progress/result/error from offscreen doc back to the content script tab
  if (
    msg.type === "gif-progress" ||
    msg.type === "gif-finished" ||
    msg.type === "gif-error"
  ) {
    if (msg.tabId) {
      chrome.tabs.sendMessage(msg.tabId, msg);
    }
  }
});
