# Path Audit — จุดที่ hardcode path (ต้องแก้ตอนย้ายเป็น page→project)

> เก็บตอนเฟส 0 · ทุกจุดนี้ path จะเปลี่ยนจาก `pages/<slug>/...` เป็น `pages/<slug>/projects/<proj>/...`
> (ยกเว้น asset ระดับแบรนด์: logo, style-references, cover-references, page.config.json → ยังอยู่ชั้นเพจ)

## 🔴 วิกฤต — Frontend build-time globs (`src/App.jsx`)

Vite แปลง `import.meta.glob("../pages/*/...")` ตอน build ถ้า path ไม่ตรง = ไฟล์โหลดไม่ขึ้น **เงียบ ๆ** (ไม่ error) นี่คือจุดอันตรายสุด

| บรรทัด | glob | ย้ายชั้น project? |
|---|---|---|
| 16 | `../pages/*/page.config.json` | ❌ อยู่ชั้นเพจ (แต่เพิ่ม glob ใหม่ `*/projects/*/project.config.json`) |
| 21 | `../pages/*/content_planner/content-topics.md` | ✅ → `*/projects/*/content_planner/...` |
| 27 | `../pages/*/content_planner/day*-content-*.md` | ✅ |
| 33 | `../pages/*/generated_posts/day*/*.{png,jpg,jpeg,webp}` | ✅ |
| 42 | `../pages/*/generated_posts/day*/shots/...` | ✅ |
| 50 | `../pages/*/assets/logo/logo.*` | ❌ อยู่ชั้นเพจ (แบรนด์) |
| 55 | `../pages/*/assets/logo/charator-sheet.*` | ❌ อยู่ชั้นเพจ |
| 63 | `../pages/*/assets/style-references/*` | ⚠️ fallback: project ก่อน → page |
| 71 | `../pages/*/assets/cover-references/*` | ⚠️ fallback: project ก่อน → page |
| 79 | `../pages/*/characters/characters.md` | ✅ → project (เฉพาะ drama) |
| 85 | `../pages/*/characters/*.{png,...}` | ✅ → project |

## 🔴 วิกฤต — Frontend path builders (`src/App.jsx`)

string template ที่ประกอบ key ไปหยิบจาก module map — ต้องเปลี่ยนพร้อม glob (คู่กัน)

| บรรทัด | ฟังก์ชัน/จุด | หมายเหตุ |
|---|---|---|
| 146 | `getImagePath(pageSlug, day, content)` | + projectSlug |
| 153 | `getShotImagePath(...)` | + projectSlug |
| 160 | `getStoryCoverPath(...)` | + projectSlug |
| 305 | character image prefix | + projectSlug |
| 311 | topics key | + projectSlug |
| 319 | brief key | + projectSlug |
| 413 | page config key | อยู่ชั้นเพจ |
| 422–431 | asset path `.startsWith()` เช็ค 4 จุด | logo/sheet=page, style/cover=fallback |
| 2734, 2881 | charactersDoc key | + projectSlug |

รวม `../pages/` ใน App.jsx = **33 จุด** · globs = **11 อัน** (นับตอนเฟส 0)

## 🟡 Backend (`server/`)

| ไฟล์ | จุด | งาน |
|---|---|---|
| `server/scaffold.mjs` | ทั้งไฟล์ | แยกเป็น `scaffoldPage` (ไม่มี type) + `scaffoldProject` (ตาม format) |
| `server/pages-api.mjs` | routes ~L190–660 | เพิ่มชั้น `/projects/:proj`; ของ content/asset/image ย้ายใต้ project |
| `server/pages-api.mjs` | L602, L655 | `generated_posts/dayN` → ใต้ project |

## 🟡 Scripts

| ไฟล์ | จุด | งาน |
|---|---|---|
| `scripts/compose-sheet.mjs` | L691 `pageDir = pages/<slug>`, L600/617/704 | รับ arg เพิ่ม: `<page> <project>` แล้วชี้ pageDir → projectDir |
| `scripts/compose-sheet.mjs` | L611 `readPageConfig().type === "review"` | อ่าน format จาก project.config.json แทน |
| `scripts/new-page.mjs` | L31–36 log paths | อัปเดต หรือ deprecate (ให้ API เป็นทางหลัก) |

## ✅ ไม่ต้องแตะ

- โค้ดโพสต์/ตั้งเวลา FB (`src/App.jsx` L566–700) — รับ media+caption ไม่ผูก path เพจ
- เนื้อไฟล์ .md / รูป — migration ย้าย path อย่างเดียว ไม่แก้เนื้อ

## Baseline (เก็บ 2026-07-08 — ต้องเท่าเดิมหลัง migrate)

```
[drama-1]       type: drama          md=20  images=52
[kaset-intrend] (no type=infographic) md=5   images=12
รวม: md=25  images=64  config=2
API: GET / =200, GET /api/trash =200
```
