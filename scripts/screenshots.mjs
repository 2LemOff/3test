// Screenshot routes in software-rendered Chromium.
// Usage: node scripts/screenshots.mjs <baseUrl> <outDir> route[,route...] [--mobile] [--dark] [--wait=ms]

import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const [base, outDir, routesArg = "home", ...flags] = process.argv.slice(2);
const mobile = flags.includes("--mobile");
const dark = flags.includes("--dark");
const wait = Number(flags.find((f) => f.startsWith("--wait="))?.split("=")[1] ?? 6000);
const query = flags.find((f) => f.startsWith("--query="))?.slice("--query=".length) ?? "";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--enable-webgl",
  ],
});
const context = await browser.newContext({
  viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  deviceScaleFactor: mobile ? 2 : 1,
  colorScheme: dark ? "dark" : "light",
  isMobile: mobile,
  ignoreHTTPSErrors: true,
  hasTouch: mobile,
});
const page = await context.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning")
    errors.push(`[${m.type()}] ${m.text()}`.slice(0, 300));
});
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`.slice(0, 300)));

for (const route of routesArg.split(",")) {
  await page.goto(`${base}/${query ? `?${query}` : ""}#${route}`, { waitUntil: "load" });
  await page.waitForTimeout(wait);
  const name = `${route}${mobile ? "-mobile" : ""}${dark ? "-dark" : ""}.png`;
  await page.screenshot({ path: `${outDir}/${name}`, fullPage: mobile });
  console.log("saved", name);
}
if (errors.length)
  console.log(`console messages:\n${[...new Set(errors)].slice(0, 25).join("\n")}`);
await browser.close();
