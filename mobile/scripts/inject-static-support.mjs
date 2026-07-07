/**
 * Gera static-web/support-config.json a partir de ADMIN_SUPPORT_* (env ou backend/.env).
 * Usado pelas páginas HTML estáticas quando /public/support não está acessível (ex.: npx serve local).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.join(__dirname, "..");
const backendEnvPath = path.join(mobileRoot, "..", "backend", ".env");
const outPath = path.join(mobileRoot, "static-web", "support-config.json");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function normalizeEmail(raw) {
  const email = raw?.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  return email;
}

function normalizeWhatsApp(raw) {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

const fileEnv = loadEnvFile(backendEnvPath);
const supportEmail = normalizeEmail(
  process.env.ADMIN_SUPPORT_EMAIL ?? fileEnv.ADMIN_SUPPORT_EMAIL
);
const supportWhatsApp = normalizeWhatsApp(
  process.env.ADMIN_SUPPORT_WHATSAPP ?? fileEnv.ADMIN_SUPPORT_WHATSAPP
);

const config = {
  supportEmail,
  supportWhatsApp,
  whatsAppUrl: supportWhatsApp ? `https://wa.me/${supportWhatsApp}` : null,
};

fs.writeFileSync(outPath, JSON.stringify(config, null, 2) + "\n", "utf8");
console.log(
  "inject-static-support: wrote support-config.json",
  supportWhatsApp ? `(WhatsApp ${supportWhatsApp})` : "(sem WhatsApp)"
);
