document.addEventListener('DOMContentLoaded', () => {
    const fileOption = document.getElementById('fileOption');
    const clipboardOption = document.getElementById('clipboardOption');

    // Load saved preferences from chrome storage
    chrome.storage.sync.get(['saveAsFile', 'saveToClipboard'], (data) => {
        fileOption.checked = data.saveAsFile !== undefined ? data.saveAsFile : true; // Default to true
        clipboardOption.checked = data.saveToClipboard || false; // Default to false
    });

    // Save preferences when checkboxes are toggled
    fileOption.addEventListener('change', () => {
        chrome.storage.sync.set({
            saveAsFile: fileOption.checked
        });
    });

    clipboardOption.addEventListener('change', () => {
        chrome.storage.sync.set({
            saveToClipboard: clipboardOption.checked
        });
    });
});