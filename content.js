function addSnapshotButton() {
    const controls = document.querySelector('.ytp-right-controls');
    if (!controls) {
        setTimeout(addSnapshotButton, 1000); // Retry until controls are found
        return;
    }

    if (document.getElementById('snapshotButton')) return;

    const snapshotButton = document.createElement('button');
    snapshotButton.id = 'snapshotButton';
    snapshotButton.className = "snapshotButton ytp-button";
    snapshotButton.innerHTML = '📸';
    snapshotButton.title = 'Take Snapshot';
    controls.insertBefore(snapshotButton, controls.firstChild);

    // Style the button (optional)
    snapshotButton.style.position = 'relative';
    snapshotButton.style.bottom = '0px';
    snapshotButton.style.right = '0px';
    snapshotButton.style.cssFloat = "left";
    // Add more styles as needed

    snapshotButton.addEventListener('click', () => {
        const video = document.querySelector('video');
        if (!video) return;

        // Fetch user preferences from Chrome's local storage
        chrome.storage.local.get(['filename', 'format'], (result) => {
            const filename = result.filename || 'snapshot';
            const format = result.format || 'png';

            // Create a canvas and capture the current video frame
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert canvas to the selected format
            const dataURL = canvas.toDataURL(`image/${format}`);
            
            // Create a download link for the snapshot
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = `${filename}.${format}`;
            link.click();
        });
    });
}

addSnapshotButton();