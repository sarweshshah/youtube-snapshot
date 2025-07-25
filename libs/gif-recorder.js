// GIF Recorder functionality using gif.js
class GIFRecorder {
    constructor() {
        this.recording = false;
        this.frames = [];
        this.gif = null;
        this.frameCount = 0;
        this.startTime = null;
        this.workerBlobUrl = null;
        this.isCancelled = false;
        this.canvas = null; // Reusable canvas
        this.ctx = null;    // Reusable context
        this.initializeWorker();
    }

    async initializeWorker() {
        try {
            // Fetch the worker script
            const response = await fetch(chrome.runtime.getURL('libs/gif.worker.js'));
            const workerScript = await response.text();
            
            // Create a blob URL for the worker script
            const blob = new Blob([workerScript], { type: 'application/javascript' });
            this.workerBlobUrl = URL.createObjectURL(blob);
        } catch (error) {
            console.error('Error initializing worker script:', error);
        }
    }

    startRecording(video) {
        if (this.recording || !this.workerBlobUrl) return;

        this.recording = true;
        this.frames = [];
        this.frameCount = 0;
        this.startTime = Date.now();

        // Create reusable canvas/context sized to video
        this.canvas = document.createElement('canvas');
        this.canvas.width = video.videoWidth;
        this.canvas.height = video.videoHeight;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        try {
            // Create new GIF instance
            this.gif = new GIF({
                workers: 2,
                quality: 10,
                width: video.videoWidth,
                height: video.videoHeight,
                workerScript: this.workerBlobUrl
            });

            // Start frame capture
            this.captureFrame(video);
        } catch (error) {
            console.error('Error creating GIF instance:', error);
            this.recording = false;
        }
    }

    stopRecording() {
        // Check if recording is in progress
        if (!this.recording) return;
        
        // Stop the recording process
        this.recording = false;
        this.isCancelled = false;
        
        try {
            // Get video element and prepare metadata for filename
            const video = document.querySelector('video');
            const videoTitle = this.getTitleFromHeadTag();
            const formattedTime = this.formatTime(video.currentTime);
            
            // Set up progress tracking for GIF generation
            this.gif.on('progress', (p) => {
                if (this.isCancelled) return;
                // Emit progress event to notify UI of generation status
                const event = new CustomEvent('gifProgress', { detail: p });
                document.dispatchEvent(event);
            });

            // Handle GIF generation completion
            this.gif.on('finished', (blob) => {
                if (this.isCancelled) return;
                // Create and trigger download with formatted filename
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${videoTitle} [${formattedTime}].gif`;
                link.click();
                
                // Clean up resources
                URL.revokeObjectURL(link.href);
                this.frames = [];
                this.gif = null;

                // Notify UI that GIF generation is complete
                const event = new CustomEvent('gifFinished');
                document.dispatchEvent(event);
            });

            // Start the GIF rendering process
            this.gif.render();
        } catch (error) {
            console.error('Error rendering GIF:', error);
        }
    }

    captureFrame(video) {
        if (!this.recording) return;

        try {
            // Reuse canvas/context
            this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);

            // Add frame to GIF (10fps = 100ms delay)
            this.gif.addFrame(this.ctx, { copy: true, delay: 100 });
            this.frameCount++;

            // Schedule next frame capture (100ms interval)
            setTimeout(() => this.captureFrame(video), 100);
        } catch (error) {
            console.error('Error capturing frame:', error);
            this.recording = false;
        }
    }

    getTitleFromHeadTag() {
        let title = document.title.replace(/^\(\d+\)\s*/, '');
        return title.endsWith(' - YouTube') ? title.replace(' - YouTube', '') : title.trim();
    }

    formatTime(seconds) {
        const date = new Date(0);
        date.setSeconds(seconds);
        return date.toISOString().substring(11, 19).replace(/:/g, '.');
    }

    isRecording() {
        return this.recording;
    }

    getFrameCount() {
        return this.frameCount;
    }

    getDuration() {
        return this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
    }

    cancelRecording() {
        if (!this.recording && !this.gif) return;
        
        // Mark as cancelled to prevent finished event from triggering
        this.isCancelled = true;
        
        // Stop the recording process
        this.recording = false;
        
        // Clean up resources
        if (this.gif) {
            this.gif.abort();
            this.gif = null;
        }
        this.frames = [];
        this.frameCount = 0;
        this.startTime = null;
        this.canvas = null;
        this.ctx = null;
    }
}

// Expose GIFRecorder to global scope
window.GIFRecorder = GIFRecorder; 