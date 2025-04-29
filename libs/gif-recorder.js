// GIF Recorder functionality using gif.js
class GIFRecorder {
    constructor() {
        this.recording = false;
        this.frames = [];
        this.gif = null;
        this.frameCount = 0;
        this.startTime = null;
        this.workerBlobUrl = null;
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
        if (this.recording) return;
        
        if (!this.workerBlobUrl) {
            console.error('Worker script not initialized');
            return;
        }

        this.recording = true;
        this.frames = [];
        this.frameCount = 0;
        this.startTime = Date.now();
        
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
        if (!this.recording) return;
        
        this.recording = false;
        
        try {
            // Get video title and current time
            const videoTitle = this.getTitleFromHeadTag();
            const currentTime = document.querySelector('video').currentTime;
            const formattedTime = this.formatTime(currentTime);
            
            // Render the GIF
            this.gif.on('finished', (blob) => {
                // Create download link with formatted filename
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${videoTitle} [${formattedTime}].gif`;
                link.click();
                
                // Cleanup
                URL.revokeObjectURL(link.href);
                this.frames = [];
                this.gif = null;
            });

            this.gif.render();
        } catch (error) {
            console.error('Error rendering GIF:', error);
        }
    }

    captureFrame(video) {
        if (!this.recording) return;

        try {
            // Create canvas and capture frame
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Add frame to GIF
            this.gif.addFrame(ctx, { copy: true, delay: 100 }); // 10fps = 100ms delay
            this.frameCount++;

            // Schedule next frame capture
            setTimeout(() => this.captureFrame(video), 100);
        } catch (error) {
            console.error('Error capturing frame:', error);
            this.recording = false;
        }
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

    // Helper function to fetch the video title from the <title> tag
    getTitleFromHeadTag() {
        let title = document.title;

        // Remove leading notification count, e.g., (2) from the title
        title = title.replace(/^\(\d+\)\s*/, '');

        // YouTube usually appends " - YouTube" to the title, so we strip it off
        if (title.endsWith(' - YouTube')) {
            title = title.replace(' - YouTube', '');
        }

        return title.trim();
    }

    // Helper function to format time as HH-MM-SS
    formatTime(seconds) {
        const date = new Date(0);
        date.setSeconds(seconds);
        return date.toISOString().substring(11, 19).replace(/:/g, '.');
    }
} 