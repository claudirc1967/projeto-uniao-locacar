/**
 * GitHub Pages + SPA (404.html): pedidos com Accept-Encoding gzip/br podem
 * falhar em .js/.css se não existir o par .gz/.br. Gera .gz ao lado dos originais.
 * @see https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(__dirname, "..", "dist");

const GZIP_EXTENSIONS = new Set([
  ".js",
  ".css",
  ".ico",
  ".json",
  ".wasm",
  ".svg",
  ".txt",
  ".xml",
  ".map",
]);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function gzipFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!GZIP_EXTENSIONS.has(ext)) return false;
  if (filePath.endsWith(".gz")) return false;

  const outPath = `${filePath}.gz`;
  const input = fs.readFileSync(filePath);
  const compressed = zlib.gzipSync(input, { level: 9 });
  fs.writeFileSync(outPath, compressed);
  return true;
}

if (!fs.existsSync(distRoot)) {
  console.error("gzip-static-assets: dist/ não encontrado.");
  process.exit(1);
}

let count = 0;
for (const file of walk(distRoot)) {
  if (gzipFile(file)) count += 1;
}

console.log(`gzip-static-assets: ${count} arquivo(s) .gz gerado(s).`);
