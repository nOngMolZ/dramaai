#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeSlug, scaffoldPage } from "../server/scaffold.mjs";

const [, , slugArg, ...nameParts] = process.argv;

if (!slugArg) {
  console.log('วิธีใช้: npm run new-page -- <slug> "ชื่อเพจ"');
  console.log('ตัวอย่าง: npm run new-page -- crypto-cat "คริปโตแมวส้ม"');
  process.exit(1);
}

const slug = normalizeSlug(slugArg);

if (!slug) {
  console.error("slug ต้องมีตัวอักษร a-z, 0-9 หรือ - อย่างน้อย 1 ตัว");
  process.exit(1);
}

const pageName = nameParts.join(" ").trim() || slug;
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  await scaffoldPage(rootDir, { slug, name: pageName });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`สร้างเพจ (แบรนด์) ใหม่แล้ว: pages/${slug}/ (${pageName})`);
console.log("ไฟล์ที่สร้าง:");
console.log(`  pages/${slug}/page.config.json   (identity)`);
console.log(`  pages/${slug}/page-brief.md`);
console.log(`  pages/${slug}/assets/            (โลโก้/สไตล์/ปก)`);
console.log(`  pages/${slug}/projects/          (ว่าง — ต้องเพิ่มโปรเจกต์)`);
console.log("");
console.log("ขั้นต่อไป: เพิ่มโปรเจกต์ (เลือก format) ผ่าน UI หรือ:");
console.log(`  curl -X POST localhost:3000/api/pages/${slug}/projects \\`);
console.log(`    -H 'Content-Type: application/json' \\`);
console.log(`    -d '{"slug":"main","format":"infographic","name":"..."}'`);
