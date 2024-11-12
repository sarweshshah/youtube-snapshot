document.addEventListener('DOMContentLoaded', () => {
    const fileOption = document.getElementById('fileOption');
    const clipboardOption = document.getElementById('clipboardOption');
    const shortcutInput = document.getElementById('shortcutInput');
    const formatOption = document.getElementById('formatOption');
    const formatSetting = document.getElementById('formatSetting');
    const versionElement = document.getElementById('version');
    const soundOption = document.getElementById('soundOption');

    // Show or hide format option based on "Save as File" checkbox state
    const toggleFormatOption = () => {
        formatSetting.style.display = fileOption.checked ? 'flex' : 'none';
        formatSetting.style.marginTop = fileOption.checked ? '8px' : '0px'; // Adjust margin-top
    };

    // Load saved preferences from chrome.storage, with error handling
    try {
        chrome.storage.sync.get(['saveAsFile', 'saveToClipboard', 'shortcutKey', 'fileFormat', 'playSound'], (data) => {
            if (chrome.runtime.lastError) {
                console.error("Error accessing chrome.storage:", chrome.runtime.lastError);
                return;
            }
            
            fileOption.checked = data.saveAsFile !== undefined ? data.saveAsFile : true; // Default to true
            clipboardOption.checked = data.saveToClipboard || false; // Default to false
            shortcutInput.value = data.shortcutKey || 's'; // Default shortcut is 's'
            formatOption.value = data.fileFormat || 'png'; // Default format is PNG
            soundOption.checked = data.playSound !== false; // Default to true
    
            toggleFormatOption(); // Ensure proper visibility based on saved state
        });
    } catch (error) {
        console.error("Error with chrome.storage access:", error);
    }

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

    soundOption.addEventListener('change', () => {
        chrome.storage.sync.set({ playSound: soundOption.checked });
    });

    // Get the version from manifest.json and display it in the popup
    const manifestData = chrome.runtime.getManifest();
    versionElement.textContent = manifestData.version;
});