// GIF Recorder - captures video frames and offloads encoding to an offscreen document
// Frame capture happens in the content script; GIF rendering happens in a separate
// extension context via Web Workers, keeping YouTube's main thread unblocked.

class GIFRecorder {
  constructor() {
    this.recording = false;
    this.frames = [];
    this.frameCount = 0;
    this.startTime = null;
    this.isCancelled = false;
    this.canvas = null;
    this.ctx = null;
    this.width = 0;
    this.height = 0;
    this.chunks = [];
    this.maxDuration = 30;
    this.framerate = 10;
    this.maxWidth = 0;
    this.frameInterval = 100;

    chrome.runtime.onMessage.addListener((msg) => {
      switch (msg.type) {
        case "gif-chunk":
          this.handleChunk(msg);
          break;
        case "gif-progress":
          document.dispatchEvent(
            new CustomEvent("gifProgress", { detail: msg.progress })
          );
          break;
        case "gif-error":
          this.frames = [];
          this.chunks = [];
          document.dispatchEvent(
            new CustomEvent("gifError", { detail: msg.error })
          );
          break;
      }
    });
  }

  startRecording(video) {
    if (this.recording) return false;

    this.recording = true;
    this.isCancelled = false;
    this.frames = [];
    this.chunks = [];
    this.frameCount = 0;
    this.startTime = Date.now();
    this.autoStopVideo = video;

    chrome.storage.sync.get(
      ["gifFramerate", "gifMaxDuration", "gifMaxWidth"],
      (data) => {
        if (!this.recording) return;

        this.framerate = data.gifFramerate || 10;
        this.maxDuration = data.gifMaxDuration || 30;
        this.maxWidth = data.gifMaxWidth || 0;
        this.frameInterval = Math.round(1000 / this.framerate);

        const effectiveMaxWidth = this.maxWidth > 0 ? this.maxWidth : video.videoWidth;
        const scale = Math.min(1, effectiveMaxWidth / video.videoWidth);
        this.width = Math.floor(video.videoWidth * scale);
        this.height = Math.floor(video.videoHeight * scale);

        this.canvas = document.createElement("canvas");
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });

        try {
          this.captureFrame(video);
        } catch (error) {
          console.error("Error starting recording:", error);
          this.recording = false;
        }
      }
    );

    return true;
  }

  stopRecording() {
    if (!this.recording) return;

    this.recording = false;
    this.isCancelled = false;

    try {
      const video = document.querySelector("video");
      const videoTitle = this.getTitleFromHeadTag();
      const formattedTime = this.formatTime(video.currentTime);
      this.sendToOffscreen(videoTitle, formattedTime);
    } catch (error) {
      console.error("Error stopping recording:", error);
      this.frames = [];
      document.dispatchEvent(
        new CustomEvent("gifError", { detail: error.message })
      );
    }
  }

  captureFrame(video) {
    if (!this.recording) return;

    if (this.getDuration() >= this.maxDuration) {
      document.dispatchEvent(new CustomEvent("gifAutoStopped"));
      this.stopRecording();
      return;
    }

    if (!video.paused) {
      try {
        this.ctx.drawImage(video, 0, 0, this.width, this.height);
        const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
        this.frames.push(imageData.data);
        this.frameCount++;
      } catch (error) {
        console.error("Error capturing frame:", error);
        this.recording = false;
        return;
      }
    }

    setTimeout(() => this.captureFrame(video), this.frameInterval);
  }

  async sendToOffscreen(videoTitle, formattedTime) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "create-offscreen",
      });
      if (!response?.ready) {
        throw new Error(response?.error || "Failed to create offscreen document");
      }

      const tabId = response.tabId;

      for (let i = 0; i < this.frames.length; i++) {
        if (this.isCancelled) return;

        await chrome.runtime.sendMessage({
          target: "offscreen",
          type: "gif-frame",
          data: this.encodeFrame(this.frames[i]),
          width: this.width,
          height: this.height,
        });
      }

      if (this.isCancelled) return;

      await chrome.runtime.sendMessage({
        target: "offscreen",
        type: "gif-render",
        videoTitle,
        formattedTime,
        frameDelay: this.frameInterval,
        tabId,
      });

      this.frames = [];
    } catch (error) {
      if (this.isCancelled) return;
      console.error("Error sending to offscreen:", error);
      this.frames = [];
      document.dispatchEvent(
        new CustomEvent("gifError", { detail: error.message })
      );
    }
  }

  encodeFrame(uint8Array) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length))
      );
    }
    return btoa(binary);
  }

  handleChunk(msg) {
    if (this.isCancelled) return;

    this.chunks[msg.index] = msg.chunk;

    let receivedCount = 0;
    for (let i = 0; i < msg.total; i++) {
      if (this.chunks[i] !== undefined) receivedCount++;
    }

    if (receivedCount === msg.total) {
      const dataUrl = this.chunks.join("");
      this.chunks = [];
      this.handleFinished({
        dataUrl,
        videoTitle: msg.videoTitle,
        formattedTime: msg.formattedTime,
      });
    }
  }

  handleFinished(msg) {
    if (this.isCancelled) return;

    // Defer the download by one tick so a pending cancel-click in the event
    // queue has a chance to set isCancelled before we trigger the save.
    setTimeout(() => {
      if (this.isCancelled) return;

      const link = document.createElement("a");
      link.href = msg.dataUrl;
      link.download = `${msg.videoTitle} [${msg.formattedTime}].gif`;
      link.click();

      document.dispatchEvent(new CustomEvent("gifFinished"));
    }, 0);
  }

  getTitleFromHeadTag() {
    let title = document.title.replace(/^\(\d+\)\s*/, "");
    return title.endsWith(" - YouTube")
      ? title.replace(" - YouTube", "")
      : title.trim();
  }

  formatTime(seconds) {
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substring(11, 19).replace(/:/g, ".");
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
    this.isCancelled = true;
    this.recording = false;
    this.frames = [];
    this.chunks = [];
    this.frameCount = 0;
    this.startTime = null;
    this.canvas = null;
    this.ctx = null;

    try {
      chrome.runtime.sendMessage({ target: "offscreen", type: "gif-cancel" });
    } catch (e) {
      // offscreen doc may not exist
    }
  }
}

window.GIFRecorder = GIFRecorder;
