document.addEventListener('DOMContentLoaded', () => {
    const fileOption = document.getElementById('fileOption');
    const clipboardOption = document.getElementById('clipboardOption');
    const shortcutInput = document.getElementById('shortcutInput');
    const formatOption = document.getElementById('formatOption');
    const formatSetting = document.getElementById('formatSetting');
    const versionElement = document.getElementById('version');

    // Show or hide format option based on "Save as File" checkbox state
    const toggleFormatOption = () => {
        formatSetting.style.display = fileOption.checked ? 'flex' : 'none';
        formatSetting.style.marginTop = fileOption.checked ? '8px' : '0px'; // Adjust margin-top
    };

    // Load saved preferences from chrome.storage
    chrome.storage.sync.get(['saveAsFile', 'saveToClipboard', 'shortcutKey', 'fileFormat'], (data) => {
        fileOption.checked = data.saveAsFile !== undefined ? data.saveAsFile : true; // Default to true
        clipboardOption.checked = data.saveToClipboard || false; // Default to false
        shortcutInput.value = data.shortcutKey || 's'; // Default shortcut is 's'
        formatOption.value = data.fileFormat || 'png'; // Default format is PNG

        toggleFormatOption(); // Ensure proper visibility based on saved state
    });

    // Save preferences when checkboxes or dropdowns are changed
    fileOption.addEventListener('change', () => {
        chrome.storage.sync.set({
            saveAsFile: fileOption.checked
        });
        toggleFormatOption(); // Update visibility and margin of file format option
    });

    clipboardOption.addEventListener('change', () => {
        chrome.storage.sync.set({
            saveToClipboard: clipboardOption.checked
        });
    });

    shortcutInput.addEventListener('input', () => {
        const newShortcut = shortcutInput.value.trim().toLowerCase();
        if (newShortcut.length === 1) {
            chrome.storage.sync.set({ shortcutKey: newShortcut });
        }
    });

    formatOption.addEventListener('change', () => {
        chrome.storage.sync.set({ fileFormat: formatOption.value });
    });

    // Get the version from manifest.json and display it in the popup
    const manifestData = chrome.runtime.getManifest();
    versionElement.textContent = manifestData.version;
});