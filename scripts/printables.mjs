// Save the lesson's worksheet PDF (generated in the page by jsPDF) into media/.
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const [base, seed = "7"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ ignoreHTTPSErrors: true });
await page.goto(`${base}/?still#lesson`);
await page.waitForFunction(() => typeof window.__worksheetBase64 === "function", null, {
  timeout: 60000,
});
const b64 = await page.evaluate((s) => window.__worksheetBase64(Number(s)), seed);
writeFileSync(`media/projectile-worksheet-${seed}.pdf`, Buffer.from(b64, "base64"));
console.log(`media/projectile-worksheet-${seed}.pdf`);
await browser.close();
