#!/usr/bin/env node
// ประกอบชีทสตอรี่บอร์ด (production sheet 4:5) จากภาพช็อต + ข้อมูลใน Shot List
// ตัวหนังสือไทยทั้งหมด render ด้วยฟอนต์จริงผ่าน HTML → headless Chrome ไม่มีทางเพี้ยน
//
// เพจ type "drama" (ค่าเริ่มต้น) → ชีทสตอรี่บอร์ดแบบสะอาด (แถบ Shot + ภาพเรียงคอลัมน์ ไม่มีตารางข้อมูล
//                                  — ข้อมูลราย shot ทีมงานอ่านจากหน้าเว็บของฉาก; ชีทใช้เป็น visual reference เจนวิดีโอ)
// เพจ type "review" (จาก page.config.json) → ชีทรีวิวสินค้าแนว UGC (แถวละช็อต: ภาพ + overlay ลายมือ
// บนภาพ + แผงข้อมูล เวลา/มุมกล้อง/การเคลื่อนกล้อง/Overlay/Voice Over) ตามสเปกใน AGENTS.md
//
// Usage:
//   node scripts/compose-sheet.mjs <page-slug> <day> [content] [--out <path>]
//
//   <day>      เลขเรื่อง/เลขรีวิว เช่น 3 หรือ day3
//   [content]  เลขฉาก/เลขคลิป เช่น 2 — ถ้าไม่ระบุ compose ทุกไฟล์ของ day นั้น
//   --out      เขียนผลลัพธ์ไปไฟล์อื่น (ใช้ preview ได้ ไม่ทับของจริง; ใช้ได้เฉพาะตอนระบุ content)
//
// Input ต่อฉาก:
//   pages/<slug>/content_planner/day<N>-content-<M>.md          (Shot List + บทพูด/Voice Over)
//   pages/<slug>/content_planner/content-topics.md              (ชื่อเรื่อง/สินค้าจาก "## Day N — <ชื่อ>")
//   pages/<slug>/generated_posts/day<N>/shots/day<N>-content-<M>-shot-<K>.png|jpg|jpeg|webp
// Output:
//   pages/<slug>/generated_posts/day<N>/day<N>-content-<M>.png  (path เดิมที่หน้าเว็บอ่านอยู่แล้ว)

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SHEET_WIDTH = 1600;
const SHEET_HEIGHT = 2000; // 4:5
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    fail("หา Chrome/Chromium ไม่เจอ — ตั้ง env CHROME_BIN ให้ชี้ไปที่ binary ของเบราว์เซอร์");
  }
  return found;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getSection(markdown, heading) {
  const pattern = new RegExp(`^##\\s+${heading}\\s*$`, "m");
  const match = markdown.match(pattern);
  if (!match) {
    return "";
  }
  const start = match.index + match[0].length;
  const rest = markdown.slice(start);
  const next = rest.search(/^##\s+/m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function getStoryTitle(pageDir, day) {
  const topicsPath = path.join(pageDir, "content_planner", "content-topics.md");
  if (!fs.existsSync(topicsPath)) {
    return "";
  }
  const topics = fs.readFileSync(topicsPath, "utf8");
  const match = topics.match(new RegExp(`^##\\s+Day\\s+${day}\\s*(?:[—–-]\\s*(.+))?$`, "m"));
  return match && match[1] ? match[1].trim() : "";
}

// อ่าน project.config.json (format/platform/aspectRatio ย้ายมาอยู่ระดับโปรเจกต์แล้ว)
function readProjectConfig(projectDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(projectDir, "project.config.json"), "utf8"));
  } catch {
    return {};
  }
}

