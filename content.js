// Wait for the page to completely load before injecting the button
window.onload = function () {
    waitForControlsAndInject();
};

function waitForControlsAndInject() {
    const controls = document.querySelector('.ytp-right-controls');

    // If controls are not found, keep checking every 500ms
    if (!controls) {
        const intervalId = setInterval(() => {
            const controls = document.querySelector('.ytp-right-controls');
            if (controls) {
                clearInterval(intervalId);  // Stop checking once controls are found
                injectButton(controls);
            }
        }, 500);  // Retry every 500ms
    } else {
        // If controls are already available, inject the button immediately
        injectButton(controls);
    }
}

function injectButton(controls) {
    if (document.getElementById('snapshotButton')) return;  // Avoid duplicate buttons

    // Create the snapshot button
    const snapshotButton = document.createElement('button');
    snapshotButton.id = 'snapshotButton';
    snapshotButton.title = 'Take Snapshot';

    // Style the button to ensure proper dimensions and visibility
    snapshotButton.style.width = '48px';   // Adjust button size
    snapshotButton.style.height = '48px';
    snapshotButton.style.border = 'none';  // Remove default border
    snapshotButton.style.background = 'transparent';  // Transparent background
    snapshotButton.style.cursor = 'pointer';  // Pointer cursor for interactivity
    snapshotButton.style.padding = '0';    // Remove default padding
    snapshotButton.style.margin = '0';     // Ensure no margin
    snapshotButton.onmouseover = () => snapshotButton.style.opacity = 0.8;
    snapshotButton.onmouseout = () => snapshotButton.style.opacity = 1;

    // Create the img element for the button icon
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icons/snapshot-icon_1.png');  // Updated image path
    img.style.width = '50%';  // Make image fill the button
    img.style.height = '48%';
    img.style.display = 'block';  // Remove inline image spacing issue

    // Insert the image inside the button
    snapshotButton.appendChild(img);

    // Insert the button into the YouTube controls
    controls.insertBefore(snapshotButton, controls.firstChild);

    // Add click event to capture video frame
    snapshotButton.addEventListener('click', () => {
        const ytvideo = document.querySelector('video');
        if (!ytvideo) return;

        // Fetch YouTube video title from <title> tag in <head>
        const videoTitle = getTitleFromHeadTag();

        // Get the current time of the video
        const currentTime = ytvideo.currentTime;
        const formattedTime = formatTime(currentTime);

        // Sanitize the video title to make it filename-friendly
        // const sanitizedTitle = videoTitle.replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ');
        const sanitizedTitle = videoTitle.trim();

        // Generate a dynamic filename
        const filename = `${sanitizedTitle} [${formattedTime}].png`;

        // Create a canvas and capture the current video frame
        const canvas = document.createElement('canvas');
        canvas.width = ytvideo.videoWidth;
        canvas.height = ytvideo.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(ytvideo, 0, 0, canvas.width, canvas.height);

        // Convert canvas to image and trigger download
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = filename;  // Use generated filename
        link.click();
    });
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

// Run the function to inject the button
addSnapshotButton();