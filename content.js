'use strict'

// Wait for the YouTube video player to load
const waitForPlayer = setInterval(() => {
    const ytvideo = document.querySelector('video');
    if (ytvideo) {
        clearInterval(waitForPlayer);
        addSnapshotButton();
    }
}, 100);

// Wait for the video player to load
function addSnapshotButton() {
    const controls = document.querySelector('.ytp-right-controls');
    if (!controls) {
        setTimeout(addSnapshotButton, 1000); // Retry until controls are found
        return;
    }

    // Check if the button is already added
    if (document.getElementById('snapshotButton')) return;

    // Create the snapshot button
    const snapshotButton = document.createElement('button');
    snapshotButton.id = 'snapshotButton';
    snapshotButton.className = "snapshotButton ytp-button";
    snapshotButton.innerHTML = '📸'; // Emoji for camera icon
    // snapshotButton.style.backgroundImage = 'url("icons/your-icon.png")';
    snapshotButton.title = 'Take Snapshot';

    // Style the button (optional)
    // snapshotButton.style.cssFloat = "left";
    // Add more styles as needed
    
    // Add the button to the controls
    controls.insertBefore(snapshotButton, controls.firstChild);

    // Add click event to capture video frame
    snapshotButton.addEventListener('click', () => {
        const ytvideo = document.querySelector('video');
        if (!ytvideo) return;

        // Create a canvas and draw the current frame
        const canvas = document.createElement('canvas');
        canvas.width = ytvideo.videoWidth;
        canvas.height = ytvideo.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(ytvideo, 0, 0, canvas.width, canvas.height);

        // Convert canvas to image and trigger download
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'snapshot.png';
        link.click();
    });
}

// Run the function to inject the button
addSnapshotButton();