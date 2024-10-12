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
    snapshotButton.innerHTML = '📸'; // Emoji for camera icon
    snapshotButton.title = 'Take Snapshot';

    // Style the button (optional)
    snapshotButton.style.position = 'relative';
    snapshotButton.style.bottom = 'Opx';
    snapshotButton.style.right = 'Opx';
    snapshotButton.style.cssFloat = "left";
    // Add more styles as needed

    // Add the button to the controls
    controls.insertBefore(snapshotButton, controls.firstChild);

    // Add click event to capture video frame
    snapshotButton.addEventListener('click', () => {
        const video = document.querySelector('video');
        if (!video) return;

        // Create a canvas and draw the current frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to image and trigger download
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'snapshot.png';
        link.click();
    });
}

// Run the function to inject the button
addSnapshotButton();