'use strict'

// Wait for the YouTube video player to load
const waitForPlayer = setInterval(() => {
    const ytvideo = document.querySelector('video');
    if (ytvideo) {
        clearInterval(waitForPlayer);
        addSnapshotButton(ytvideo);
    }
}, 100);

// Function to add the snapshot button
function addSnapshotButton(video) {
    // Create the button element
    const snapshotButton = document.createElement('button');
    snapshotButton.className = "snapshotButton ytp-button";
    snapshotButton.style.backgroundImage = 'url("icons/your-icon.png")';

    // Style the button (optional)
    snapshotButton.style.position = 'relative';
    snapshotButton.style.bottom = '20px';
    snapshotButton.style.right = '20px';
    snapshotButton.style.cssFloat = "left";
    // Add more styles as needed
 
    // Add click event listener
    snapshotButton.addEventListener('click', () => takeSnapshot(video));

    // Append the button to the video player's container
    video.parentElement.appendChild(snapshotButton);
}

// Function to capture the snapshot and trigger download
function takeSnapshot(video) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to image data URL
    const imageDataURL = canvas.toDataURL('image/png');

    // Get the video title 
    const videoTitleElement = document.querySelector('.title yt-formatted-string'); // Adjust the selector if needed
    const videoTitle = videoTitleElement ? videoTitleElement.textContent.trim() : 'Untitled Video';

    // Sanitize the video title for filename safety 
    const safeTitle = videoTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
    // Get the current time in milliseconds
    const currentTimeMs = Math.floor(video.currentTime * 1000);
  
    // Create a temporary link to trigger the download
    const downloadLink = document.createElement('a');
    downloadLink.href = imageDataURL;
    downloadLink.download = `${safeTitle}-${currentTimeMs}.png`; // Updated filename
    downloadLink.click();
  }