// popup.js - Handles the extension popup UI and user settings

document.addEventListener('DOMContentLoaded', () => {
    // Get references to DOM elements
    const fileOption = document.getElementById('fileOption');
    const clipboardOption = document.getElementById('clipboardOption');
    const keypressOption = document.getElementById('keypressOption');
    const shortcutInput = document.getElementById('shortcutInput');
    const formatOption = document.getElementById('formatOption');
    const formatSetting = document.getElementById('formatSetting');
    const versionElement = document.getElementById('version');
    const soundOption = document.getElementById('soundOption');

    // Show or hide file format option based on "Save as File" checkbox state
    const toggleFormatOption = () => {
        formatSetting.style.display = fileOption.checked ? 'flex' : 'none';
        formatSetting.style.marginTop = fileOption.checked ? '8px' : '0px'; // Adjust margin-top
    };

    // Load saved preferences from chrome.storage and update UI
    try {
        chrome.storage.sync.get([
            'saveAsFile', 'saveToClipboard', 'enableKeypress',
            'shortcutKey', 'fileFormat', 'playSound'
        ], (data) => {
            if (chrome.runtime.lastError) {
                console.error("Error accessing chrome.storage:", chrome.runtime.lastError);
                return;
            }
            // Set UI state based on stored preferences, or use defaults
            fileOption.checked = data.saveAsFile ?? true;
            clipboardOption.checked = data.saveToClipboard ?? true;
            formatOption.value = data.fileFormat ?? 'png';
            soundOption.checked = data.playSound ?? true;
            keypressOption.checked = data.enableKeypress ?? false;
            shortcutInput.value = data.shortcutKey ?? 's';
            // Disable shortcut input unless keypress option is checked
            shortcutInput.disabled = !keypressOption.checked;
            toggleFormatOption(); // Ensure proper visibility based on saved state
        });
    } catch (error) {
        console.error("Error with chrome.storage access:", error);
    }

    // Save preferences when checkboxes or dropdowns are changed
    fileOption.addEventListener('change', () => {
        chrome.storage.sync.set({ saveAsFile: fileOption.checked });
        toggleFormatOption(); // Update visibility and margin of file format option
    });

    clipboardOption.addEventListener('change', () => {
        chrome.storage.sync.set({ saveToClipboard: clipboardOption.checked });
    });

    // Save keypress option and enable/disable shortcut input
    keypressOption.addEventListener('change', () => {
        const isEnabled = keypressOption.checked;
        chrome.storage.sync.set({ enableKeypress: isEnabled });
        shortcutInput.disabled = !isEnabled; // Enable/Disable input field
    });

    // Save shortcut key when input is changed (only allow single lowercase letter)
    shortcutInput.addEventListener('input', () => {
        const newShortcut = shortcutInput.value.trim().toLowerCase();
        if (/^[a-z]$/.test(newShortcut)) {
            chrome.storage.sync.set({ shortcutKey: newShortcut });
        } else {
            shortcutInput.value = ""; // Clear invalid input
        }
    });

    formatOption.addEventListener('change', () => {
        chrome.storage.sync.set({ fileFormat: formatOption.value });
    });

    soundOption.addEventListener('change', () => {
        chrome.storage.sync.set({ playSound: soundOption.checked });
    });

    // Display the extension version in the popup
    const manifestData = chrome.runtime.getManifest();
    versionElement.textContent = manifestData.version;
});