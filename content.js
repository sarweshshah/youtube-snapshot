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
    // snapshotButton.innerHTML = "📸"

    // Style the button to ensure proper dimensions and visibility
    snapshotButton.style.width = '36px';   // Adjust button size
    snapshotButton.style.height = '36px';
    snapshotButton.style.border = 'none';  // Remove default border
    snapshotButton.style.background = 'transparent';  // Transparent background
    snapshotButton.style.cursor = 'pointer';  // Pointer cursor for interactivity
    snapshotButton.style.padding = '0';    // Remove default padding
    snapshotButton.style.margin = '0';     // Ensure no margin

    // Create the img element for the button icon
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icons/snapshot-icon.png');  // Updated image path
    img.style.width = '100%';  // Make image fill the button
    img.style.height = '100%';
    img.style.display = 'block';  // Remove inline image spacing issue

    // Insert the image inside the button
    snapshotButton.appendChild(img);

    // Insert the button into the YouTube controls
    controls.insertBefore(snapshotButton, controls.firstChild);

    // Add click event to capture video frame
    snapshotButton.addEventListener('click', () => {
        const ytvideo = document.querySelector('video');
        if (!ytvideo) return;

        // Create a canvas and capture the current video frame
        const canvas = document.createElement('canvas');
        canvas.width = ytvideo.videoWidth;
        canvas.height = ytvideo.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(ytvideo, 0, 0, canvas.width, canvas.height);

        // Convert canvas to image and trigger download
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'snapshot.png';  // Use fixed default filename
        link.click();
    });
}

// Run the function to inject the button
addSnapshotButton();