function addSnapshotButton() {
    const controls = document.querySelector('.ytp-right-controls');
    if (!controls) {
        setTimeout(addSnapshotButton, 1000);
        return;
    }

    if (document.getElementById('snapshotButton')) return;

    // Create the snapshot button
    const snapshotButton = document.createElement('button');
    snapshotButton.id = 'snapshotButton';
    snapshotButton.title = 'Take Snapshot';

    // Style the button to ensure proper dimensions and visibility
    snapshotButton.style.position = 'relative';
    snapshotButton.style.width = '48px';   // Adjust button size
    snapshotButton.style.height = '48px';
    snapshotButton.style.border = 'none';  // Remove default border
    snapshotButton.style.background = 'transparent';  // Transparent background
    snapshotButton.style.cursor = 'pointer';  // Pointer cursor for interactivity
    snapshotButton.style.padding = '0';    // Remove default padding
    snapshotButton.style.margin = '0';     // Ensure no margin

    // Create the img element for the button icon
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icons/snapshot-icon.png');  // Updated image path
    img.style.width = '50%';  // Make image fill the button
    img.style.height = '50%';
    img.style.display = 'flex';  // Remove inline image spacing issue

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
        const sanitizedTitle = videoTitle.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');

        // Generate a dynamic filename
        const filename = `${sanitizedTitle}_${formattedTime}.png`;

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
    return date.toISOString().substring(11, 19).replace(/:/g, '-');  // Format as HH-MM-SS
}

// Run the function to inject the button
addSnapshotButton();