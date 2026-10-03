// Turn the single-file build into Artifact page content: the platform supplies the
// doctype/html/head/body skeleton, so emit head items followed by body content only.
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("dist/index.html", "utf8");
// The bundle itself contains "<head>"/"<body>" strings, so split on the document's last tags.
const head = html.slice(html.indexOf("<head>") + 6, html.lastIndexOf("</head>"));
const body = html.slice(html.lastIndexOf("<body>") + 6, html.lastIndexOf("</body>"));
const keep = head
  .replace(/<meta charset[^>]*>/i, "")
  .replace(/<meta name="viewport"[^>]*>/i, "")
  .trim();
// Title first (only the first 8 KB is scanned for it).
const title = keep.match(/<title>[\s\S]*?<\/title>/i)?.[0] ?? "";
const rest = keep.replace(title, "");
writeFileSync("dist/physics-lab.html", `${title}\n${rest}\n${body.trim()}\n`);
console.log(
  `dist/physics-lab.html ${(Buffer.byteLength(`${title}${rest}${body}`) / 1e6).toFixed(2)} MB`,
);
