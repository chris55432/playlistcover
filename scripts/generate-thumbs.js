#!/usr/bin/env node
/**
 * Generates thumbnails from covers/*.webp into covers/thumbs/
 * Run: node scripts/generate-thumbs.js
 * Requires: npm install sharp
 */

const fs = require("fs");
const path = require("path");

const COVERS_DIR = path.join(__dirname, "..", "covers");
const THUMBS_DIR = path.join(COVERS_DIR, "thumbs");
const THUMB_SIZE = 140; // 280/2 for ~50% scale

async function main() {
  try {
    require.resolve("sharp");
  } catch {
    console.error("Missing sharp. Run: npm install sharp");
    process.exit(1);
  }
  const sharp = require("sharp");

  if (!fs.existsSync(COVERS_DIR)) {
    console.error("covers/ folder not found");
    process.exit(1);
  }

  fs.mkdirSync(THUMBS_DIR, { recursive: true });

  const files = fs.readdirSync(COVERS_DIR).filter((f) => {
    const p = path.join(COVERS_DIR, f);
    return fs.statSync(p).isFile() && /\.(webp|jpg|jpeg|png)$/i.test(f);
  });
  let count = 0;

  for (const file of files) {
    const src = path.join(COVERS_DIR, file);
    const dest = path.join(THUMBS_DIR, file);
    if (path.dirname(src) === path.dirname(dest) && path.basename(path.dirname(dest)) === "thumbs") {
      // avoid processing files inside thumbs/
      continue;
    }
    await sharp(src)
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" })
      .webp({ quality: 80 })
      .toFile(dest);
    count++;
    console.log("Generated:", path.relative(process.cwd(), dest));
  }

  console.log(`Done. ${count} thumbnails in covers/thumbs/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
