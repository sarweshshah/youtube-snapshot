// background.js - Service worker: extension install, iframe injection, offscreen doc management

chrome.runtime.onInstalled.addListener(() => {
  console.log("YouTube Snapshot Extension installed!");
});

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

  await new Promise((r) => setTimeout(r, 100));
}

// --- Message relay between offscreen doc and content script tabs ---

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Messages targeted at the offscreen doc are delivered directly by the
  // runtime — the service worker must not re-send them or they get doubled.
  if (msg.target === "offscreen") return;

  if (msg.type === "inject-gif-recorder") {
    if (!sender.tab?.id) {
      sendResponse({ ok: false, error: "No tab" });
      return;
    }
    chrome.scripting
      .executeScript({
        target: { tabId: sender.tab.id },
        files: ["js/libs/gif-recorder.js"],
      })
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "create-offscreen") {
    ensureOffscreenDocument()
      .then(() => sendResponse({ ready: true, tabId: sender.tab?.id }))
      .catch((err) => sendResponse({ ready: false, error: err.message }));
    return true;
  }

  // Relay progress/result/error from offscreen doc back to the content script tab
  if (
    msg.type === "gif-progress" ||
    msg.type === "gif-chunk" ||
    msg.type === "gif-error"
  ) {
    if (msg.tabId) {
      chrome.tabs.sendMessage(msg.tabId, msg);
    }
  }
});
