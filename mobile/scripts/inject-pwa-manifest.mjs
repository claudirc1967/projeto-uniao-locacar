/**
 * Injeta manifest PWA e apple-touch-icon no index.html após expo export.
 * Ícones ficam em static-web/icons/ (copiados por copy-static-web.mjs).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, "..", "dist", "index.html");
const MARKER = 'id="uniao-locacar-pwa-manifest"';

function getPublicBasePath(html) {
  const match = html.match(/href="(\/[^"]*)favicon\.ico"/);
  if (!match) return "/";
  const prefix = match[1];
  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}

if (!fs.existsSync(indexPath)) {
  console.error("inject-pwa-manifest: dist/index.html não encontrado.");
  process.exit(1);
}

const html = fs.readFileSync(indexPath, "utf8");
if (html.includes(MARKER)) {
  console.log("inject-pwa-manifest: tags já presentes, pulando.");
  process.exit(0);
}

const basePath = getPublicBasePath(html);
const tags = `<link rel="manifest" href="${basePath}manifest.json" ${MARKER} />
<meta name="theme-color" content="#003366" />
<link rel="apple-touch-icon" href="${basePath}icons/icon-180.png" />`;

const patched = html.includes("</head>")
  ? html.replace("</head>", `  ${tags}\n</head>`)
  : `${tags}\n${html}`;

fs.writeFileSync(indexPath, patched);
console.log(`inject-pwa-manifest: manifest e apple-touch-icon injetados (${basePath}).`);
