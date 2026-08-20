import { mkdir, readFile, writeFile, rename, readdir, unlink, rm } from "node:fs/promises";
import path from "node:path";
import {
  SLUG_PATTERN,
  scaffoldPage,
  scaffoldProject,
  pageExists,
  projectExists,
  listProjects,
} from "./scaffold.mjs";

const IMAGE_EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
const MAX_JSON_BYTES = 64 * 1024;
const MAX_BRIEF_BYTES = 512 * 1024;

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function readBody(req, limitBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > limitBytes) {
        reject(new Error("ไฟล์หรือคำขอใหญ่เกินไป"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function timestampSuffix() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function extractBriefTitle(markdown) {
  const match = markdown.match(/##\s+Title\s*\n([\s\S]*?)(?=\n##\s+|$)/i);
  return match ? match[1].trim().split(/\r?\n/)[0].trim() : "";
}

// แปลง content-topics.md เป็นโครงสร้าง { preamble, sections } โดยเก็บบรรทัดดิบไว้
// เพื่อไม่ทำลายโน้ตอื่น ๆ ที่อาจแทรกอยู่ในไฟล์
function parseTopicsFile(markdown) {
  const lines = markdown.split(/\r?\n/);
  const preamble = [];
  const sections = [];
  let current = null;

  for (const line of lines) {
    const match = line.match(/^##\s+Day\s+(\d+)\s*$/i);
    if (match) {
      current = { day: Number(match[1]), lines: [] };
      sections.push(current);
      continue;
    }
    (current ? current.lines : preamble).push(line);
  }

  return { preamble, sections };
}

function serializeTopicsFile({ preamble, sections }) {
  const trimTrailingBlank = (lines) => {
    const copy = [...lines];
    while (copy.length && !copy[copy.length - 1].trim()) {
      copy.pop();
    }
    return copy;
  };

  const blocks = [];
  const pre = trimTrailingBlank(preamble);
  if (pre.length) {
    blocks.push(pre.join("\n"));
  }
  for (const section of sections) {
    blocks.push([`## Day ${section.day}`, ...trimTrailingBlank(section.lines)].join("\n"));
  }
  return blocks.join("\n\n") + "\n";
}

// เพิ่มหรืออัพเดทบรรทัด `- Content M: <title>` ใน Day ที่กำหนด
// ถ้ายังไม่มี section ของ Day นั้นจะแทรกใหม่โดยเรียงตามเลขวัน
function upsertTopicsEntry(markdown, day, contentNumber, title) {
  const doc = parseTopicsFile(markdown || "# Content Topics");
  let section = doc.sections.find((entry) => entry.day === day);
  if (!section) {
    section = { day, lines: [] };
    doc.sections.push(section);
    doc.sections.sort((a, b) => a.day - b.day);
  }

  const entryLine = `- Content ${contentNumber}: ${title}`;
  const samePattern = new RegExp(`^-+\\s+Content\\s+${contentNumber}:`, "i");
  const existingIndex = section.lines.findIndex((line) => samePattern.test(line.trim()));

  if (existingIndex >= 0) {
    section.lines[existingIndex] = entryLine;
  } else {
    let lastContentIndex = -1;
    section.lines.forEach((line, index) => {
      if (/^-+\s+Content\s+\d+:/i.test(line.trim())) {
        lastContentIndex = index;
      }
    });
    section.lines.splice(lastContentIndex + 1, 0, entryLine);
  }

  return serializeTopicsFile(doc);
}

function nextContentNumber(topicsMarkdown, briefFiles, day) {
  let max = 0;

  const doc = parseTopicsFile(topicsMarkdown || "");
  const section = doc.sections.find((entry) => entry.day === day);
  for (const line of section?.lines || []) {
    const match = line.trim().match(/^-+\s+Content\s+(\d+):/i);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }

  const filePattern = new RegExp(`^day${day}-content-(\\d+)\\.md$`);
  for (const file of briefFiles) {
    const match = file.match(filePattern);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }

  return max + 1;
}

function buildBriefMarkdown({ day, contentNumber, fields }) {
  const sections = [
    ["Content Type", fields.contentType || "Content"],
    ["Title", fields.title],
    ["Objective", fields.objective],
    ["Key Message", fields.keyMessage],
    ["Visual Direction", fields.visualDirection],
    ["Image Prompt", fields.imagePrompt],
    ["Caption + Hashtags", fields.caption],
    ["CTA", fields.cta],
  ];

  let markdown = `# Day ${day} Content ${contentNumber}\n`;
  for (const [name, value] of sections) {
    const text = String(value || "").trim();
    if (!text) {
      continue;
    }
    markdown += `\n## ${name}\n${text}\n`;
  }
  return markdown;
}

const TRASH_FOLDER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*$/;

function parseTrashFolder(folder) {
  const match = folder.match(/^(.*)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})$/);
  if (!match) {
    return { slug: folder, deletedAt: null };
  }
  // แปลง 2026-07-04T15-01-28 กลับเป็นเวลา ISO (UTC ตามตอนที่ลบ)
  const [datePart, timePart] = match[2].split("T");
  return {
    slug: match[1],
    deletedAt: `${datePart}T${timePart.replace(/-/g, ":")}Z`,
  };
}

const CONTENT_TYPE_OF = (req) => (req.headers["content-type"] || "").split(";")[0].trim();

// อ่านค่า content-type เป็นนามสกุลภาพ; คืน null ถ้าไม่รองรับ
function imageExtension(req) {
  return IMAGE_EXTENSIONS[CONTENT_TYPE_OF(req)] || null;
}

// เขียนไฟล์ภาพลง dir โดยลบไฟล์ชื่อ base เดิมที่นามสกุลต่างออกก่อน (กันซ้ำหลายนามสกุล)
async function writeImageReplacingBase(dir, baseName, extension, buffer) {
  await mkdir(dir, { recursive: true });
  const existing = await readdir(dir);
  for (const file of existing) {
    if (file.startsWith(`${baseName}.`) && file !== `${baseName}.${extension}`) {
      await unlink(path.join(dir, file));
    }
  }
  const filePath = path.join(dir, `${baseName}.${extension}`);
  await writeFile(filePath, buffer);
  return filePath;
}

// สร้าง connect-style middleware สำหรับจัดการเพจ/โปรเจกต์ ใช้ได้ทั้งกับ Vite dev server
// (server.middlewares) และ Express/connect ในอนาคต โดย mount ไว้ที่ /api
export function createPagesApi(rootDir) {
  return async function pagesApi(req, res, next) {
    const url = new URL(req.url, "http://localhost");
    const segments = url.pathname.split("/").filter(Boolean);

    // ---- /api/trash — จัดการเพจที่ถูกลบ (อยู่ใน _trash/) ----
    if (segments[0] === "trash") {
      await handleTrash(rootDir, segments, req, res);
      return;
    }

    if (segments[0] !== "pages") {
      next();
      return;
    }

    try {
      // POST /pages — สร้างเพจใหม่ (แบรนด์ ไม่มี type)
      if (segments.length === 1 && req.method === "POST") {
        const body = JSON.parse((await readBody(req, MAX_JSON_BYTES)).toString("utf8") || "{}");
        const created = await scaffoldPage(rootDir, {
          slug: String(body.slug || "").trim(),
          name: String(body.name || "").trim(),
          shortName: String(body.shortName || "").trim(),
          description: String(body.description || "").trim(),
        });
        sendJson(res, 201, { ok: true, page: created });
        return;
      }

      const slug = segments[1] || "";
      if (!SLUG_PATTERN.test(slug)) {
        sendJson(res, 400, { error: "slug ไม่ถูกต้อง" });
        return;
      }
      const pageDir = path.join(rootDir, "pages", slug);

      // ---- Page-level routes ----

      // GET /pages/<slug> — ข้อมูลเพจ + รายชื่อโปรเจกต์
      if (segments.length === 2 && req.method === "GET") {
        if (!(await pageExists(rootDir, slug))) {
          sendJson(res, 404, { error: `ไม่พบเพจ ${slug}` });
          return;
        }
        const projects = await listProjects(rootDir, slug);
        sendJson(res, 200, { ok: true, slug, projects });
        return;
      }

      // PUT /pages/<slug> — แก้ไข page.config.json (identity เท่านั้น)
      if (segments.length === 2 && req.method === "PUT") {
        if (!(await pageExists(rootDir, slug))) {
          sendJson(res, 404, { error: `ไม่พบเพจ ${slug}` });
          return;
        }
        const body = JSON.parse((await readBody(req, MAX_JSON_BYTES)).toString("utf8") || "{}");
        const configPath = path.join(pageDir, "page.config.json");

        let config = {};
        try {
          config = JSON.parse(await readFile(configPath, "utf8"));
        } catch {
          config = {};
        }
        for (const field of ["name", "shortName", "description"]) {
          if (typeof body[field] === "string") {
            config[field] = body[field].trim();
          }
        }
        if (!config.name) {
          sendJson(res, 400, { error: "ชื่อเพจห้ามว่าง" });
          return;
        }
        await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
        sendJson(res, 200, { ok: true, config });
        return;
      }

      // DELETE /pages/<slug> — ย้ายเพจไป _trash/ (ไม่ลบจริง กู้คืนได้)
      if (segments.length === 2 && req.method === "DELETE") {
        if (!(await pageExists(rootDir, slug))) {
          sendJson(res, 404, { error: `ไม่พบเพจ ${slug}` });
          return;
        }
        const trashDir = path.join(rootDir, "_trash");
        await mkdir(trashDir, { recursive: true });
        const target = path.join(trashDir, `${slug}-${timestampSuffix()}`);
        await rename(pageDir, target);
        sendJson(res, 200, { ok: true, movedTo: path.relative(rootDir, target) });
        return;
      }

      // POST /pages/<slug>/assets/<kind> — อัพโหลด brand asset (ระดับเพจ)
      if (segments.length === 4 && segments[2] === "assets" && req.method === "POST") {
        await handleAssetUpload(rootDir, pageDir, slug, segments[3], req, res);
        return;
      }

      // GET/PUT /pages/<slug>/fb-settings — FB token/pageId ใน page.config.local.json (git-ignored)
      if (segments.length === 3 && segments[2] === "fb-settings") {
        if (!(await pageExists(rootDir, slug))) {
          sendJson(res, 404, { error: `ไม่พบเพจ ${slug}` });
          return;
        }
        await handleLocalJson(pageDir, "page.config.local.json", "facebook", req, res);
        return;
      }

      // GET/PUT /pages/<slug>/calendar — สถานะโพสต์/คิวตั้งเวลา ใน calendar.json (ระดับเพจ)
      if (segments.length === 3 && segments[2] === "calendar") {
        if (!(await pageExists(rootDir, slug))) {
          sendJson(res, 404, { error: `ไม่พบเพจ ${slug}` });
          return;
        }
        await handleLocalJson(pageDir, "calendar.json", null, req, res);
        return;
      }

      // ---- Project routes: /pages/<slug>/projects/... ----
      if (segments[2] === "projects") {
        // POST /pages/<slug>/projects — สร้างโปรเจกต์ใหม่ (เลือก format)
        if (segments.length === 3 && req.method === "POST") {
          const body = JSON.parse((await readBody(req, MAX_JSON_BYTES)).toString("utf8") || "{}");
          const created = await scaffoldProject(rootDir, {
            slug,
            projectSlug: String(body.slug || body.projectSlug || "").trim(),
            name: String(body.name || "").trim(),
            format: String(body.format || "").trim(),
            platform: String(body.platform || "").trim(),
          });
          sendJson(res, 201, { ok: true, project: created });
          return;
        }

        const projectSlug = segments[3] || "";
        if (!SLUG_PATTERN.test(projectSlug)) {
          sendJson(res, 400, { error: "slug โปรเจกต์ไม่ถูกต้อง" });
          return;
        }
        const projectDir = path.join(pageDir, "projects", projectSlug);

        if (!(await projectExists(rootDir, slug, projectSlug))) {
          sendJson(res, 404, { error: `ไม่พบโปรเจกต์ ${projectSlug} ในเพจ ${slug}` });
          return;
        }

        // PUT /pages/<slug>/projects/<proj> — แก้ไข project.config.json
        if (segments.length === 4 && req.method === "PUT") {
          const body = JSON.parse((await readBody(req, MAX_JSON_BYTES)).toString("utf8") || "{}");
          const configPath = path.join(projectDir, "project.config.json");
          let config = {};
          try {
            config = JSON.parse(await readFile(configPath, "utf8"));
          } catch {
            config = {};
          }
          for (const field of ["name", "platform", "aspectRatio", "imageStyle"]) {
            if (typeof body[field] === "string") {
              config[field] = body[field].trim();
            }
          }
          await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
          sendJson(res, 200, { ok: true, config });
          return;
        }

        // DELETE /pages/<slug>/projects/<proj> — ย้ายโปรเจกต์ไป _trash/
        if (segments.length === 4 && req.method === "DELETE") {
          const trashDir = path.join(rootDir, "_trash");
          await mkdir(trashDir, { recursive: true });
          const target = path.join(trashDir, `${slug}__${projectSlug}-${timestampSuffix()}`);
          await rename(projectDir, target);
          sendJson(res, 200, { ok: true, movedTo: path.relative(rootDir, target) });
          return;
        }

        // ---- Project content routes: segments[4] = action ----
        const action = segments[4];

        // POST /projects/<proj>/briefs — สร้างโพสต์ใหม่
        if (action === "briefs" && segments.length === 5 && req.method === "POST") {
          await handleCreateBrief(projectDir, req, res);
          return;
        }

        // GET/PUT /projects/<proj>/briefs/<day>/<content>
        if (action === "briefs" && segments.length === 7) {
          await handleBriefFile(projectDir, segments[5], segments[6], req, res);
          return;
        }

        // POST /projects/<proj>/character-images/<basename>
        if (action === "character-images" && segments.length === 6 && req.method === "POST") {
          await handleCharacterImage(projectDir, segments[5], req, res);
          return;
        }

        // POST /projects/<proj>/covers/<day>
        if (action === "covers" && segments.length === 6 && req.method === "POST") {
          await handleCoverImage(projectDir, segments[5], req, res);
          return;
        }

        // POST /projects/<proj>/images/<day>/<content>[/<shot>]
        if (
          action === "images" &&
          (segments.length === 7 || segments.length === 8) &&
          req.method === "POST"
        ) {
          await handlePostImage(projectDir, segments[5], segments[6], segments[7], req, res);
          return;
        }

        sendJson(res, 404, { error: "ไม่รู้จักคำขอนี้" });
        return;
      }

      sendJson(res, 404, { error: "ไม่รู้จักคำขอนี้" });
    } catch (error) {
      const statusCode = /มีเพจ|มีโปรเจกต์|ห้ามว่าง|ไม่ถูกต้อง|ใหญ่เกินไป|ไม่พบเพจ/.test(
        error.message || ""
      )
        ? 400
        : 500;
      sendJson(res, statusCode, { error: error.message || "เกิดข้อผิดพลาดในระบบ" });
    }
  };

  // ---------- Handlers ----------

  async function handleTrash(rootDir, segments, req, res) {
    const trashDir = path.join(rootDir, "_trash");
    try {
      // GET /trash — รายการเพจในถังขยะ
      if (segments.length === 1 && req.method === "GET") {
        let folders = [];
        try {
          folders = await readdir(trashDir);
        } catch {
          folders = [];
        }
        const entries = [];
        for (const folder of folders) {
          if (!TRASH_FOLDER_PATTERN.test(folder)) continue;
          const { slug, deletedAt } = parseTrashFolder(folder);
          let name = slug;
          try {
            const config = JSON.parse(
              await readFile(path.join(trashDir, folder, "page.config.json"), "utf8")
            );
            name = config.name || slug;
          } catch {
            // โฟลเดอร์ที่ไม่มี config (เช่นโปรเจกต์ที่ลบ หรือซากทดสอบ) แสดงด้วยชื่อ slug
          }
          entries.push({ folder, slug, name, deletedAt });
        }
        entries.sort((a, b) =>
          String(b.deletedAt || "").localeCompare(String(a.deletedAt || ""))
        );
        sendJson(res, 200, { ok: true, entries });
        return;
      }

      const folder = segments[1] || "";
      if (!TRASH_FOLDER_PATTERN.test(folder)) {
        sendJson(res, 400, { error: "ชื่อโฟลเดอร์ในถังขยะไม่ถูกต้อง" });
        return;
      }
      const folderPath = path.join(trashDir, folder);
      const exists = await readdir(folderPath).then(() => true).catch(() => false);
      if (!exists) {
        sendJson(res, 404, { error: `ไม่พบ ${folder} ในถังขยะ` });
        return;
      }

      // POST /trash/<folder>/restore — กู้คืนกลับไป pages/<slug> (เฉพาะเพจ ไม่ใช่โปรเจกต์)
      if (segments.length === 3 && segments[2] === "restore" && req.method === "POST") {
        const { slug } = parseTrashFolder(folder);
        if (folder.includes("__")) {
          sendJson(res, 400, {
            error: "โปรเจกต์ที่ลบต้องกู้คืนด้วยมือ (ย้ายโฟลเดอร์กลับเข้า projects/)",
          });
          return;
        }
        if (!SLUG_PATTERN.test(slug)) {
          sendJson(res, 400, { error: "slug ของเพจนี้ไม่ถูกต้อง กู้คืนอัตโนมัติไม่ได้" });
          return;
        }
        if (await pageExists(rootDir, slug)) {
          sendJson(res, 400, {
            error: `มีเพจ pages/${slug}/ อยู่แล้ว ลบหรือย้ายเพจปัจจุบันก่อนจึงจะกู้คืนได้`,
          });
          return;
        }
        await rename(folderPath, path.join(rootDir, "pages", slug));
        sendJson(res, 200, { ok: true, slug });
        return;
      }

      // DELETE /trash/<folder> — ลบถาวร
      if (segments.length === 2 && req.method === "DELETE") {
        await rm(folderPath, { recursive: true, force: true });
        sendJson(res, 200, { ok: true });
        return;
      }

      sendJson(res, 404, { error: "ไม่รู้จักคำขอนี้" });
    } catch (error) {
      sendJson(res, 500, { error: error.message || "เกิดข้อผิดพลาดในระบบ" });
    }
  }

  // อ่าน/เขียนไฟล์ JSON ในโฟลเดอร์เพจ (fb-settings, calendar)
  //   key != null → เก็บ payload ไว้ใต้ key นั้นในไฟล์ (เช่น { facebook: {...} })
  //   key == null → ทั้งไฟล์คือ payload
  async function handleLocalJson(pageDir, fileName, key, req, res) {
    const filePath = path.join(pageDir, fileName);

    if (req.method === "GET") {
      let doc = {};
      try {
        doc = JSON.parse(await readFile(filePath, "utf8"));
      } catch {
        doc = {};
      }
      sendJson(res, 200, { ok: true, data: key ? doc[key] || null : doc });
      return;
    }

    if (req.method === "PUT") {
      const body = JSON.parse((await readBody(req, MAX_JSON_BYTES)).toString("utf8") || "{}");
      const incoming = body.data !== undefined ? body.data : body;
      let doc = {};
      if (key) {
        try {
          doc = JSON.parse(await readFile(filePath, "utf8"));
        } catch {
          doc = {};
        }
        doc[key] = incoming;
      } else {
        doc = incoming;
      }
      await writeFile(filePath, JSON.stringify(doc, null, 2) + "\n");
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { error: "ไม่รู้จักคำขอนี้" });
  }

  async function handleAssetUpload(rootDir, pageDir, slug, kindKey, req, res) {
    if (!(await pageExists(rootDir, slug))) {
      sendJson(res, 404, { error: `ไม่พบเพจ ${slug}` });
      return;
    }
    const ASSET_KINDS = {
      logo: { dir: ["assets", "logo"], base: "logo" },
      "character-sheet": { dir: ["assets", "logo"], base: "charator-sheet" },
      "style-reference": { dir: ["assets", "style-references"], base: null, prefix: "style-ref" },
      "cover-reference": { dir: ["assets", "cover-references"], base: null, prefix: "cover-ref" },
    };
    const kind = ASSET_KINDS[kindKey];
    if (!kind) {
      sendJson(res, 400, {
        error: "ชนิด asset ไม่ถูกต้อง (logo, character-sheet, style-reference, cover-reference)",
      });
      return;
    }
    const extension = imageExtension(req);
    if (!extension) {
      sendJson(res, 415, { error: "รองรับเฉพาะไฟล์ PNG, JPG หรือ WEBP" });
      return;
    }
    const buffer = await readBody(req, MAX_UPLOAD_BYTES);
    if (!buffer.length) {
      sendJson(res, 400, { error: "ไม่พบข้อมูลไฟล์ภาพ" });
      return;
    }
    const assetDir = path.join(pageDir, ...kind.dir);
    await mkdir(assetDir, { recursive: true });

    let filePath;
    if (kind.base) {
      filePath = await writeImageReplacingBase(assetDir, kind.base, extension, buffer);
    } else {
      const existing = await readdir(assetDir);
      const pattern = new RegExp(`^${kind.prefix}-(\\d+)\\.`);
      let maxIndex = 0;
      for (const file of existing) {
        const match = file.match(pattern);
        if (match) maxIndex = Math.max(maxIndex, Number(match[1]));
      }
      const fileName = `${kind.prefix}-${String(maxIndex + 1).padStart(2, "0")}.${extension}`;
      filePath = path.join(assetDir, fileName);
      await writeFile(filePath, buffer);
    }
    sendJson(res, 200, { ok: true, path: path.relative(rootDir, filePath) });
  }

  async function handleCreateBrief(projectDir, req, res) {
    const body = JSON.parse((await readBody(req, MAX_BRIEF_BYTES)).toString("utf8") || "{}");
    const day = Number(body.day);
    const title = String(body.title || "").trim();

    if (!Number.isInteger(day) || day < 1 || day > 9999) {
      sendJson(res, 400, { error: "day ไม่ถูกต้อง" });
      return;
    }
    if (!title) {
      sendJson(res, 400, { error: "หัวข้อโพสต์ (Title) ห้ามว่าง" });
      return;
    }

    const plannerDir = path.join(projectDir, "content_planner");
    await mkdir(plannerDir, { recursive: true });
    const topicsPath = path.join(plannerDir, "content-topics.md");

    let topicsMarkdown = "";
    try {
      topicsMarkdown = await readFile(topicsPath, "utf8");
    } catch {
      topicsMarkdown = "# Content Topics";
    }

    const briefFiles = await readdir(plannerDir);
    const contentNumber = nextContentNumber(topicsMarkdown, briefFiles, day);

    const fields = {
      title,
      contentType: String(body.contentType || "").trim(),
      objective: String(body.objective || "").trim(),
      keyMessage: String(body.keyMessage || "").trim(),
      visualDirection: String(body.visualDirection || "").trim(),
      imagePrompt: String(body.imagePrompt || "").trim(),
      caption: String(body.caption || "").trim(),
      cta: String(body.cta || "").trim(),
    };

    // โหมดคิวหัวข้อ: ถ้าไม่มีรายละเอียดอื่นนอกจาก title จะอัพเดทแค่ content-topics.md
    const hasDetails = Object.entries(fields).some(([key, value]) => key !== "title" && value);
    if (hasDetails) {
      await writeFile(
        path.join(plannerDir, `day${day}-content-${contentNumber}.md`),
        buildBriefMarkdown({ day, contentNumber, fields })
      );
    }
    await writeFile(topicsPath, upsertTopicsEntry(topicsMarkdown, day, contentNumber, title));
    sendJson(res, 201, { ok: true, day, contentNumber });
  }

  async function handleBriefFile(projectDir, dayRaw, contentRaw, req, res) {
    const day = Number(dayRaw);
    const contentNumber = Number(contentRaw);
    if (!Number.isInteger(day) || !Number.isInteger(contentNumber) || day < 1 || contentNumber < 1) {
      sendJson(res, 400, { error: "day หรือ content number ไม่ถูกต้อง" });
      return;
    }
    const plannerDir = path.join(projectDir, "content_planner");
    const briefPath = path.join(plannerDir, `day${day}-content-${contentNumber}.md`);

    if (req.method === "GET") {
      try {
        const markdown = await readFile(briefPath, "utf8");
        sendJson(res, 200, { ok: true, markdown });
      } catch {
        sendJson(res, 404, { error: `ไม่พบไฟล์ brief day${day}-content-${contentNumber}.md` });
      }
      return;
    }

    if (req.method === "PUT") {
      const body = JSON.parse((await readBody(req, MAX_BRIEF_BYTES)).toString("utf8") || "{}");
      const markdown = String(body.markdown || "");
      if (!markdown.trim()) {
        sendJson(res, 400, { error: "เนื้อหา brief ห้ามว่าง" });
        return;
      }
      await mkdir(plannerDir, { recursive: true });
      await writeFile(briefPath, markdown.endsWith("\n") ? markdown : markdown + "\n");

      // sync หัวข้อใน content-topics.md ให้ตรงกับ Title ใหม่
      const newTitle = extractBriefTitle(markdown);
      if (newTitle) {
        const topicsPath = path.join(plannerDir, "content-topics.md");
        let topicsMarkdown = "";
        try {
          topicsMarkdown = await readFile(topicsPath, "utf8");
        } catch {
          topicsMarkdown = "# Content Topics";
        }
        await writeFile(topicsPath, upsertTopicsEntry(topicsMarkdown, day, contentNumber, newTitle));
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { error: "ไม่รู้จักคำขอนี้" });
  }

  async function handleCharacterImage(projectDir, baseName, req, res) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(baseName || "")) {
      sendJson(res, 400, { error: "ชื่อไฟล์ตัวละครต้องเป็น a-z, 0-9 หรือ -" });
      return;
    }
    const extension = imageExtension(req);
    if (!extension) {
      sendJson(res, 415, { error: "รองรับเฉพาะไฟล์ PNG, JPG หรือ WEBP" });
      return;
    }
    const buffer = await readBody(req, MAX_UPLOAD_BYTES);
    if (!buffer.length) {
      sendJson(res, 400, { error: "ไม่พบข้อมูลไฟล์ภาพ" });
      return;
    }
    const filePath = await writeImageReplacingBase(
      path.join(projectDir, "characters"),
      baseName,
      extension,
      buffer
    );
    sendJson(res, 200, { ok: true, path: path.relative(rootDir, filePath) });
  }

  async function handleCoverImage(projectDir, dayRaw, req, res) {
    const day = Number(dayRaw);
    if (!Number.isInteger(day) || day < 1 || day > 9999) {
      sendJson(res, 400, { error: "day ไม่ถูกต้อง" });
      return;
    }
    const extension = imageExtension(req);
    if (!extension) {
      sendJson(res, 415, { error: "รองรับเฉพาะไฟล์ PNG, JPG หรือ WEBP" });
      return;
    }
    const buffer = await readBody(req, MAX_UPLOAD_BYTES);
    if (!buffer.length) {
      sendJson(res, 400, { error: "ไม่พบข้อมูลไฟล์ภาพ" });
      return;
    }
    const filePath = await writeImageReplacingBase(
      path.join(projectDir, "generated_posts", `day${day}`),
      `day${day}-cover`,
      extension,
      buffer
    );
    sendJson(res, 200, { ok: true, path: path.relative(rootDir, filePath) });
  }

  async function handlePostImage(projectDir, dayRaw, contentRaw, shotRaw, req, res) {
    const day = Number(dayRaw);
    const contentNumber = Number(contentRaw);
    const shotNumber = shotRaw !== undefined ? Number(shotRaw) : null;
    if (
      !Number.isInteger(day) ||
      !Number.isInteger(contentNumber) ||
      day < 1 ||
      contentNumber < 1 ||
      day > 9999 ||
      contentNumber > 99
    ) {
      sendJson(res, 400, { error: "day หรือ content number ไม่ถูกต้อง" });
      return;
    }
    if (shotNumber !== null && (!Number.isInteger(shotNumber) || shotNumber < 1 || shotNumber > 20)) {
      sendJson(res, 400, { error: "หมายเลข shot ไม่ถูกต้อง" });
      return;
    }
    const extension = imageExtension(req);
    if (!extension) {
      sendJson(res, 415, { error: "รองรับเฉพาะไฟล์ PNG, JPG หรือ WEBP" });
      return;
    }
    const buffer = await readBody(req, MAX_UPLOAD_BYTES);
    if (!buffer.length) {
      sendJson(res, 400, { error: "ไม่พบข้อมูลไฟล์ภาพ" });
      return;
    }
    const baseName =
      shotNumber !== null
        ? `day${day}-content-${contentNumber}-shot-${shotNumber}`
        : `day${day}-content-${contentNumber}`;
    const filePath = await writeImageReplacingBase(
      path.join(projectDir, "generated_posts", `day${day}`),
      baseName,
      extension,
      buffer
    );
    sendJson(res, 200, { ok: true, path: path.relative(rootDir, filePath) });
  }
}
