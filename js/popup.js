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
  const gifMaxDuration = document.getElementById("gifMaxDuration");
  const durationValue = document.getElementById("durationValue");
  const gifMaxWidth = document.getElementById("gifMaxWidth");

  // Show or hide file format option based on "Save as File" checkbox state
  const toggleFormatOption = () => {
    formatSetting.style.display = fileOption.checked ? "flex" : "none";
    formatSetting.style.marginTop = fileOption.checked ? "8px" : "0px";
    toggleQualityOption();
  };

  // Show or hide JPG quality slider based on format selection
  const toggleQualityOption = () => {
    const showQuality = fileOption.checked && formatOption.value === "jpg";
    qualitySetting.style.display = showQuality ? "flex" : "none";
    qualitySetting.style.marginTop = showQuality ? "8px" : "0px";
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
        gifFramerate.value = String(data.gifFramerate ?? 10);
        const duration = data.gifMaxDuration ?? 30;
        gifMaxDuration.value = duration;
        durationValue.textContent = `${duration}s`;
        gifMaxWidth.value = String(data.gifMaxWidth ?? 0);

        toggleFormatOption();
        validateOutputOptions();
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

  gifFramerate.addEventListener("change", () => {
    chrome.storage.sync.set({ gifFramerate: parseInt(gifFramerate.value, 10) });
  });

  gifMaxDuration.addEventListener("input", () => {
    durationValue.textContent = `${gifMaxDuration.value}s`;
  });
  gifMaxDuration.addEventListener("change", () => {
    chrome.storage.sync.set({ gifMaxDuration: parseInt(gifMaxDuration.value, 10) });
  });

  gifMaxWidth.addEventListener("change", () => {
    chrome.storage.sync.set({ gifMaxWidth: parseInt(gifMaxWidth.value, 10) });
  });

  // Display the extension version in the popup
  const manifestData = chrome.runtime.getManifest();
  versionElement.textContent = manifestData.version;
});
