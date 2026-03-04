// popup.js - Handles the extension popup UI and user settings

document.addEventListener("DOMContentLoaded", () => {
  // Get references to DOM elements
  const fileOption = document.getElementById("fileOption");
  const clipboardOption = document.getElementById("clipboardOption");
  const formatOption = document.getElementById("formatOption");
  const formatSetting = document.getElementById("formatSetting");
  const qualitySetting = document.getElementById("qualitySetting");
  const qualitySlider = document.getElementById("qualitySlider");
  const qualityValue = document.getElementById("qualityValue");
  const versionElement = document.getElementById("version");
  const soundOption = document.getElementById("soundOption");
  const outputWarning = document.getElementById("outputWarning");
  const gifFramerate = document.getElementById("gifFramerate");
  const framerateValue = document.getElementById("framerateValue");
  const gifMaxDuration = document.getElementById("gifMaxDuration");
  const durationValue = document.getElementById("durationValue");
  const gifMaxWidth = document.getElementById("gifMaxWidth");
  const gifEstimate = document.getElementById("gifEstimate");
  const gifWarning = document.getElementById("gifWarning");

  // Show or hide file format option based on "Save as File" checkbox state
  const toggleFormatOption = () => {
    formatSetting.style.display = fileOption.checked ? "flex" : "none";
    toggleQualityOption();
  };

  // Show or hide JPG quality slider based on format selection
  const toggleQualityOption = () => {
    const showQuality = fileOption.checked && formatOption.value === "jpg";
    qualitySetting.style.display = showQuality ? "flex" : "none";
  };

  const updateGifEstimate = () => {
    const fps = parseInt(gifFramerate.value, 10);
    const duration = parseInt(gifMaxDuration.value, 10);
    const maxW = parseInt(gifMaxWidth.value, 10);

    // Assume 16:9 aspect ratio
    const width = maxW > 0 ? maxW : 1920;
    const height = Math.round(width * 9 / 16);
    const totalFrames = fps * duration;

    // ~0.5 bytes per pixel per frame is a reasonable GIF compression estimate
    const estimatedBytes = totalFrames * width * height * 0.5;

    let sizeStr;
    if (estimatedBytes >= 1024 * 1024 * 1024) {
      sizeStr = (estimatedBytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
    } else if (estimatedBytes >= 1024 * 1024) {
      sizeStr = (estimatedBytes / (1024 * 1024)).toFixed(1) + " MB";
    } else {
      sizeStr = (estimatedBytes / 1024).toFixed(1) + " KB";
    }

    gifEstimate.textContent = `Est. max size: ~${sizeStr}${maxW === 0 ? " (at 1080p)" : ""}`;
    gifWarning.style.display = estimatedBytes >= 500 * 1024 * 1024 ? "block" : "none";
  };

  const validateOutputOptions = () => {
    const noneSelected = !fileOption.checked && !clipboardOption.checked;
    outputWarning.style.display = noneSelected ? "block" : "none";
    return !noneSelected;
  };

  // Load saved preferences from chrome.storage and update UI
  try {
    chrome.storage.sync.get(
      [
        "saveAsFile",
        "saveToClipboard",
        "fileFormat",
        "jpgQuality",
        "playSound",
        "gifFramerate",
        "gifMaxDuration",
        "gifMaxWidth",
      ],
      (data) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error accessing chrome.storage:",
            chrome.runtime.lastError
          );
          return;
        }
        // Set UI state based on stored preferences, or use defaults
        fileOption.checked = data.saveAsFile ?? true;
        clipboardOption.checked = data.saveToClipboard ?? true;
        formatOption.value = data.fileFormat ?? "png";
        soundOption.checked = !(data.playSound ?? true);

        // JPG quality
        const quality = data.jpgQuality ?? 92;
        qualitySlider.value = quality;
        qualityValue.textContent = `${quality}%`;

        // GIF settings
        const framerate = data.gifFramerate ?? 10;
        gifFramerate.value = framerate;
        framerateValue.textContent = `${framerate} fps`;
        const duration = data.gifMaxDuration ?? 30;
        gifMaxDuration.value = duration;
        durationValue.textContent = `${duration}s`;
        gifMaxWidth.value = String(data.gifMaxWidth ?? 0);

        toggleFormatOption();
        validateOutputOptions();
        updateGifEstimate();
      }
    );
  } catch (error) {
    console.error("Error with chrome.storage access:", error);
  }

  // Save preferences when checkboxes or dropdowns are changed
  fileOption.addEventListener("change", () => {
    chrome.storage.sync.set({ saveAsFile: fileOption.checked });
    toggleFormatOption();
    validateOutputOptions();
  });

  clipboardOption.addEventListener("change", () => {
    chrome.storage.sync.set({ saveToClipboard: clipboardOption.checked });
    validateOutputOptions();
  });

  formatOption.addEventListener("change", () => {
    chrome.storage.sync.set({ fileFormat: formatOption.value });
    toggleQualityOption();
  });

  qualitySlider.addEventListener("input", () => {
    qualityValue.textContent = `${qualitySlider.value}%`;
  });
  qualitySlider.addEventListener("change", () => {
    chrome.storage.sync.set({ jpgQuality: parseInt(qualitySlider.value, 10) });
  });

  soundOption.addEventListener("change", () => {
    chrome.storage.sync.set({ playSound: !soundOption.checked });
  });

  gifFramerate.addEventListener("input", () => {
    framerateValue.textContent = `${gifFramerate.value} fps`;
    updateGifEstimate();
  });
  gifFramerate.addEventListener("change", () => {
    chrome.storage.sync.set({ gifFramerate: parseInt(gifFramerate.value, 10) });
  });

  gifMaxDuration.addEventListener("input", () => {
    durationValue.textContent = `${gifMaxDuration.value}s`;
    updateGifEstimate();
  });
  gifMaxDuration.addEventListener("change", () => {
    chrome.storage.sync.set({ gifMaxDuration: parseInt(gifMaxDuration.value, 10) });
  });

  gifMaxWidth.addEventListener("change", () => {
    chrome.storage.sync.set({ gifMaxWidth: parseInt(gifMaxWidth.value, 10) });
    updateGifEstimate();
  });

  // Display the extension version in the popup
  const manifestData = chrome.runtime.getManifest();
  versionElement.textContent = manifestData.version;
});
