// Log a message when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
    console.log('YouTube Snapshot Extension installed!');
});

// Ensure webNavigation is available for iframe handling
if (chrome.webNavigation && chrome.webNavigation.onCompleted) {
    chrome.webNavigation.onCompleted.addListener((details) => {
        // Inject only into iframes with YouTube embedded videos
        if (details.frameId !== 0 && details.url.includes('youtube.com/embed')) {
            setTimeout(() => {
                chrome.scripting.executeScript({
                    target: { tabId: details.tabId, frameIds: [details.frameId] },
                    files: ['content.js']
                });
            }, 500);  // 500ms delay to ensure iframe has fully loaded
        }
    }, { url: [{ urlContains: 'youtube.com/embed' }] });
} else {
    console.warn("chrome.webNavigation API is unavailable. Ensure 'webNavigation' permission is set in manifest.json.");
}