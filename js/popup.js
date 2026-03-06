// popup.js - Handles the extension popup UI and user settings

const FEEDBACK_URL = "https://github.com";
const RATE_US_URL = "https://chromewebstore.google.com";

document.addEventListener("DOMContentLoaded", () => {
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
  const gifMaxWidthValue = document.getElementById("gifMaxWidthValue");
  const gifEstimate = document.getElementById("gifEstimate");
  const gifWarning = document.getElementById("gifWarning");

  const gifWidthValues = [480, 720, 1080];

  const aboutLogo = document.getElementById("aboutLogo");
  if (aboutLogo) {
    aboutLogo.src = chrome.runtime.getURL("icons/icon48.png");
  }

  const tabs = document.querySelectorAll(".tab[data-panel]");
  const panels = document.querySelectorAll(".panel[data-panel]");

  const showPanel = (panelId) => {
    tabs.forEach((el) => {
      const isActive = el.getAttribute("data-panel") === panelId;
      el.classList.toggle("is-active", isActive);
      el.setAttribute("aria-current", isActive ? "page" : null);
    });
    panels.forEach((panel) => {
      const isTarget = panel.getAttribute("data-panel") === panelId;
      panel.classList.toggle("is-visible", isTarget);
      panel.hidden = !isTarget;
    });
  };

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      showPanel(btn.getAttribute("data-panel"));
    });
  });

  showPanel("general");

  const toggleFormatOption = () => {
    formatSetting.style.display = fileOption.checked ? "flex" : "none";
    toggleQualityOption();
  };

  const toggleQualityOption = () => {
    const showQuality = fileOption.checked && formatOption.value === "jpg";
    qualitySetting.style.display = showQuality ? "flex" : "none";
  };

  const updateGifEstimate = () => {
    const fps = parseInt(gifFramerate.value, 10);
    const duration = parseInt(gifMaxDuration.value, 10);
    const width = gifWidthValues[parseInt(gifMaxWidth.value, 10)];
    const height = Math.round((width * 9) / 16);
    const totalFrames = fps * duration;
    const estimatedBytes = totalFrames * width * height * 0.5;

    let sizeStr;
    if (estimatedBytes >= 1024 * 1024 * 1024) {
      sizeStr = "~" + (estimatedBytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
    } else if (estimatedBytes >= 1024 * 1024) {
      sizeStr = "~" + (estimatedBytes / (1024 * 1024)).toFixed(1) + " MB";
    } else {
      sizeStr = "~" + (estimatedBytes / 1024).toFixed(1) + " KB";
    }

    gifEstimate.textContent = sizeStr;
    gifWarning.style.display = estimatedBytes >= 500 * 1024 * 1024 ? "block" : "none";
  };

  const validateOutputOptions = () => {
    const noneSelected = !fileOption.checked && !clipboardOption.checked;
    outputWarning.style.display = noneSelected ? "block" : "none";
    return !noneSelected;
  };

  const applyStoredToUI = (data) => {
    fileOption.checked = data.saveAsFile ?? true;
    clipboardOption.checked = data.saveToClipboard ?? true;
    formatOption.value = data.fileFormat ?? "png";
    soundOption.checked = !(data.playSound ?? true);

    const quality = data.jpgQuality ?? 92;
    qualitySlider.value = quality;
    qualityValue.textContent = `${quality}%`;

    const framerate = data.gifFramerate ?? 10;
    gifFramerate.value = framerate;
    framerateValue.textContent = `${framerate} fps`;
    const duration = data.gifMaxDuration ?? 30;
    gifMaxDuration.value = duration;
    durationValue.textContent = `${duration}s`;
    const storedWidth = data.gifMaxWidth ?? 720;
    const widthIndex = gifWidthValues.indexOf(storedWidth);
    gifMaxWidth.value = widthIndex !== -1 ? widthIndex : 1;
    gifMaxWidthValue.textContent = `${gifWidthValues[gifMaxWidth.value]}px`;

    toggleFormatOption();
    validateOutputOptions();
    updateGifEstimate();

    const shortcutKey = (data.shortcutKey || "s").toUpperCase();
    const snapshotPill = document.getElementById("shortcutSnapshot");
    if (snapshotPill) snapshotPill.textContent = shortcutKey;
  };

  const loadSettings = () => {
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
        "shortcutKey",
      ],
      (data) => {
        if (chrome.runtime.lastError) {
          console.error("Error accessing chrome.storage:", chrome.runtime.lastError);
          return;
        }
        applyStoredToUI(data);
      }
    );
  };

  try {
    loadSettings();
  } catch (error) {
    console.error("Error with chrome.storage access:", error);
  }

  const restoreDefaultsBtn = document.getElementById("restoreDefaults");
  if (restoreDefaultsBtn) {
    restoreDefaultsBtn.addEventListener("click", () => {
      const defaults = {
        saveAsFile: true,
        saveToClipboard: true,
        fileFormat: "png",
        jpgQuality: 92,
        playSound: true,
        gifFramerate: 10,
        gifMaxDuration: 30,
        gifMaxWidth: 720,
        enableKeypress: true,
        shortcutKey: "s",
      };
      chrome.storage.sync.set(defaults, () => {
        applyStoredToUI(defaults);
      });
    });
  }

  const helpSupport = document.getElementById("helpSupport");
  if (helpSupport) {
    helpSupport.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: FEEDBACK_URL });
    });
  }

  const feedbackLink = document.getElementById("feedbackLink");
  if (feedbackLink) {
    feedbackLink.href = FEEDBACK_URL;
    feedbackLink.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: FEEDBACK_URL });
    });
  }

  const rateUsLink = document.getElementById("rateUsLink");
  if (rateUsLink) {
    rateUsLink.href = RATE_US_URL;
    rateUsLink.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: RATE_US_URL });
    });
  }

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

  gifMaxWidth.addEventListener("input", () => {
    gifMaxWidthValue.textContent = `${gifWidthValues[parseInt(gifMaxWidth.value, 10)]}px`;
    updateGifEstimate();
  });
  gifMaxWidth.addEventListener("change", () => {
    chrome.storage.sync.set({ gifMaxWidth: gifWidthValues[parseInt(gifMaxWidth.value, 10)] });
  });

  const manifestData = chrome.runtime.getManifest();
  versionElement.textContent = manifestData.version;
});