function parseShotList(markdown) {
  const shots = [];
  for (const rawLine of getSection(markdown, "Shot List").split(/\r?\n/)) {
    const line = rawLine.replace(/^-+\s*/, "").trim();
    const head = line.match(/^Shot\s+(\d+)\s*\(([^,)]*?)\s*(?:วิ\.?|วินาที)?\s*,\s*([^)]*)\)\s*:\s*(.*)$/i);
    if (!head) {
      continue;
    }
    const shot = {
      number: Number(head[1]),
      time: head[2].trim(),
      camera: head[3].trim(),
      action: head[4].trim(),
      detail: "",
      emotion: "",
      keyObject: "",
    };
    // แยก field ท้ายบรรทัด: "<action> — รายละเอียดภาพ: ... — อารมณ์: ... — วัตถุสำคัญ: ..."
    const fieldMap = { "รายละเอียดภาพ": "detail", "อารมณ์": "emotion", "วัตถุสำคัญ": "keyObject" };
    const parts = shot.action.split(/\s+[—–]\s+/);
    shot.action = parts[0].trim();
    for (const part of parts.slice(1)) {
      const field = part.match(/^([^:]+):\s*(.*)$/);
      if (field && fieldMap[field[1].trim()]) {
        shot[fieldMap[field[1].trim()]] = field[2].trim();
      } else {
        shot.detail = shot.detail ? `${shot.detail} — ${part.trim()}` : part.trim();
      }
    }
    shots.push(shot);
  }
  return shots;
}

// อ่าน section ที่ผูกราย shot ("- Shot K — ..." หรือ "- Shot K: ...") เช่น บทพูด, เสียง
// บรรทัดที่ไม่ระบุ shot (format เก่าระดับฉาก) เก็บใน rest
function parseShotLines(markdown, heading) {
  const byShot = {};
  const rest = [];
  for (const rawLine of getSection(markdown, heading).split(/\r?\n/)) {
    const line = rawLine.replace(/^-+\s*/, "").trim();
    if (!line) {
      continue;
    }
    const match = line.match(/^Shot\s+(\d+)\s*[—–:-]\s*(.+)$/i);
    if (match) {
      (byShot[Number(match[1])] ??= []).push(match[2].trim());
    } else {
      rest.push(line);
    }
  }
  return { byShot, rest };
}

// รีวิว: แตก field เพิ่มจาก Shot List — meta ในวงเล็บคือ "เวลา, มุมกล้อง, การเคลื่อนกล้อง"
// และท้ายบรรทัดอาจมี "— จุดขาย: ..." (parseShotList ยัดไว้ใน detail เพราะไม่รู้จัก field นี้)
function withReviewShotFields(shots) {
  return shots.map((shot) => {
    const [angle, ...movementParts] = shot.camera.split(/\s*,\s*/);
    let sellingPoint = "";
    const detailParts = [];
    for (const part of shot.detail ? shot.detail.split(/\s+[—–]\s+/) : []) {
      const field = part.match(/^จุดขาย:\s*(.*)$/);
      if (field) {
        sellingPoint = field[1].trim();
      } else if (part.trim()) {
        detailParts.push(part.trim());
      }
    }
    return {
      ...shot,
      angle: (angle || "").trim(),
      movement: movementParts.join(", ").trim(),
      sellingPoint,
      detail: detailParts.join(" — "),
    };
  });
}

// รีวิว: อ่าน section ราย shot ที่มีโทนในวงเล็บได้ เช่น `- Shot 1 (สดใส): "ข้อความ"`
// คืน { number: { tone, text } } — ตัดเครื่องหมายคำพูดรอบข้อความออกให้เอง
function parseReviewShotLines(markdown, heading) {
  const byShot = {};
  for (const rawLine of getSection(markdown, heading).split(/\r?\n/)) {
    const line = rawLine.replace(/^-+\s*/, "").trim();
    if (!line) {
      continue;
    }
    const match = line.match(/^Shot\s+(\d+)\s*(?:\(([^)]*)\))?\s*[—–:-]\s*(.+)$/i);
    if (!match) {
      continue;
    }
    byShot[Number(match[1])] = {
      tone: (match[2] || "").trim(),
      text: match[3].trim().replace(/^["“]\s*/, "").replace(/\s*["”]$/, ""),
    };
  }
  return byShot;
}

