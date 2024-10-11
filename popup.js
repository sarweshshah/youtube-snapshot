document.addEventListener('DOMContentLoaded', () => {
    const filenameInput = document.getElementById('filename');
    const formatSelect = document.getElementById('format');
    const saveButton = document.getElementById('saveButton');

    // Load saved settings from storage
    chrome.storage.local.get(['filename', 'format'], (result) => {
        if (result.filename) filenameInput.value = result.filename;
        if (result.format) formatSelect.value = result.format;
    });

    // Save settings on button click
    saveButton.addEventListener('click', () => {
        const filename = filenameInput.value || 'snapshot';
        const format = formatSelect.value;

        chrome.storage.local.set({
            filename: filename,
            format: format
        }, () => {
            alert('Settings saved!');
        });
    });
});