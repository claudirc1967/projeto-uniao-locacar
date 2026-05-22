/**
 * Copia páginas HTML estáticas (ex.: /parceiros) para mobile/dist após expo export.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.join(__dirname, "..");
const srcRoot = path.join(mobileRoot, "static-web");
const destRoot = path.join(mobileRoot, "dist");

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(srcRoot)) {
  console.log("copy-static-web: nada em static-web/, pulando.");
  process.exit(0);
}

if (!fs.existsSync(destRoot)) {
  console.error("copy-static-web: dist/ não encontrado. Rode expo export -p web antes.");
  process.exit(1);
}

copyDir(srcRoot, destRoot);
console.log("copy-static-web: páginas estáticas copiadas para dist/.");
