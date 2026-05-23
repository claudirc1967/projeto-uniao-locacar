/**
 * GitHub Pages + 404.html: navegadores pedem gzip e o bundle .js retorna 404.
 * Carrega o JS via fetch com Accept-Encoding: identity (sem compressão).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, "..", "dist", "index.html");

const SCRIPT_RE =
  /<script\s+src="(\/_expo\/static\/js\/web\/index-[^"]+\.js)"\s+defer\s*><\/script>/;

function buildLoader(src) {
  return `<script>
(function () {
  var src = ${JSON.stringify(src)};
  var el = document.createElement("script");
  el.defer = true;
  fetch(src, {
    credentials: "same-origin",
    headers: { "Accept-Encoding": "identity" },
  })
    .then(function (res) {
      if (!res.ok) throw new Error("bundle load failed: " + res.status);
      return res.blob();
    })
    .then(function (blob) {
      el.src = URL.createObjectURL(blob);
      document.head.appendChild(el);
    })
    .catch(function (err) {
      console.error("[União LocaCar] Falha ao carregar bundle:", err);
      el.src = src;
      document.head.appendChild(el);
    });
})();
</script>`;
}

if (!fs.existsSync(indexPath)) {
  console.error("patch-index-html-loader: dist/index.html não encontrado.");
  process.exit(1);
}

const html = fs.readFileSync(indexPath, "utf8");
const match = html.match(SCRIPT_RE);
if (!match) {
  console.warn("patch-index-html-loader: tag script do bundle não encontrada, pulando.");
  process.exit(0);
}

const patched = html.replace(SCRIPT_RE, buildLoader(match[1]));
fs.writeFileSync(indexPath, patched);
console.log("patch-index-html-loader: index.html atualizado com loader identity.");
