#!/usr/bin/env node
/**
 * Backup do SQLite + cópia do schema Prisma (estrutura).
 * Uso: npm run db:backup -w backend
 *
 * DATABASE_URL em backend/.env (ex.: file:./dev.db).
 * Caminhos relativos em file: são resolvidos em relação à pasta prisma/ (igual ao Prisma).
 *
 * Opcional: BACKUP_KEEP_LAST=N no .env mantém só os N backups mais recentes.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, "..");
const PRISMA_DIR = path.join(BACKEND_ROOT, "prisma");
const ENV_PATH = path.join(BACKEND_ROOT, ".env");
const BACKUPS_ROOT = path.join(BACKEND_ROOT, "backups");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const text = fs.readFileSync(filePath, "utf8");
  const out = {};
  for (const line of text.split(/\r?\n/)) {
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

function resolveSqlitePath(databaseUrl) {
  if (!databaseUrl || typeof databaseUrl !== "string") {
    throw new Error("DATABASE_URL não definido em backend/.env");
  }
  const raw = databaseUrl.trim();
  if (!raw.startsWith("file:")) {
    throw new Error(
      `Este script só suporta SQLite (file:...). DATABASE_URL atual: ${raw.slice(0, 40)}...`
    );
  }
  let p = raw.slice("file:".length).trim();
  // file:///C:/path (URI)
  if (p.startsWith("//")) {
    p = p.replace(/^\/\//, "");
    if (/^[a-zA-Z]:/.test(p)) {
      return path.normalize(p);
    }
    return path.normalize("/" + p);
  }
  if (path.isAbsolute(p)) {
    return path.normalize(p);
  }
  const rel = p.replace(/^\.\//, "");
  return path.resolve(PRISMA_DIR, rel);
}

function timestampFolderName(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "_" +
    pad(d.getHours()) +
    "-" +
    pad(d.getMinutes()) +
    "-" +
    pad(d.getSeconds())
  );
}

function pruneOldBackups(keepLast) {
  if (!keepLast || keepLast < 1) return;
  if (!fs.existsSync(BACKUPS_ROOT)) return;
  const entries = fs
    .readdirSync(BACKUPS_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  if (entries.length <= keepLast) return;
  const toRemove = entries.slice(0, entries.length - keepLast);
  for (const name of toRemove) {
    const full = path.join(BACKUPS_ROOT, name);
    fs.rmSync(full, { recursive: true, force: true });
    console.log(`Removido backup antigo: ${name}`);
  }
}

function main() {
  const env = loadEnvFile(ENV_PATH);
  const dbPath = resolveSqlitePath(env.DATABASE_URL);

  if (!fs.existsSync(dbPath)) {
    console.error(
      `Arquivo do banco não encontrado:\n  ${dbPath}\n` +
        `Confira DATABASE_URL em backend/.env (caminhos relativos são a partir de prisma/).`
    );
    process.exit(1);
  }

  const schemaSrc = path.join(PRISMA_DIR, "schema.prisma");
  if (!fs.existsSync(schemaSrc)) {
    console.error(`schema.prisma não encontrado em ${schemaSrc}`);
    process.exit(1);
  }

  const folder = timestampFolderName();
  const destDir = path.join(BACKUPS_ROOT, folder);
  fs.mkdirSync(destDir, { recursive: true });

  const dbBase = path.basename(dbPath);
  const dbDest = path.join(destDir, dbBase);
  fs.copyFileSync(dbPath, dbDest);

  const schemaDest = path.join(destDir, "schema.prisma");
  fs.copyFileSync(schemaSrc, schemaDest);

  const keepRaw = env.BACKUP_KEEP_LAST;
  let keepLast = 30;
  if (keepRaw !== undefined && keepRaw !== "") {
    const n = parseInt(String(keepRaw), 10);
    if (Number.isFinite(n) && n >= 0) {
      keepLast = n;
    }
  }
  if (keepLast > 0) {
    pruneOldBackups(keepLast);
  }

  const stat = fs.statSync(dbDest);
  console.log("Backup concluído.");
  console.log(`  Pasta: ${destDir}`);
  console.log(`  Banco: ${dbBase} (${stat.size} bytes)`);
  console.log(`  Schema: schema.prisma`);
}

main();
