document.addEventListener('DOMContentLoaded', () => {
    const fileOption = document.getElementById('fileOption');
    const clipboardOption = document.getElementById('clipboardOption');
    const shortcutInput = document.getElementById('shortcutInput');
    const formatOption = document.getElementById('formatOption');
  
    // Load saved preferences from chrome.storage
    chrome.storage.sync.get(['saveAsFile', 'saveToClipboard', 'shortcutKey', 'fileFormat'], (data) => {
      fileOption.checked = data.saveAsFile !== undefined ? data.saveAsFile : true; // Default to true
      clipboardOption.checked = data.saveToClipboard || false; // Default to false
      shortcutInput.value = data.shortcutKey || 's'; // Default shortcut is 's'
      formatOption.value = data.fileFormat || 'png'; // Default format is PNG
    });
  
    // Save preferences when checkboxes or dropdowns are changed
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
  
    // Save shortcut when input changes
    shortcutInput.addEventListener('input', () => {
      const newShortcut = shortcutInput.value.trim().toLowerCase();
      if (newShortcut.length === 1) {
        chrome.storage.sync.set({ shortcutKey: newShortcut });
      }
    });
  
    formatOption.addEventListener('change', () => {
      chrome.storage.sync.set({ fileFormat: formatOption.value });
    });
  });