// Drive predict-then-watch end to end: sketch a (deliberately cartoon) path and a graph, fire, read the feedback.
import { chromium } from "playwright";

const [base, out] = process.argv.slice(2);
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  ignoreHTTPSErrors: true,
});
await page.goto(`${base}/#predict`);
await page.waitForTimeout(9000);

const vp = await page.locator(".viewport").boundingBox();
const start = { x: vp.x + vp.width * 0.28, y: vp.y + vp.height * 0.41 };
await page.mouse.move(start.x, start.y);
await page.mouse.down();
for (let i = 1; i <= 20; i++)
  await page.mouse.move(start.x + i * 14, start.y - i * 6, { steps: 2 });
for (let i = 1; i <= 12; i++)
  await page.mouse.move(start.x + 280 + i * 2, start.y - 120 + i * 32, { steps: 2 });
await page.mouse.up();
await page.getByRole("button", { name: "Next: the graph" }).click();

const pad = await page
  .getByRole("img", { name: "Sketch vertical velocity against time" })
  .boundingBox();
await page.mouse.move(pad.x + pad.width * 0.14, pad.y + pad.height * 0.3);
await page.mouse.down();
for (let i = 1; i <= 12; i++)
  await page.mouse.move(
    pad.x + pad.width * (0.14 + i * 0.02),
    pad.y + pad.height * (0.3 + i * 0.016),
    { steps: 2 },
  );
for (let i = 1; i <= 8; i++)
  await page.mouse.move(pad.x + pad.width * (0.38 + i * 0.02), pad.y + pad.height * 0.49, {
    steps: 2,
  });
for (let i = 1; i <= 12; i++)
  await page.mouse.move(
    pad.x + pad.width * (0.54 + i * 0.025),
    pad.y + pad.height * (0.49 + i * 0.022),
    { steps: 2 },
  );
await page.mouse.up();
await page.screenshot({ path: `${out}/predict-sketched.png` });
await page.getByRole("button", { name: "Fire the cannon" }).click();
await page.waitForSelector("text=Path match", { timeout: 240000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/predict-result.png` });
const findings = await page.locator(".callout strong").allInnerTexts();
console.log(findings.join("\n"));
await browser.close();
