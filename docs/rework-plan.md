# แผนรื้อระบบ: Page → Project → Content

> สถานะ: ✅ เฟส 1-4 เสร็จหมด — รอ verify UI รอบสุดท้าย แล้ว merge เข้า main | อัพเดทล่าสุด: 2026-07-08
> Branch งาน: `rework/page-projects` (main = ระบบเดิม ใช้ได้ตลอด)

## เป้าหมาย

เปลี่ยนจาก "1 เพจ = 1 ประเภทงาน" เป็น "1 เพจ ทำได้ทุกแนว" —
เพจ (แบรนด์ + FB + โลโก้/สไตล์) → โปรเจกต์ (เลือก format: infographic / drama / review) → คอนเทนต์

**กติกาเหล็ก:** ห้ามมี `if (format === ...)` นอกโฟลเดอร์ `formats/`
**ตัววัดสำเร็จ:** เพิ่มแนวใหม่ = เพิ่มไฟล์ format 1 ไฟล์ + ลงทะเบียน 1 บรรทัด จบ

## โครงสร้างเป้าหมาย

```
pages/<page-slug>/
  page.config.json          # identity (schemaVersion: 2, ไม่มี type)
  page.config.local.json    # 🔒 FB token/pageId (gitignore)
  page-brief.md             # โทนเสียงแบรนด์ ใช้ร่วมทุกโปรเจกต์
  calendar.json             # คิวโพสต์ระดับเพจ
  assets/                   # logo / style-references / cover-references (ระดับแบรนด์)
  projects/<project-slug>/
    project.config.json     # { schemaVersion, format, platform, ... }
    characters/             # เฉพาะ drama
    products/               # เฉพาะ review
    content_planner/        # content-topics.md + dayN-content-M.md
    generated_posts/        # dayN/...
```

Asset fallback: หาใน project ก่อน → ไม่มีค่อยใช้ของ page (resolve ฝั่ง server ที่เดียว)

---

## เฟส 0: เตรียมพื้นที่ (ยังไม่แก้อะไร) ✅ เสร็จ

- [x] เปิด branch `rework/page-projects`
- [x] เขียน smoke-test checklist จาก workflow จริง → `docs/smoke-checklist.md`
- [x] รัน checklist กับระบบเดิม 1 รอบ เก็บ baseline (md=25, images=64, config=2; API 200)
- [x] audit path ทั้งหมด → `docs/path-audit.md` (App.jsx 33 จุด/11 globs + backend + scripts)
- [x] เพิ่ม `*.config.local.json` ใน `.gitignore`

**เกณฑ์จบ:** มี checklist + baseline + รายการ path ครบ ✅

## เฟส 1: Backend + Migration ✅ เสร็จ

- [x] `server/formats.mjs` — mini-registry ฝั่ง server (FORMATS: infographic/drama/review + resolvePlatform)
- [x] rewrite `server/scaffold.mjs` → `scaffoldPage` (ไม่มี type) + `scaffoldProject` (ตาม format) + `listProjects`
- [x] rewrite `server/pages-api.mjs` → routes ใหม่ (ทดสอบ curl ผ่านหมด):
  - `POST /api/pages`, `GET/PUT/DELETE /api/pages/:page`
  - `POST /api/pages/:page/projects`, `PUT/DELETE .../:proj`
  - `.../projects/:proj/briefs|character-images|covers|images` (ย้ายใต้ project)
  - `POST /api/pages/:page/assets/:kind` (brand asset — อยู่ระดับเพจ)
  - calendar/fb-settings → เลื่อนไปเฟส 4 (ตามแผน)
- [x] `scripts/migrate-to-projects.mjs` — `--dry-run` + idempotent + backup `_trash/pre-migration-backup/`
  - `drama-1` → `projects/main/` (format: drama, platform: flow-omni-8s)
  - `kaset-intrend` → `projects/main/` (format: infographic)
  - default project = `main` (ใช้ชื่อเดียวกันทุกเพจ ง่าย/คาดเดาได้)
- [x] แก้ `scripts/compose-sheet.mjs` รับ `<page> [project] <day>` (default project=main) + อ่าน project.config.json
- [x] แก้ `scripts/new-page.mjs` log ตรงโครงใหม่
- [x] dry-run → รันจริง → ตรวจไฟล์: **md=25 images=64 เท่า baseline เป๊ะ · git จับ 72 renames (ประวัติต่อเนื่อง)**

**เกณฑ์จบ:** ✅ API ครบ (curl ผ่าน รวมเคสเพิ่ม review ใต้ drama-1 + drama ใต้ kaset) · 2 เพจย้ายครบ ไฟล์เท่าเดิม
**หมายเหตุ:** frontend เดิมยังเรียกไม่ได้ (import.meta.glob ชี้ path เก่า) — เฟส 2 แก้

## เฟส 2: Frontend โครงใหม่

### 2a — data model + navigation + API (ในไฟล์เดียวก่อน) ✅ เสร็จ
- [x] globs ทั้ง 11 อัน เพิ่มชั้น `projects/*/` (content) · asset แบรนด์อยู่ระดับเพจ
- [x] path/content helpers รับ (pageSlug, projectSlug) · post มี projectSlug · buildPages() คืนเพจที่มี `.projects[]`
- [x] content API 6 จุด + gen-command path + compose-sheet command เติม `/projects/<proj>/`
- [x] navigation 3 ชั้น: Dashboard → **PageView (ใหม่)** → workspace เดิม · URL เพิ่ม `&project=` + popstate
- [x] PageView + **CreateProjectModal** (เลือก format) · PageFormModal = brand-only (ไม่ถาม type)
- [x] Dashboard/CalendarPanel วนตามโปรเจกต์ · CSS ของ component ใหม่
- [x] build ผ่าน · content ในโปรเจกต์ resolve ครบ · dev server 200
- [ ] **verify UI จริงบนเบราว์เซอร์** (ผู้ใช้กดคลิก: เปิดเพจ→โปรเจกต์→เขียน brief→gen→เพิ่มโปรเจกต์ที่ 2)

