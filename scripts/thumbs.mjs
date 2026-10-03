// Capture gallery thumbnails from live renders (viewport only), saved as small WebP files.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const [base, tmp] = process.argv.slice(2);
const shots = [
  ["fields", "fields-beam"],
  ["lesson", "lesson"],
  ["flashcards", "flashcards"],
  ["video", "fields-orbits"],
];
mkdirSync(tmp, { recursive: true });
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  ignoreHTTPSErrors: true,
});
for (const [name, route] of shots) {
  await page.goto(`${base}/?still#${route}`);
  await page.waitForTimeout(14000);
  await page.addStyleTag({ content: ".topbar,.scene-tabs,.photo-status{display:none!important}" });
  await page.waitForTimeout(800);
  const box = await page.locator(".viewport").boundingBox();
  const h = Math.round((box.width * 10) / 16);
  await page.screenshot({
    path: `${tmp}/${name}.png`,
    clip: { x: box.x, y: box.y + (box.height - h) / 2, width: box.width, height: h },
  });
  console.log("captured", name);
}
await browser.close();
for (const [name] of shots) {
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    `${tmp}/${name}.png`,
    "-vf",
    "scale=720:-2",
    "-quality",
    "78",
    `src/hub/thumbs/${name}.webp`,
  ]);
}
