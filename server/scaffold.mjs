import { mkdir, writeFile, access, readdir } from "node:fs/promises";
import path from "node:path";
import {
  SCHEMA_VERSION,
  FORMATS,
  isValidFormat,
  getFormat,
  resolvePlatform,
} from "./formats.mjs";

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export function normalizeSlug(rawSlug) {
  return String(rawSlug || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------- Templates ----------

// page.config.json — identity ของแบรนด์เท่านั้น ไม่มี type/format (ย้ายไป project.config.json)
export function pageConfigTemplate({ name, shortName, description }) {
  const config = {
    schemaVersion: SCHEMA_VERSION,
    name,
    shortName: shortName || name,
    description: description || "",
    channels: [], // เผื่อ multi-channel (IG/TikTok) ในอนาคต — ตอนนี้ FB อยู่ใน page.config.local.json
  };
  return JSON.stringify(config, null, 2) + "\n";
}

// project.config.json — format + การตั้งค่าการผลิตของโปรเจกต์นั้น
export function projectConfigTemplate({ name, format, platform, extra = {} }) {
  const config = {
    schemaVersion: SCHEMA_VERSION,
    format,
    name: name || format,
    ...extra,
  };
  const resolvedPlatform = resolvePlatform(format, platform);
  if (resolvedPlatform) {
    config.platform = resolvedPlatform;
  }
  return JSON.stringify(config, null, 2) + "\n";
}

export function charactersTemplate(projectName) {
  return `# ตัวละครของ ${projectName}

กติกา: ทุก prompt ที่มีตัวละคร ต้องคัดลอก "ย่อหน้าบรรยายมาตรฐาน" ไปวางเต็ม ๆ ห้ามใส่แค่ชื่อ
ภาพต้นแบบเก็บที่ characters/<char-slug>.png แล้วแนบทุกครั้งที่ generate ภาพ shot

## (ชื่อตัวละครที่ 1)
- เพศ/อายุ: (คนไทย อายุ 20 ปีขึ้นไป)
- จุดจำ: (เช่น ไฝที่แก้มซ้าย ทรงผม เสื้อผ้าประจำตัว)
- ภาพต้นแบบ: characters/char-1.png
- ย่อหน้าบรรยายมาตรฐาน: (ONE English paragraph ใช้ซ้ำทุก prompt)
- คำสั่งสร้างภาพต้นแบบ: (English prompt ลงท้ายด้วย "9:16 aspect ratio")
`;
}

export function pageBriefTemplate(pageName) {
  return `# ${pageName}

## 🧠 แนวทางเพจ

**Concept:**
(อธิบายคอนเซปต์เพจ โทน กลุ่มเป้าหมาย)

## 🎭 Mascot / Identity

- (มาสคอทหรือเอกลักษณ์ประจำเพจ)

## 📦 Content Pillars

### 1. (Pillar แรก)

- (รายละเอียด)

## 🎨 Style ภาพ

- โทนสี:
- สไตล์:
- ตัวหนังสือใหญ่ อ่านง่ายบนมือถือ

## ⚠️ Disclaimer

(ถ้าจำเป็น)
`;
}

export function contentTopicsTemplate(studioTopics = false) {
  if (studioTopics) {
    // drama/review: Day = เรื่อง/รีวิว ให้ AI สร้าง Day แรกเองตอนเขียน ห้ามมี placeholder
    return `# Content Topics
`;
  }
  return `# Content Topics

## Day 1
- Content 1: (หัวข้อโพสต์แรก)
`;
}

export function firstBriefTemplate() {
  return `# Day 1 - Content 1

## Content Type
(เช่น มีม / Infographic / ความรู้)

## Title
(หัวข้อโพสต์)

## Objective
(เป้าหมายของโพสต์นี้)

## Key Message
(ใจความหลัก)

## Image Prompt
(prompt สำหรับ generate ภาพ)

## Caption + Hashtags
(caption ที่จะโพสต์จริง)
`;
}

// ---------- Existence checks ----------

export async function pageExists(rootDir, slug) {
  try {
    await access(path.join(rootDir, "pages", slug));
    return true;
  } catch {
    return false;
  }
}

export async function projectExists(rootDir, slug, projectSlug) {
  try {
    await access(path.join(rootDir, "pages", slug, "projects", projectSlug));
    return true;
  } catch {
    return false;
  }
}

// ---------- Scaffold: page (brand shell) ----------

export async function scaffoldPage(rootDir, { slug, name, shortName, description }) {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error("slug ต้องเป็นตัวอักษร a-z, 0-9 หรือ - เท่านั้น");
  }
  if (await pageExists(rootDir, slug)) {
    throw new Error(`มีเพจ pages/${slug}/ อยู่แล้ว เลือก slug อื่น`);
  }

  const pageName = (name || "").trim() || slug;
  const pageDir = path.join(rootDir, "pages", slug);

  // แบรนด์: assets (โลโก้/สไตล์/ปก) + projects/ ว่าง — content ทั้งหมดอยู่ในโปรเจกต์
  await mkdir(path.join(pageDir, "assets", "logo"), { recursive: true });
  await mkdir(path.join(pageDir, "assets", "style-references"), { recursive: true });
  await mkdir(path.join(pageDir, "assets", "cover-references"), { recursive: true });
  await mkdir(path.join(pageDir, "projects"), { recursive: true });

  await writeFile(
    path.join(pageDir, "page.config.json"),
    pageConfigTemplate({ name: pageName, shortName, description })
  );
  await writeFile(path.join(pageDir, "page-brief.md"), pageBriefTemplate(pageName));

  return { slug, name: pageName };
}

// ---------- Scaffold: project (per format) ----------

export async function scaffoldProject(
  rootDir,
  { slug, projectSlug, name, format, platform }
) {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error("slug เพจไม่ถูกต้อง");
  }
  if (!SLUG_PATTERN.test(projectSlug)) {
    throw new Error("slug โปรเจกต์ต้องเป็นตัวอักษร a-z, 0-9 หรือ - เท่านั้น");
  }
  if (!(await pageExists(rootDir, slug))) {
    throw new Error(`ไม่พบเพจ ${slug}`);
  }
  if (!isValidFormat(format)) {
    throw new Error(`format ไม่ถูกต้อง (${Object.keys(FORMATS).join(", ")})`);
  }
  if (await projectExists(rootDir, slug, projectSlug)) {
    throw new Error(`มีโปรเจกต์ ${projectSlug} ในเพจนี้อยู่แล้ว เลือก slug อื่น`);
  }

  const def = getFormat(format);
  const projectName = (name || "").trim() || def.label;
  const projectDir = path.join(rootDir, "pages", slug, "projects", projectSlug);

  await mkdir(path.join(projectDir, "content_planner"), { recursive: true });
  await mkdir(path.join(projectDir, "generated_posts"), { recursive: true });
  for (const dir of def.dirs) {
    await mkdir(path.join(projectDir, dir), { recursive: true });
  }

  await writeFile(
    path.join(projectDir, "project.config.json"),
    projectConfigTemplate({ name: projectName, format, platform })
  );
  await writeFile(
    path.join(projectDir, "content_planner", "content-topics.md"),
    contentTopicsTemplate(def.studioTopics)
  );
  if (def.withCharacters) {
    await writeFile(
      path.join(projectDir, "characters", "characters.md"),
      charactersTemplate(projectName)
    );
  }
  if (def.starterBrief) {
    await writeFile(
      path.join(projectDir, "content_planner", "day1-content-1.md"),
      firstBriefTemplate()
    );
  }

  return { slug, projectSlug, name: projectName, format };
}

// รายชื่อโปรเจกต์ในเพจ (อ่านจาก projects/*/project.config.json)
export async function listProjects(rootDir, slug) {
  const projectsDir = path.join(rootDir, "pages", slug, "projects");
  let entries = [];
  try {
    entries = await readdir(projectsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const projects = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    projects.push({ slug: entry.name });
  }
  return projects;
}
