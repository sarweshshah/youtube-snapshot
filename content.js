let currentShortcutKey = 's'; // Default shortcut key
let gifRecorder = new GIFRecorder(); // Initialize GIF recorder
let currentNotification = null;

// Inject the snapshot button immediately when the script loads
injectButton();

// Load user settings, observe the page, and inject button
window.onload = function () {
    console.log('Window loaded, initializing...');
    loadUserSettings();             // Load initial user settings
    observePage();                  // Start observing for dynamic content changes
    injectButton();                 // Inject the button initially when the page loads
    setupKeyboardShortcut();        // Set up dynamic keypress functionality
};

// Load user settings or apply default settings
function loadUserSettings() {
    chrome.storage.sync.get(['saveAsFile', 'saveToClipboard', 'enableKeypress', 'shortcutKey', 'fileFormat', 'playSound'], (data) => {
        // Apply default settings if none are found
        if (data.saveAsFile === undefined) {
            chrome.storage.sync.set({ saveAsFile: true });  // Default: Save as File is enabled
        }
        if (data.saveToClipboard === undefined) {
            chrome.storage.sync.set({ saveToClipboard: false });  // Default: Save to Clipboard is disabled
        }
        if (data.enableKeypress === undefined) {
            chrome.storage.sync.set({ enableKeypress: true });  // Default: Enable keyboard shortcuts
        }
        currentShortcutKey = data.shortcutKey || currentShortcutKey;
        // Default file format is PNG
        chrome.storage.sync.set({ fileFormat: data.fileFormat || 'png' });
    });
}

// Watch for DOM changes (for YouTube's dynamic content)
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if ((mutation.type === 'childList' || mutation.type === 'attributes') && document.querySelector('.ytp-right-controls')) {
            injectButton(); // Re-inject the button if controls change
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
    Object.assign(snapshotButton.style, {
        width: 'auto',
        height: '100%',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: '0',
        marginRight: '16px'
    });

    snapshotButton.onmouseover = () => snapshotButton.style.opacity = 0.8;
    snapshotButton.onmouseout = () => snapshotButton.style.opacity = 1;

    // Create the img element for the button icon
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icons/snapshot-icon.png');  // Updated image path
    Object.assign(img.style, {
        width: 'auto',
        height: '50%',
        display: 'block'
    });

    // Insert the image inside the button
    snapshotButton.appendChild(img);

    // Insert the button into the YouTube controls
    controls.insertBefore(snapshotButton, controls.firstChild);

    // Add click event to capture video frame
    snapshotButton.addEventListener('click', takeSnapshot);
}

// Dynamically handle keypress shortcut functionality
function setupKeyboardShortcut() {
    let keypressListener;

    const updateKeypressListener = () => {
        // Remove the old listener
        if (keypressListener) {
            document.removeEventListener('keypress', keypressListener);
        }

        // Check for the current keypress setting
        chrome.storage.sync.get(['enableKeypress', 'shortcutKey'], (data) => {
            // Always enable keyboard shortcuts
            const isEnabled = true; // Force enable keyboard shortcuts
            const shortcutKey = data.shortcutKey || 's';

            keypressListener = (event) => {
                const ytvideo = document.querySelector('video');
                if (!ytvideo) return;

                if (event.key.toLowerCase() === shortcutKey) {
                    takeSnapshot();
                } else if (event.key.toLowerCase() === 'g') {
                    handleGifRecording(ytvideo);
                }
            };
            document.addEventListener('keypress', keypressListener);
        });
    };

    // Initial setup
    updateKeypressListener();

    // Listen for changes to enableKeypress or shortcutKey
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && (changes.enableKeypress || changes.shortcutKey)) {
            updateKeypressListener();
        }
    });
}

// Handle GIF recording
function handleGifRecording(video) {
    if (!gifRecorder.isRecording()) {
        gifRecorder.startRecording(video);
        showNotification('GIF recording started...', 'info');
    } else {
        gifRecorder.stopRecording();
        const progressBox = showNotification('Processing GIF...', 'progress', 0);
        
        // Update progress message when GIF is ready
        gifRecorder.gif.on('progress', (p) => {
            if (currentNotification === progressBox) {
                progressBox.textContent = `Processing GIF... ${Math.round(p * 100)}%`;
            }
        });

        gifRecorder.gif.on('finished', () => {
            if (currentNotification === progressBox) {
                progressBox.remove();
                currentNotification = null;
                showNotification('GIF saved successfully!', 'info');
            }
        });
    }
}

// Show notification
function showNotification(message, type = 'info', duration = 3000) {
    // Remove previous notification if it exists
    if (currentNotification) {
        currentNotification.remove();
        currentNotification = null;
    }

    const alertBox = document.createElement('div');
    alertBox.textContent = message;
    Object.assign(alertBox.style, {
        fontSize: "14px",
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: type === 'info' ? '#333' : '#ff4444',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '8px',
        zIndex: '1000',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        opacity: '0',
        transition: 'opacity 0.3s ease-in-out'
    });

    if (type === 'progress') {
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        Object.assign(spinner.style, {
            width: '12px',
            height: '12px',
            border: '2px solid #fff',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        });

        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        alertBox.insertBefore(spinner, alertBox.firstChild);
    }

    document.body.appendChild(alertBox);
    
    // Trigger reflow to enable transition
    alertBox.offsetHeight;
    alertBox.style.opacity = '1';

    currentNotification = alertBox;

    if (duration > 0) {
        setTimeout(() => {
            if (currentNotification === alertBox) {
                alertBox.style.opacity = '0';
                setTimeout(() => {
                    if (currentNotification === alertBox) {
                        alertBox.remove();
                        currentNotification = null;
                    }
                }, 300);
            }
        }, duration);
    }
    return alertBox;
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

        // Handle save-to-file and clipboard options
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
}

// Function to save image to the clipboard
async function saveImageToClipboard(canvas) {
    try {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve));
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        showNotification("Snapshot copied to clipboard!");
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