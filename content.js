'use strict'

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
    // snapshotButton.className = "snapshotButton ytp-button";
    snapshotButton.title = 'Take Snapshot';

    // Style the button with an image (camera icon)
    snapshotButton.style.backgroundImage = 'url("' + chrome.runtime.getURL('icons/snapshot.png') + '")';
    snapshotButton.style.backgroundSize = 'contain';
    snapshotButton.style.backgroundRepeat = 'no-repeat';
    snapshotButton.style.backgroundPosition = 'center';
    snapshotButton.style.width = '50px';  // Set button size
    snapshotButton.style.height = '50px';
    snapshotButton.style.border = 'none';
    snapshotButton.style.cursor = 'pointer';
    snapshotButton.style.padding = '0';
    snapshotButton.style.margin = '0';
    
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