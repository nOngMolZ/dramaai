#!/usr/bin/env node
// Migration: เพจโครงเดิม (type บน page.config.json) → เพจ + โปรเจกต์ default "main"
//
//   node scripts/migrate-to-projects.mjs --dry-run   # แสดงแผน ไม่แตะไฟล์
//   node scripts/migrate-to-projects.mjs             # ย้ายจริง (backup ก่อนเสมอ)
//
// คุณสมบัติ:
//   - idempotent: เพจที่มี projects/ อยู่แล้ว = ย้ายแล้ว → ข้าม
//   - backup: สำเนาเพจทั้งก้อนไป _trash/pre-migration-backup/<slug>/ ก่อนย้าย (gitignored)
//   - ย้าย path อย่างเดียว ไม่แก้เนื้อไฟล์ .md/รูป

import { readdir, readFile, writeFile, rename, mkdir, access, cp, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION, isValidFormat } from "../server/formats.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pagesDir = path.join(rootDir, "pages");
const backupDir = path.join(rootDir, "_trash", "pre-migration-backup");

const DRY_RUN = process.argv.includes("--dry-run");
const DEFAULT_PROJECT = "main";

// เนื้อหาที่ย้ายเข้าโปรเจกต์ (ที่เหลือ เช่น page-brief.md, assets/ อยู่ระดับเพจ)
const MOVE_INTO_PROJECT = ["content_planner", "generated_posts", "characters", "products"];
// key ที่เป็น identity ของแบรนด์ (คงไว้ที่ page.config.json)
const BRAND_KEYS = ["name", "shortName", "description"];

const log = (...args) => console.log(...args);
const rel = (p) => path.relative(rootDir, p);

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function isDir(p) {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function migratePage(slug) {
  const pageDir = path.join(pagesDir, slug);
  const configPath = path.join(pageDir, "page.config.json");

  if (await exists(path.join(pageDir, "projects"))) {
    log(`⏭  ${slug}: มี projects/ แล้ว → ข้าม (ย้ายไปแล้ว)`);
    return { slug, skipped: true };
  }

  let config = {};
  try {
    config = JSON.parse(await readFile(configPath, "utf8"));
  } catch {
    log(`⚠  ${slug}: อ่าน page.config.json ไม่ได้ → ข้าม`);
    return { slug, skipped: true };
  }

  const format = config.type ? String(config.type) : "infographic";
  if (!isValidFormat(format)) {
    log(`⚠  ${slug}: format "${format}" ไม่รู้จัก → ข้าม (ต้องแก้มือ)`);
    return { slug, skipped: true };
  }

  const projectDir = path.join(pageDir, "projects", DEFAULT_PROJECT);

  // project.config: format + การตั้งค่าการผลิต (ทุก key ที่ไม่ใช่ brand/type)
  const projectConfig = { schemaVersion: SCHEMA_VERSION, format, name: config.name || slug };
  for (const [key, value] of Object.entries(config)) {
    if (key === "type" || key === "schemaVersion" || BRAND_KEYS.includes(key)) continue;
    projectConfig[key] = value; // platform, aspectRatio, ฯลฯ
  }

  // page.config ใหม่: identity เท่านั้น
  const newPageConfig = {
    schemaVersion: SCHEMA_VERSION,
    name: config.name || slug,
    shortName: config.shortName || config.name || slug,
    description: config.description || "",
    channels: Array.isArray(config.channels) ? config.channels : [],
  };

  // รายการโฟลเดอร์ที่จะย้าย (เฉพาะที่มีจริง)
  const toMove = [];
  for (const dir of MOVE_INTO_PROJECT) {
    if (await isDir(path.join(pageDir, dir))) toMove.push(dir);
  }

  log(`\n📦 ${slug}  (format: ${format})`);
  log(`   backup  → ${rel(path.join(backupDir, slug))}`);
  log(`   project → ${rel(projectDir)}/  { format: "${format}"${projectConfig.platform ? `, platform: "${projectConfig.platform}"` : ""} }`);
  log(`   ย้ายเข้าโปรเจกต์: ${toMove.length ? toMove.join(", ") : "(ไม่มี — โปรเจกต์ว่าง)"}`);
  log(`   คงที่ระดับเพจ: page-brief.md, assets/ + page.config.json (identity)`);

  if (DRY_RUN) return { slug, format, dryRun: true };

  // 1) backup ทั้งเพจ
  await mkdir(backupDir, { recursive: true });
  await cp(pageDir, path.join(backupDir, slug), { recursive: true });

  // 2) สร้างโปรเจกต์ แล้วย้ายเนื้อหาเข้า
  await mkdir(projectDir, { recursive: true });
  for (const dir of toMove) {
    await rename(path.join(pageDir, dir), path.join(projectDir, dir));
  }

  // 3) เขียน config ทั้งสองระดับ
  await writeFile(
    path.join(projectDir, "project.config.json"),
    JSON.stringify(projectConfig, null, 2) + "\n"
  );
  await writeFile(configPath, JSON.stringify(newPageConfig, null, 2) + "\n");

  log(`   ✅ ย้ายเสร็จ`);
  return { slug, format, migrated: true };
}

async function main() {
  log(DRY_RUN ? "🔍 DRY RUN — ไม่แตะไฟล์จริง\n" : "🚚 MIGRATE — ย้ายจริง (backup ก่อน)\n");

  let slugs = [];
  try {
    slugs = (await readdir(pagesDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    log("ไม่พบโฟลเดอร์ pages/");
    return;
  }

  const results = [];
  for (const slug of slugs) {
    results.push(await migratePage(slug));
  }

  const migrated = results.filter((r) => r.migrated).length;
  const skipped = results.filter((r) => r.skipped).length;
  const planned = results.filter((r) => r.dryRun).length;

  log(`\n────────────────────`);
  if (DRY_RUN) {
    log(`จะย้าย ${planned} เพจ, ข้าม ${skipped} เพจ`);
    log(`\nรันจริง: node scripts/migrate-to-projects.mjs`);
  } else {
    log(`ย้ายแล้ว ${migrated} เพจ, ข้าม ${skipped} เพจ`);
    log(`backup อยู่ที่ ${rel(backupDir)}/`);
  }
}

main().catch((error) => {
  console.error("❌ migration ล้มเหลว:", error.message);
  process.exit(1);
});
