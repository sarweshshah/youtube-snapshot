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

    chrome.runtime.onMessage.addListener((msg) => {
      switch (msg.type) {
        case "gif-progress":
          document.dispatchEvent(
            new CustomEvent("gifProgress", { detail: msg.progress })
          );
          break;
        case "gif-finished":
          this.handleFinished(msg);
          break;
        case "gif-error":
          this.frames = [];
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
    this.frameCount = 0;
    this.startTime = Date.now();
    this.width = video.videoWidth;
    this.height = video.videoHeight;

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });

    try {
      this.captureFrame(video);
      return this.recording;
    } catch (error) {
      console.error("Error starting recording:", error);
      this.recording = false;
      return false;
    }
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

    try {
      this.ctx.drawImage(video, 0, 0, this.width, this.height);
      const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
      this.frames.push(imageData.data);
      this.frameCount++;

      setTimeout(() => this.captureFrame(video), 100);
    } catch (error) {
      console.error("Error capturing frame:", error);
      this.recording = false;
    }
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
        tabId,
      });

      this.frames = [];
    } catch (error) {
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

  handleFinished(msg) {
    if (this.isCancelled) return;

    const link = document.createElement("a");
    link.href = msg.dataUrl;
    link.download = `${msg.videoTitle} [${msg.formattedTime}].gif`;
    link.click();

    document.dispatchEvent(new CustomEvent("gifFinished"));
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
    if (!this.recording && this.frames.length === 0) return;

    this.isCancelled = true;
    this.recording = false;
    this.frames = [];
    this.frameCount = 0;
    this.startTime = null;
    this.canvas = null;
    this.ctx = null;

    chrome.runtime.sendMessage({ target: "offscreen", type: "gif-cancel" });
  }
}

window.GIFRecorder = GIFRecorder;
