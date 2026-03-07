// Build script: minifies JS/CSS/HTML and copies extension assets to dist/
// Only manifest-referenced files are included (no docs/, store-icon.png, etc.)
// PNG icons in dist/icons are losslessly recompressed when sharp is available.

const fs = require("fs");
const path = require("path");
const { minify: minifyJs } = require("terser");
const CleanCSS = require("clean-css");
const { minify: minifyHtml } = require("html-minifier-terser");
let sharp;
try {
  sharp = require("sharp");
} catch (_) {
  sharp = null;
}

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");

const JS_TO_MINIFY = [
  "js/background.js",
  "js/content.js",
  "js/libs/gif-recorder.js",
  "js/popup.js",
  "js/offscreen.js",
];

const JS_COPY_AS_IS = ["js/libs/gif.js", "js/libs/gif.worker.js"];

const CSS_TO_MINIFY = ["css/popup.css"];

const HTML_TO_MINIFY = ["html/popup.html", "html/offscreen.html"];

const ASSETS_TO_COPY = [
  "manifest.json",
  "icons/icon16.png",
  "icons/icon48.png",
  "icons/icon128.png",
  "icons/snapshot-icon.png",
  "audio/download-sound.mp3",
];

async function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copy(src, dest) {
  const srcPath = path.join(ROOT, src);
  if (!fs.existsSync(srcPath)) {
    console.warn("Skip (not found):", src);
    return;
  }
  const destPath = path.join(DIST, dest || src);
  ensureDir(destPath);
  fs.copyFileSync(srcPath, destPath);
}

async function minifyJsFile(relativePath) {
  const src = path.join(ROOT, relativePath);
  const code = fs.readFileSync(src, "utf8");
  const result = await minifyJs(code, {
    compress: { passes: 1 },
    mangle: false,
    format: { comments: /^\s*\/\// },
  });
  if (result.error) throw result.error;
  const dest = path.join(DIST, relativePath);
  ensureDir(dest);
  fs.writeFileSync(dest, result.code, "utf8");
}

function minifyCssFile(relativePath) {
  const src = path.join(ROOT, relativePath);
  const code = fs.readFileSync(src, "utf8");
  const result = new CleanCSS({ level: 1 }).minify(code);
  if (result.errors.length) throw new Error(result.errors.join("; "));
  const dest = path.join(DIST, relativePath);
  ensureDir(dest);
  fs.writeFileSync(dest, result.styles, "utf8");
}

async function minifyHtmlFile(relativePath) {
  const src = path.join(ROOT, relativePath);
  const code = fs.readFileSync(src, "utf8");
  const result = await minifyHtml(code, {
    collapseWhitespace: true,
    removeComments: false,
    minifyCSS: false,
    minifyJS: false,
  });
  const dest = path.join(DIST, relativePath);
  ensureDir(dest);
  fs.writeFileSync(dest, result, "utf8");
}

async function main() {
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
  }
  fs.mkdirSync(DIST, { recursive: true });

  for (const file of ASSETS_TO_COPY) {
    copy(file);
  }

  for (const file of JS_TO_MINIFY) {
    await minifyJsFile(file);
  }

  for (const file of JS_COPY_AS_IS) {
    copy(file);
  }

  for (const file of CSS_TO_MINIFY) {
    minifyCssFile(file);
  }

  for (const file of HTML_TO_MINIFY) {
    await minifyHtmlFile(file);
  }

  // Losslessly recompress PNG icons when sharp is available
  const iconsDir = path.join(DIST, "icons");
  if (sharp && fs.existsSync(iconsDir)) {
    const files = fs.readdirSync(iconsDir).filter((f) => f.endsWith(".png"));
    for (const name of files) {
      const p = path.join(iconsDir, name);
      try {
        const buf = await sharp(p).png({ compressionLevel: 9 }).toBuffer();
        fs.writeFileSync(p, buf);
      } catch (err) {
        console.warn("Could not compress", name, err.message);
      }
    }
  }

  // Optional: re-encode audio/download-sound.mp3 at lower bitrate (e.g. 64k mono)
  // with: ffmpeg -i audio/download-sound.mp3 -b:a 64k -ac 1 -y audio/download-sound.mp3

  console.log("Build complete. Extension output: dist/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
