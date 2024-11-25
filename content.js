let currentShortcutKey = 's'; // Default shortcut key

// Inject the snapshot button immediately when the script loads
injectButton();

// Load user settings, observe the page, and inject button
window.onload = function () {
    loadUserSettings();             // Load initial user settings
    observePage();                  // Start observing for dynamic content changes
    injectButton();                 // Inject the button initially when the page loads
    addKeyboardShortcut();          // Set up the keyboard shortcut listener
    listenForShortcutChanges();     // Listen for changes to the shortcut key
};

// Load user settings or apply default settings
function loadUserSettings() {
    chrome.storage.sync.get(['saveAsFile', 'saveToClipboard', 'shortcutKey', 'fileFormat', 'playSound'], (data) => {
        // Apply default settings if none are found
        if (data.saveAsFile === undefined) {
            chrome.storage.sync.set({ saveAsFile: true });  // Default: Save as File is enabled
        }
        if (data.saveToClipboard === undefined) {
            chrome.storage.sync.set({ saveToClipboard: false });  // Default: Save to Clipboard is disabled
        }
        currentShortcutKey = data.shortcutKey || currentShortcutKey;
        // Default file format is PNG
        chrome.storage.sync.set({ fileFormat: data.fileFormat || 'png' });
    });
}

// Watch for DOM changes (for YouTube's dynamic content)
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
            if (document.querySelector('.ytp-right-controls')) {
                injectButton(); // Re-inject the button if controls change
            }
        }
    }
});

// Start observing the YouTube page for changes
function observePage() {
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
}

// Inject the snapshot button into YouTube player controls
function injectButton() {
    const controls = document.querySelector('.ytp-right-controls');

    if (!controls || document.getElementById('snapshotButton')) return; // Avoid duplicate buttons

    // Create the snapshot button
    const snapshotButton = document.createElement('button');
    snapshotButton.id = 'snapshotButton';
    snapshotButton.title = 'Take Snapshot';
    
    // Style the button to ensure proper dimensions and visibility
    snapshotButton.style.width = 'auto';   // Adjust button size
    snapshotButton.style.height = '100%';
    snapshotButton.style.border = 'none';  // Remove default border
    snapshotButton.style.background = 'transparent';  // Transparent background
    snapshotButton.style.cursor = 'pointer';  // Pointer cursor for interactivity
    snapshotButton.style.padding = '0';
    snapshotButton.style.marginRight = '16px';
    snapshotButton.onmouseover = () => snapshotButton.style.opacity = 0.8;
    snapshotButton.onmouseout = () => snapshotButton.style.opacity = 1;

    // Create the img element for the button icon
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icons/snapshot-icon.png');  // Updated image path
    img.style.width = 'auto';  // Make image fill the button
    img.style.height = '50%';
    img.style.display = 'block';  // Remove inline image spacing issue

    // Insert the image inside the button
    snapshotButton.appendChild(img);

    // Insert the button into the YouTube controls
    controls.insertBefore(snapshotButton, controls.firstChild);

    // Add click event to capture video frame
    snapshotButton.addEventListener('click', takeSnapshot);
}

// Add initial keyboard shortcut listener
function addKeyboardShortcut() {
    document.addEventListener('keypress', handleKeyPress);
}

// Handle keypress events based on the configured shortcut
function handleKeyPress(event) {
    if (event.key.toLowerCase() === currentShortcutKey) {
        takeSnapshot();
    }
}

// Listen for changes to the shortcut key in chrome.storage
function listenForShortcutChanges() {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.shortcutKey) {
            // Update the current shortcut key
            currentShortcutKey = changes.shortcutKey.newValue || currentShortcutKey;
        }
    });
}

// Function to capture the snapshot (shared by both button click and keyboard shortcut)
function takeSnapshot() {
    const ytvideo = document.querySelector('video');
    if (!ytvideo) return;

    // Fetch YouTube video title from <title> tag in <head>
    const videoTitle = getTitleFromHeadTag();

    // Get the current time of the video
    const currentTime = ytvideo.currentTime;
    const formattedTime = formatTime(currentTime);

    // Sanitize the video title to make it filename-friendly
    const sanitizedTitle = videoTitle.trim();

    chrome.storage.sync.get(['fileFormat', 'saveAsFile', 'saveToClipboard'], (data) => {
        const format = data.fileFormat || 'png';
        const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
        const extension = format === 'jpg' ? 'jpg' : 'png';

        // Generate a dynamic filename with the chosen extension
        const filename = `${sanitizedTitle} [${formattedTime}].${extension}`;

        // Create a canvas and capture the current video frame
        const canvas = document.createElement('canvas');
        canvas.width = ytvideo.videoWidth;
        canvas.height = ytvideo.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(ytvideo, 0, 0, canvas.width, canvas.height);

        // Convert canvas to image in the selected format
        const dataURL = canvas.toDataURL(mimeType);

        // Check if the user wants to save the image as a file or to the clipboard
        chrome.storage.sync.get(['saveAsFile', 'saveToClipboard'], (data) => {
            if (data.saveAsFile) {
                // Save the image as a file
                const link = document.createElement('a');
                link.href = dataURL;
                link.download = filename;  // Use generated filename with the correct extension
                link.click();
            }

            if (data.saveToClipboard) {
                // Save the image to the clipboard
                saveImageToClipboard(canvas);
            }

            // Check if the sound option is enabled and play the sound
            chrome.storage.sync.get(['playSound'], (data) => {
                if (data.playSound !== false) { // Default to true
                    const audio = new Audio(chrome.runtime.getURL('audio/download-sound.mp3'));
                    audio.play().catch(error => console.error("Error playing sound:", error));
                }
            });
        });
    });
}

// Function to save image to the clipboard
async function saveImageToClipboard(canvas) {
    try {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve));
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        // alert("Snapshot copied to clipboard!");

        // Create a temporary alert message
        const alertBox = document.createElement('div');
        alertBox.textContent = "Snapshot copied to clipboard!";
        alertBox.style.fontSize = "14px"
        alertBox.style.position = 'fixed';
        alertBox.style.bottom = '20px';
        alertBox.style.right = '20px';
        alertBox.style.backgroundColor = '#333';
        alertBox.style.color = '#fff';
        alertBox.style.padding = '12px 24px';
        alertBox.style.borderRadius = '8px';
        alertBox.style.zIndex = '1000';
        document.body.appendChild(alertBox);

        // Remove the alert message after 3 seconds
        setTimeout(() => { alertBox.remove(); }, 3000);
        
    } catch (err) {
        console.error("Failed to copy image to clipboard: ", err);
    }
}

// Function to fetch the video title from the <title> tag
function getTitleFromHeadTag() {
    let title = document.title;

    // Remove leading notification count, e.g., (2) from the title
    title = title.replace(/^\(\d+\)\s*/, '');

    // YouTube usually appends " - YouTube" to the title, so we strip it off
    if (title.endsWith(' - YouTube')) {
        title = title.replace(' - YouTube', '');
    }

    return title.trim();  // Return the cleaned-up title
}

// Helper function to format time as HH-MM-SS
function formatTime(seconds) {
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substring(11, 19).replace(/:/g, '.');  // Format as HH.MM.SS
}