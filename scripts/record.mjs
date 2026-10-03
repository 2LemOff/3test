// Render the #film route frame by frame and encode it to MP4.
// Usage: node scripts/record.mjs <baseUrl> <framesDir> <out.mp4> [--fps=24] [--max=N] [--start=N]

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const [base, framesDir, out, ...flags] = process.argv.slice(2);
const opt = (k, d) => Number(flags.find((f) => f.startsWith(`--${k}=`))?.split("=")[1] ?? d);
const fps = opt("fps", 24);
const max = opt("max", 1e9);
mkdirSync(framesDir, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  ignoreHTTPSErrors: true,
});
page.on("pageerror", (e) => console.error("pageerror", e.message));
await page.goto(`${base}/?record&fps=${fps}#film`);
await page.waitForTimeout(4000);

const t0 = Date.now();
let frame = 0;
for (; frame < max; frame++) {
  await page.waitForFunction(() => typeof window.__advance === "function", null, {
    timeout: 120000,
  });
  await page.evaluate(() => window.__advance());
  // Let React commit caption/state changes made during the frame, then draw once more is not needed:
  // the canvas already holds this frame (preserveDrawingBuffer), only the HTML overlay may lag a tick.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))));
  await page.screenshot({
    path: `${framesDir}/${String(frame).padStart(5, "0")}.jpg`,
    type: "jpeg",
    quality: 92,
  });
  if (frame % 48 === 0) console.log(`frame ${frame} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  if (await page.evaluate(() => window.__filmDone === true)) break;
}
await browser.close();
console.log(`captured ${frame + 1} frames`);
execFileSync("ffmpeg", [
  "-y",
  "-loglevel",
  "error",
  "-framerate",
  String(fps),
  "-i",
  `${framesDir}/%05d.jpg`,
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-crf",
  "20",
  "-preset",
  "slow",
  "-movflags",
  "+faststart",
  out,
]);
console.log("wrote", out);
