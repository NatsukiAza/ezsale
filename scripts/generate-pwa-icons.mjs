import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function iconSvg(scale) {
  const size = 1024;
  const gfx = 100 * scale;
  const x = (size - gfx) / 2;
  const y = (size - gfx) / 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#21201d"/>
  <g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M 30 18 H 70 A 6 6 0 0 1 76 24 V 74 L 69.5 80 L 63 74 L 56.5 80 L 50 74 L 43.5 80 L 37 74 L 30.5 80 L 24 74 V 24 A 6 6 0 0 1 30 18 Z" fill="none" stroke="#f7f6f4" stroke-width="8" stroke-linejoin="round"/>
    <g stroke="#f7f6f4" stroke-linecap="round" fill="none">
      <line x1="34" y1="33" x2="54" y2="33" stroke-width="6.5"/>
      <line x1="34" y1="43" x2="50" y2="43" stroke-width="6.5"/>
      <line x1="34" y1="53" x2="58" y2="53" stroke-width="6.5"/>
      <line x1="34" y1="65" x2="66" y2="65" stroke-width="8"/>
    </g>
    <circle cx="64" cy="41" r="8" fill="#b4462f"/>
  </g>
</svg>`;
}

async function writePng(filePath, svg, size) {
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  await writeFile(filePath, buf);
}

const iconsDir = path.join(root, "public", "icons");
await mkdir(iconsDir, { recursive: true });

const regular = iconSvg(7.4);
const maskable = iconSvg(6.2);

await writePng(path.join(iconsDir, "icon-192.png"), regular, 192);
await writePng(path.join(iconsDir, "icon-512.png"), regular, 512);
await writePng(path.join(iconsDir, "icon-512-maskable.png"), maskable, 512);
await writePng(path.join(root, "app", "apple-icon.png"), regular, 180);

console.log("PWA icons written.");
