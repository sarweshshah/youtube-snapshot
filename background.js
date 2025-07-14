// background.js - Handles extension installation and iframe script injection

// Log a message when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
    console.log('YouTube Snapshot Extension installed!');
});

// Check if webNavigation API is available (required for iframe handling)
if (chrome.webNavigation && chrome.webNavigation.onCompleted) {
    chrome.webNavigation.onCompleted.addListener((details) => {
        // Only inject into iframes (not main frame) with YouTube embedded videos
        if (details.frameId !== 0 && details.url.includes('youtube.com/embed')) {
            // Delay injection to ensure iframe is fully loaded
            setTimeout(() => {
                chrome.scripting.executeScript({
                    target: { tabId: details.tabId, frameIds: [details.frameId] },
                    files: ['content.js']
                });
            }, 500); // 500ms delay
        }
    }, {
        url: [{ urlContains: 'youtube.com/embed' }]
    });
} else {
    // Warn if webNavigation API is missing (likely missing permission in manifest)
    console.warn("chrome.webNavigation API is unavailable. Ensure 'webNavigation' permission is set in manifest.json.");
}