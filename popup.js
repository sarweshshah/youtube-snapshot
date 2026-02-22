// popup.js - Handles the extension popup UI and user settings

document.addEventListener("DOMContentLoaded", () => {
  // Get references to DOM elements
  const fileOption = document.getElementById("fileOption");
  const clipboardOption = document.getElementById("clipboardOption");
  const formatOption = document.getElementById("formatOption");
  const formatSetting = document.getElementById("formatSetting");
  const versionElement = document.getElementById("version");
  const soundOption = document.getElementById("soundOption");
  const outputWarning = document.getElementById("outputWarning");

  // Show or hide file format option based on "Save as File" checkbox state
  const toggleFormatOption = () => {
    formatSetting.style.display = fileOption.checked ? "flex" : "none";
    formatSetting.style.marginTop = fileOption.checked ? "8px" : "0px";
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
        "playSound",
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
  });

  soundOption.addEventListener("change", () => {
    chrome.storage.sync.set({ playSound: !soundOption.checked });
  });

  // Display the extension version in the popup
  const manifestData = chrome.runtime.getManifest();
  versionElement.textContent = manifestData.version;
});
