/**
 * Injeta @font-face da MaterialCommunityIcons no index.html após expo export.
 * Evita travar o app web esperando useFonts e garante ícones no GitHub Pages / Railway.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(__dirname, "..", "dist");
const indexPath = path.join(distRoot, "index.html");

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function findMaterialCommunityFont() {
  const assetsRoot = path.join(distRoot, "assets");
  return walk(assetsRoot).find(
    (file) =>
      file.includes("MaterialCommunityIcons") && file.endsWith(".ttf")
  );
}

function getPublicBasePath(html) {
  const match = html.match(/href="(\/[^"]*)favicon\.ico"/);
  if (!match) return "/";
  const prefix = match[1];
  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}

function toPublicUrl(basePath, absoluteFilePath) {
  const rel = path.relative(distRoot, absoluteFilePath).split(path.sep).join("/");
  return `${basePath}${rel}`;
}

if (!fs.existsSync(indexPath)) {
  console.error("inject-web-font: dist/index.html não encontrado.");
  process.exit(1);
}

const fontFile = findMaterialCommunityFont();
if (!fontFile) {
  console.warn("inject-web-font: MaterialCommunityIcons.ttf não encontrado, pulando.");
  process.exit(0);
}

const html = fs.readFileSync(indexPath, "utf8");
if (html.includes("id=\"uniao-locacar-icon-font\"")) {
  console.log("inject-web-font: font-face já presente, pulando.");
  process.exit(0);
}

const basePath = getPublicBasePath(html);
const fontUrl = toPublicUrl(basePath, fontFile);
const style = `<style id="uniao-locacar-icon-font">
@font-face {
  font-family: "material-community";
  src: url("${fontUrl}") format("truetype");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
</style>`;

const patched = html.includes("</head>")
  ? html.replace("</head>", `  ${style}\n</head>`)
  : `${style}\n${html}`;

fs.writeFileSync(indexPath, patched);
console.log(`inject-web-font: font-face injetado (${fontUrl}).`);