function findShotImage(dayDir, day, content, shotNumber) {
  for (const ext of IMAGE_EXTENSIONS) {
    const candidate = path.join(dayDir, "shots", `day${day}-content-${content}-shot-${shotNumber}.${ext}`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function sceneLengthSeconds(shots) {
  let max = 0;
  for (const shot of shots) {
    const range = shot.time.match(/([\d.]+)\s*-\s*([\d.]+)/);
    if (range) {
      max = Math.max(max, Number(range[2]));
    }
  }
  return max ? String(max).replace(/\.0$/, "") : "";
}

// อ่านสัดส่วนภาพ (กว้าง/สูง) จาก header ของไฟล์ PNG/JPEG — ใช้เลือกความสูงแถวภาพและวิธี crop
function imageAspect(file) {
  try {
    const buf = fs.readFileSync(file);
    if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      if (width && height) {
        return width / height;
      }
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) {
          i += 1;
          continue;
        }
        const marker = buf[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          const height = buf.readUInt16BE(i + 5);
          const width = buf.readUInt16BE(i + 7);
          if (width && height) {
            return width / height;
          }
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
  } catch {
    // ใช้ค่า default ด้านล่าง
  }
  return 9 / 16;
}

// เลย์เอาต์ชีทสตอรี่บอร์ดแบบสะอาด: แถบ "Shot K" กรมท่า + ภาพเรียงชิดเต็มแถว (ไม่มีตารางข้อมูล)
// ข้อมูลราย shot (บทพูด/action/อารมณ์/เสียง ฯลฯ) ทีมงานอ่านจากหน้าเว็บของฉากแทน —
// ชีทนี้มีไว้เป็น visual reference ตอนเจนวิดีโอ จึงต้องสะอาด ไม่มีตัวหนังสือให้โมเดลสับสน/ลอกเป็น subtitle
// ความสูงชีท = fit ตามเนื้อหา (แถบ + ภาพ) ไม่ fix 4:5 อีกต่อไป
function buildSheetHtml({ shots, images }) {
  const columns = Math.max(shots.length, 1);
  const PAGE_PAD = 24;
  const GAP = 4;
  const SHOT_BAR_H = 62;
  const colWidth = (SHEET_WIDTH - PAGE_PAD * 2 - GAP * (columns - 1)) / columns;

  const aspects = shots
    .map((shot) => (images[shot.number] ? imageAspect(images[shot.number]) : null))
    .filter(Boolean)
    .sort((a, b) => a - b);
  const aspect = aspects.length ? aspects[Math.floor(aspects.length / 2)] : 9 / 16;
  const imageHeight = Math.round(Math.min(1500, Math.max(280, colWidth / aspect)));
  const cellAspect = colWidth / imageHeight;

  const imageCells = shots
    .map((shot) => {
      const imagePath = images[shot.number];
      if (!imagePath) {
        return `<div class="img-cell"><div class="missing">ยังไม่มีภาพ<br>Shot ${shot.number}</div></div>`;
      }
      // สัดส่วนภาพใกล้เคียงช่อง → crop เต็มช่องแบบ ref / ต่างกันมาก → letterbox บนพื้นกรมท่าเข้ม
      const shotAspect = imageAspect(imagePath);
      const fit = Math.abs(shotAspect - cellAspect) / cellAspect < 0.18 ? "cover" : "contain";
      return `<div class="img-cell"><img style="object-fit:${fit}" src="${escapeHtml(pathToFileURL(imagePath).href)}" alt=""></div>`;
    })
    .join("");

  const height = PAGE_PAD * 2 + SHOT_BAR_H + GAP + imageHeight;

  const html = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root { --navy: #1b2b4d; --navy-dark: #101d38; }
  html, body { width: ${SHEET_WIDTH}px; height: ${height}px; background: #fff; }
  body {
    font-family: "Sukhumvit Set", "Thonburi", "Noto Sans Thai", sans-serif;
    display: flex; flex-direction: column;
    padding: ${PAGE_PAD}px;
  }
  .shot-bar {
    flex: 0 0 ${SHOT_BAR_H}px;
    display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: ${GAP}px;
  }
  .shot-bar div {
    background: var(--navy); color: #fff;
    font-size: 28px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .images {
    flex: 0 0 auto;
    display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: ${GAP}px;
    margin-top: ${GAP}px;
  }
  .img-cell {
    height: ${imageHeight}px;
    background: var(--navy-dark);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .img-cell img { width: 100%; height: 100%; display: block; }
  .missing { color: #8fa0c4; text-align: center; line-height: 1.6; font-size: 22px; }
</style>
</head>
<body>
  <div class="shot-bar">${shots.map((shot) => `<div>Shot ${shot.number}</div>`).join("")}</div>
  <div class="images">${imageCells}</div>
</body>
</html>`;

  return { html, height };
}

// เลย์เอาต์ชีทรีวิวสินค้าแนว UGC (ตามภาพ ref ของผู้ใช้): แถวละช็อต —
// ภาพแถบกว้างซ้าย (มีเลขช็อต + ข้อความ overlay ลายมือทับบนภาพ) + แผงข้อมูลขวา
// (เวลา/มุมกล้อง/การเคลื่อนกล้อง/จุดขาย/Overlay/Voice Over) ปิดท้ายแถบสเปกคลิป
function buildReviewSheetHtml({ productName, day, clipNumber, length, shots, images, voByShot, overlayByShot, aspectLabel }) {
  const rows = shots
    .map((shot) => {
      const imagePath = images[shot.number];
      const overlay = overlayByShot[shot.number];
      const vo = voByShot[shot.number];
      const overlayOnImage = overlay
        ? `<div class="overlay-text">${escapeHtml(overlay.text)}</div>`
        : "";
      const media = imagePath
        ? `<img src="${escapeHtml(pathToFileURL(imagePath).href)}" alt="">${overlayOnImage}`
        : `<div class="missing">ยังไม่มีภาพ<br>Shot ${shot.number}</div>`;
      const infoLines = [
        ["มุมกล้อง", shot.angle],
        ["การเคลื่อนกล้อง", shot.movement],
        ["จุดขาย", shot.sellingPoint],
        ["Overlay", overlay ? overlay.text : ""],
        ["Voice Over", vo ? (vo.tone ? `(${vo.tone}) ${vo.text}` : vo.text) : ""],
      ]
        .filter(([, value]) => value)
        .map(
          ([label, value]) =>
            `<div class="info-line"><span class="info-label">${escapeHtml(label)}</span>${escapeHtml(value)}</div>`,
        )
        .join("");
      return `<div class="row">
        <div class="row-img"><span class="badge">${shot.number}</span>${media}</div>
        <div class="row-info">
          <div class="info-head">ฉาก ${shot.number} <span class="time">${escapeHtml(shot.time)} วิ</span></div>
          ${infoLines}
        </div>
      </div>`;
    })
    .join("");

  const footer = ["UGC REVIEW", length ? `${length} SECONDS` : "", `${shots.length} SHOTS`, "THAI NARRATION", aspectLabel]
    .filter(Boolean)
    .join("   |   ");
  const sizeClass = shots.length <= 3 ? "size-lg" : "size-sm";

  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root { --ink: #3d3a35; --cream: #f6f2ea; --line: #e3dcd0; --accent: #8a7a63; }
  html, body { width: ${SHEET_WIDTH}px; height: ${SHEET_HEIGHT}px; background: #fbf9f5; }
  body {
    font-family: "Sukhumvit Set", "Thonburi", "Noto Sans Thai", sans-serif;
    color: var(--ink);
    display: flex; flex-direction: column;
    padding: 26px 26px 0;
  }
  header { flex: 0 0 auto; text-align: center; padding: 10px 0 18px; }
  header h1 { font-size: 44px; font-weight: 800; line-height: 1.25; }
  header .sub { font-size: 23px; margin-top: 6px; color: #7d766b; }
  .rows { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; gap: 10px; }
  .row { flex: 1 1 0; min-height: 0; display: flex; gap: 10px; }
  .row-img {
    flex: 0 0 62%; position: relative; overflow: hidden;
    background: #e9e3d8; border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
  }
  .row-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .badge {
    position: absolute; top: 12px; left: 12px; z-index: 2;
    width: 44px; height: 44px; border-radius: 50%;
    background: rgba(255, 255, 255, 0.92); color: var(--ink);
    font-size: 24px; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.18);
  }
  .overlay-text {
    position: absolute; left: 20px; bottom: 16px; z-index: 2; max-width: 82%;
    font-family: "Sriracha", "Itim", "Ayuthaya", "Sukhumvit Set", "Thonburi", sans-serif;
    color: #fff; line-height: 1.35;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.55), 0 0 2px rgba(0, 0, 0, 0.4);
    transform: rotate(-2deg); transform-origin: left bottom;
  }
  .missing { color: #a99f8e; text-align: center; line-height: 1.6; font-size: 22px; }
  .row-info {
    flex: 1 1 auto; min-width: 0; overflow: hidden;
    background: var(--cream); border: 1px solid var(--line); border-radius: 14px;
    padding: 14px 18px;
    display: flex; flex-direction: column; justify-content: center; gap: 7px;
  }
  .info-head { font-weight: 800; color: var(--ink); }
  .info-head .time {
    font-weight: 700; color: #6f675a;
    background: #fff; border: 1px solid var(--line); border-radius: 999px;
    padding: 2px 12px; margin-left: 8px;
  }
  .info-line { overflow-wrap: break-word; }
  .info-label { display: block; font-weight: 700; color: var(--accent); }
  footer {
    flex: 0 0 auto; text-align: center;
    font-size: 20px; font-weight: 700; letter-spacing: 1px; color: #857c6d;
    padding: 14px 0 16px; margin-top: 12px;
    border-top: 1px solid var(--line);
  }
  .size-lg .overlay-text { font-size: 44px; }
  .size-lg .info-head { font-size: 26px; } .size-lg .info-head .time { font-size: 20px; }
  .size-lg .info-line { font-size: 21px; } .size-lg .info-label { font-size: 19px; }
  .size-sm .overlay-text { font-size: 34px; }
  .size-sm .info-head { font-size: 22px; } .size-sm .info-head .time { font-size: 17px; }
  .size-sm .info-line { font-size: 18px; } .size-sm .info-label { font-size: 16px; }
</style>
</head>
<body class="${sizeClass}">
  <header>
    <h1>${escapeHtml(productName)}</h1>
    <div class="sub">${escapeHtml(`Storyboard รีวิวที่ ${day}${clipNumber > 1 ? ` — คลิปที่ ${clipNumber}` : ""}`)}</div>
  </header>
  <div class="rows">${rows}</div>
  <footer>${escapeHtml(footer)}</footer>
</body>
</html>`;
}

// Chrome headless บางรุ่นเขียน screenshot เสร็จแล้วไม่ยอมปิดตัวเอง —
// รอจนเห็นข้อความ "bytes written to file" ใน stderr แล้ว kill เอง
function renderHtmlToPng(chrome, html, outPath, renderHeight = SHEET_HEIGHT) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "compose-sheet-"));
  const htmlPath = path.join(workDir, "sheet.html");
  const shotPath = path.join(workDir, "sheet.png");
  fs.writeFileSync(htmlPath, html);

  return new Promise((resolve, reject) => {
    const child = spawn(
      chrome,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-first-run",
        "--no-default-browser-check",
        "--force-device-scale-factor=1",
        `--user-data-dir=${path.join(workDir, "profile")}`,
        `--window-size=${SHEET_WIDTH},${renderHeight}`,
        `--screenshot=${shotPath}`,
        "--default-background-color=FFFFFFFF",
        pathToFileURL(htmlPath).href,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );

    let stderr = "";
    let settled = false;
    const finish = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      child.kill("SIGKILL");
      try {
        if (!error) {
          if (!fs.existsSync(shotPath)) {
            error = new Error(`Chrome ไม่ได้เขียนไฟล์ screenshot:\n${stderr.slice(-2000)}`);
          } else {
            fs.mkdirSync(path.dirname(outPath), { recursive: true });
            fs.copyFileSync(shotPath, outPath);
          }
        }
      } catch (copyError) {
        error = copyError;
      }
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch {
        // On Windows Chrome can briefly keep the temp profile locked after screenshot write.
      }
      error ? reject(error) : resolve();
    };

    const timer = setTimeout(() => finish(new Error(`Chrome render เกิน 45 วินาที:\n${stderr.slice(-2000)}`)), 45000);
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (stderr.includes("bytes written to file")) {
        finish();
      }
    });
    child.on("exit", () => finish());
    child.on("error", (error) => finish(error));
  });
}

async function composeScene({ chrome, pageDir, slug, day, content, outOverride }) {
  const scenePath = path.join(pageDir, "content_planner", `day${day}-content-${content}.md`);
  if (!fs.existsSync(scenePath)) {
    fail(`ไม่พบไฟล์ฉาก ${path.relative(rootDir, scenePath)}`);
  }
  const markdown = fs.readFileSync(scenePath, "utf8");
  const shots = parseShotList(markdown);
  if (!shots.length) {
    console.warn(`⚠ day${day}-content-${content}.md ไม่มี Shot List ที่อ่านได้ — ข้าม`);
    return false;
  }

  const isReview = readProjectConfig(pageDir).format === "review";
  const heading = markdown.match(/^#\s+[^\n]*?[—–-]\s*(.+)$/m);
  const beat = heading ? heading[1].trim() : "";
  const storyTitle = getStoryTitle(pageDir, day) || (isReview ? `รีวิวที่ ${day}` : `เรื่องที่ ${day}`);
  const length = sceneLengthSeconds(shots);

  const dayDir = path.join(pageDir, "generated_posts", `day${day}`);
  const images = {};
  const missing = [];
  for (const shot of shots) {
    const image = findShotImage(dayDir, day, content, shot.number);
    if (image) {
      images[shot.number] = image;
    } else {
      missing.push(shot.number);
    }
  }
  if (!Object.keys(images).length) {
    console.warn(
      `⚠ day${day}-content-${content}: ยังไม่มีภาพช็อตสักภาพใน generated_posts/day${day}/shots/ — ข้าม (ไม่เขียนทับชีทเดิม)`,
    );
    return false;
  }
  if (missing.length) {
    console.warn(
      `⚠ day${day}-content-${content}: ยังไม่มีภาพช็อต ${missing.join(", ")} ` +
        `(ต้องมี generated_posts/day${day}/shots/day${day}-content-${content}-shot-<K>.png) — ช่องนั้นจะเป็น placeholder`,
    );
  }

  const outPath = outOverride || path.join(dayDir, `day${day}-content-${content}.png`);
  if (isReview) {
    const html = buildReviewSheetHtml({
      productName: storyTitle || beat,
      day,
      clipNumber: Number(content),
      length,
      shots: withReviewShotFields(shots),
      images,
      voByShot: parseReviewShotLines(markdown, "Voice Over"),
      overlayByShot: parseReviewShotLines(markdown, "Overlay"),
      aspectLabel: readProjectConfig(pageDir).aspectRatio || "9:16",
    });
    await renderHtmlToPng(chrome, html, outPath);
  } else {
    const { html, height } = buildSheetHtml({ shots, images });
    await renderHtmlToPng(chrome, html, outPath, height);
  }
  console.log(`✓ ${path.relative(rootDir, outPath)} (${shots.length} ช็อต${missing.length ? `, ขาดภาพ ${missing.length}` : ""})`);
  return true;
}

// ---- CLI ----
const args = process.argv.slice(2);
let outOverride = null;
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out") {
    outOverride = path.resolve(args[++i] || fail("--out ต้องตามด้วย path"));
  } else {
    positional.push(args[i]);
  }
}

// รับได้ 2 แบบ:  <page> <project> <day> [content]   หรือ  <page> <day> [content] (project = "main")
const isDayToken = (v) => /^(day)?\d+$/i.test(String(v || ""));
let [slug, projectArg, dayArg, contentArg] = positional;
if (slug && isDayToken(projectArg)) {
  // ไม่ได้ระบุ project → เลื่อน argument แล้ว default เป็น "main"
  [contentArg, dayArg, projectArg] = [dayArg, projectArg, "main"];
}
if (!slug || !projectArg || !dayArg) {
  fail("วิธีใช้: node scripts/compose-sheet.mjs <page-slug> [project-slug] <day> [content] [--out <path>]");
}
const day = String(dayArg).replace(/^day/i, "");
const pageDir = path.join(rootDir, "pages", slug, "projects", projectArg);
if (!fs.existsSync(pageDir)) {
  fail(`ไม่พบโปรเจกต์ pages/${slug}/projects/${projectArg}/`);
}
if (outOverride && !contentArg) {
  fail("--out ใช้ได้เฉพาะตอนระบุเลขฉาก (content) ตัวเดียว");
}

const chrome = findChrome();

if (contentArg) {
  await composeScene({ chrome, pageDir, slug, day, content: String(contentArg).replace(/^content-?/i, ""), outOverride });
} else {
  const plannerDir = path.join(pageDir, "content_planner");
  const scenePattern = new RegExp(`^day${day}-content-(\\d+)\\.md$`);
  const contents = fs
    .readdirSync(plannerDir)
    .map((name) => name.match(scenePattern))
    .filter(Boolean)
    .map((match) => Number(match[1]))
    .sort((a, b) => a - b);
  if (!contents.length) {
    fail(`ไม่พบไฟล์ฉากของ day${day} ใน pages/${slug}/projects/${projectArg}/content_planner/`);
  }
  let done = 0;
  for (const content of contents) {
    if (await composeScene({ chrome, pageDir, slug, day, content, outOverride: null })) {
      done += 1;
    }
  }
  console.log(`เสร็จ ${done}/${contents.length} ฉาก`);
}