### 2b — แตกไฟล์ (mechanical) ✅ เสร็จ
- [x] แตก App.jsx 4,801 → 843 บรรทัด + 7 modules (content/facebook/api/builders/components/studios/views)
- [x] ย้ายช่วงบรรทัดจริงด้วยสคริปต์ + auto-wire imports จาก registry (ไม่แก้ logic)
- [x] build + transform ทุก module ผ่าน · dev log สะอาด · DAG ไม่มี circular
- [ ] **verify UI จริงหลังแตกไฟล์** (ผู้ใช้กดคลิกซ้ำ — refactor ใหญ่)

**เกณฑ์จบ:** checklist ผ่านเท่า baseline + สร้างโปรเจกต์ format ที่ 2 ใต้เพจเดิมได้
**หมายเหตุ:** FB settings/status ยัง key ด้วย page slug — โปรเจกต์ต่างกันใน day เดียวกันอาจชน status (phase 4 แก้ด้วย calendar.json)

## เฟส 3: Format Registry ✅ เสร็จ

- [x] `src/formats.js` — FORMATS registry (label, isStory, labels, shotGen, studioKey) + getFormat/normalizeFormat/isStoryPage/storyLabels/shotGenFor + FORMAT_LABELS/OPTIONS
  - (ใช้ไฟล์เดียว pure-data แทน โฟลเดอร์ formats/ เพื่อเลี่ยง circular กับ components — import แค่ builders.js)
- [x] แยก buildSceneShotGenCommand → buildDrama/ReviewShotGenCommand (ตัด branch)
- [x] ย้าย format branch เข้า registry: studio dispatch = `STUDIO_MODALS[studioKey]`, coverHint = `labels.coverHint`, shot-gen = `shotGenFor(page)`
- [x] IRON RULE ผ่าน: `grep '=== "drama"/"review"' นอก formats.js` = ว่าง
- [x] build + runtime ผ่าน · ไม่มี circular

**เกณฑ์จบ:** ✅ grep ผ่าน · เพิ่ม format ใหม่ = เพิ่ม entry ใน formats.js (+ studio modal + shotGen builder)

## เฟส 4: Persistence + ปิดงาน ✅ เสร็จ (รอ merge)

- [x] validate FB: ตั้งเวลา ≥10 นาที (มีอยู่แล้ว) + เพิ่ม ≤75 วัน
- [x] ย้าย FB settings → `page.config.local.json` (git-ignored) + สถานะ → `calendar.json` (tracked)
  - server: `GET/PUT /api/pages/:slug/fb-settings|calendar` + `handleLocalJson`
  - frontend: localStorage เป็น cache (sync, ไม่ regression) + ไฟล์เป็น canonical + migrate อัตโนมัติตอน mount
- [x] แก้ collision: status ซ้อนตามโปรเจกต์ `{pageSlug:{projectSlug:{postId}}}` + CalendarPanel วนตามโปรเจกต์
- [x] รื้อ AGENTS.md + README ให้ตรงโครง page→project→format
- [x] smoke checklist ผ่าน: app 200 · API 200 · iron rule 0 · build ผ่าน · content ครบ (drama-1 มีโปรเจกต์ review-2 ที่ผู้ใช้สร้างตอนทดสอบ)
- [ ] merge เข้า main

**เกณฑ์จบ:** เอกสารตรงระบบใหม่ + persistence ลงไฟล์ทำงาน + merge
**หมายเหตุ:** CalendarView + ปุ่ม "ส่งเข้าคิว" แยกต่างหาก — ยังใช้ CalendarPanel เดิม (แสดงคิวรวมทุกโปรเจกต์อยู่แล้ว) พอสำหรับตอนนี้

## หลัง merge (ทดสอบ end-to-end ด้วยงานจริง)

- [ ] ทดลองรีวิวสินค้าจริงตัวแรก (สร้างโปรเจกต์ review ใต้เพจที่มีอยู่)
- [ ] ทดสอบ video prompt ใหม่ 15 ฉากใน Flow

---

## สิ่งที่ตั้งใจ "ไม่ทำ" รอบนี้

- ❌ Multi-channel จริง (IG/TikTok) — เก็บ `channels: []` เป็น array เผื่อไว้พอ
- ❌ ฐานข้อมูล / auth / multi-user — file-based พอสำหรับเครื่องเดียว
- ❌ Cron auto-post ฝั่ง server — ใช้ `scheduled_publish_time` ของ FB อยู่แล้ว

## กติกาความปลอดภัย

- ทำงานบน branch `rework/page-projects` เท่านั้น — main แตะไม่ได้จนกว่าจะ merge
- migration ย้ายไฟล์อย่างเดียว ห้ามแก้เนื้อไฟล์ + backup ก่อนเสมอ
- commit ถี่ ทีละเรื่อง — เจอปัญหา bisect ได้
- จบทุกเฟสต้องรัน smoke checklist ก่อนไปต่อ
- token FB ห้ามเข้า git (`*.config.local.json` อยู่ใน .gitignore ตั้งแต่เฟส 0)
