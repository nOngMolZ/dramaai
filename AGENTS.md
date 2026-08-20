# Repository Guidelines

## Project Structure & Module Organization
This repository is a content workspace for image-first social posts plus a small React/Vite viewer used to review and publish content. The model has **three levels**:

- **Page (brand)** — a Facebook page identity: name, logo, brand style, FB credentials. One folder per page under `pages/`.
- **Project** — a body of work inside a page, tied to one **format** (`infographic` | `drama` | `review`). A page can hold many projects of any format, so one page can do infographics *and* short dramas *and* product reviews without cloning the page.
- **Content** — the posts/episodes/clips inside a project.

Brand assets live at the **page** level; content lives at the **project** level:

- `pages/<page-slug>/page.config.json`: brand identity (`schemaVersion`, `name`, `shortName`, `description`, `channels`). No `type`/format here.
- `pages/<page-slug>/page.config.local.json`: 🔒 Facebook token/pageId (git-ignored). Optional.
- `pages/<page-slug>/page-brief.md`: brand positioning, mascot tone, content pillars, visual direction (shared by all projects).
- `pages/<page-slug>/assets/logo/`: brand logo + character sheet.
- `pages/<page-slug>/assets/style-references/`: optional style refs (brand-level). If present, attach 2–3 every time an image is generated (style/layout/palette only — never copy their text).
- `pages/<page-slug>/assets/cover-references/`: optional poster refs (used by drama projects for story covers).
- `pages/<page-slug>/projects/<project-slug>/project.config.json`: `{ schemaVersion, format, name, platform? }`.
- `pages/<page-slug>/projects/<project-slug>/content_planner/`: topic list + per-post Markdown briefs.
- `pages/<page-slug>/projects/<project-slug>/generated_posts/`: exported images ready to review/publish, grouped by day (`generated_posts/day1/`).
- `pages/<page-slug>/projects/<project-slug>/characters/`: (drama/review) `characters.md` + master reference images — Character Lock.
- `pages/<page-slug>/projects/<project-slug>/products/<product-slug>/`: (review) รูปสินค้าต้นฉบับจากผู้ใช้ — Product Lock references.
- `src/`: React viewer. `App.jsx` (routing Dashboard→Page→Project), `content.js` (build-time data + PAGES), `formats.js` (**Format Registry** — the one place format-specific behaviour lives), `builders.js` (prompt/command builders), `components.jsx`/`views.jsx`/`studios.jsx` (UI), `facebook.js`, `api.js`.
- `server/formats.mjs`: server-side format registry (which dirs/templates each format scaffolds).
- `server/scaffold.mjs`: `scaffoldPage` + `scaffoldProject`. `server/pages-api.mjs`: connect-style API mounted at `/api` by a Vite plugin (dev only).
- `scripts/new-page.mjs`: CLI to create a page (brand). `scripts/migrate-to-projects.mjs`: one-time migration of old page-with-type folders into page→project.
- `_trash/`: deleted pages/projects moved here (never hard-deleted). Git-ignored.
- `index.html`, `vite.config.js`, `package.json`, `dist/`: Vite app entry/tooling/build output.

Current pages:
- `pages/kaset-intrend/` — Thai agriculture knowledge, rustic wood/parchment infographics, host "ลุง Boss", **vertical 4:5**, style refs in `assets/style-references/`. Project: `projects/main/` (format `infographic`).
- `pages/drama-1/` — "ติดละคร" short moral-drama studio, 9:16 clips on Flow · Omni Flash. Project: `projects/main/` (format `drama`).

Each page's `page-brief.md` defines pillars/templates, image style, aspect ratio, caption formula, and hashtag rules — always read it before creating content. Each project's `project.config.json` carries its format + platform.

**Adding a new format** = one entry in `src/formats.js` (frontend) + one in `server/formats.mjs` (scaffold) — do not scatter `if (format === …)` anywhere else.

**Image style presets**: each drama/review project can pick a visual style (`imageStyle` in `project.config.json`) from `src/style-presets.js` (e.g. `chinese-wuxia`, `thai-tv-drama`, `horror`, `premium-commercial`). When set, the generated Codex commands include a line telling you to **append the style's English descriptor to every image/video prompt** (controls look/lighting/color grade only — never content, characters, or Product Lock). Add a new style = one entry in `src/style-presets.js`.

## Build, Test, and Development Commands
The viewer uses Vite with React. There is no automated test suite yet.

- `rg --files .`: list repository files quickly.
- `npm install --cache /private/tmp/codex-gpt-image2-npm-cache`: install dependencies.
- `npm run dev`: start the local viewer on port `3000`.
- `npm run build`: create a production build in `dist/`.
- `npm run new-page -- <slug> "ชื่อเพจ"`: scaffold a new page folder with template files.
- `node scripts/compose-sheet.mjs <slug> <proj> <day> [scene]`: compose the clean drama storyboard sheet(s) — "Shot K" bar + shot images only, no data table (needs local Chrome/Chromium). Per-shot info lives on the scene web page + the .md, not on the sheet.

When creating content for a page, use that page's `page-brief.md` and `assets/logo/` as the primary references. Never reuse another page's mascot, tone, or pillars unless the briefs say so.

## Coding Style & Naming Conventions
Use Markdown for briefs and process notes. Keep writing concise and operational.

- Page folders: short lowercase kebab-case slugs, e.g. `mekastock`, `crypto-cat`.
- File names: lowercase or descriptive snake case for docs, e.g. `market_recap_prompt.md`.
- Topic index: use `pages/<slug>/projects/<proj>/content_planner/content-topics.md` as the low-context list of titles across days (`## Day N` headings with `- Content M: title` items).
- Per-post files: use `dayN-content-M.md`, for example `day1-content-2.md`.
- Exported images for the viewer flow: use `pages/<slug>/projects/<proj>/generated_posts/dayN/dayN-content-M.png`.
- One-off exports may still use clear topic-based names, e.g. `INTC_intro_post.png`.

Do not store final generated images in the repository root or outside the owning page's folder.

## Rules for AI Agents Creating Content
Content lives inside a **project** (`pages/<slug>/projects/<proj>/`), not directly under the page. Before creating any content:

1. **Identify the target page AND project first.** Every piece of content belongs to exactly one `pages/<slug>/projects/<proj>/` folder. If the request does not name them (and more than one exists), ask. List with `ls pages/` and `ls pages/<slug>/projects/`. The project's `project.config.json` → `format` decides the workflow (infographic / drama / review).
2. **Never write content files outside the target project's folder.** Brand assets (`assets/`, `page-brief.md`, `page.config.json`) stay at page level; everything else is under the project. Files written elsewhere are invisible to the viewer.
3. **Exact paths the viewer reads** (anything else will not show up):
   - Topics: `pages/<slug>/projects/<proj>/content_planner/content-topics.md`
   - Brief: `pages/<slug>/projects/<proj>/content_planner/day<N>-content-<M>.md`
   - Image: `pages/<slug>/projects/<proj>/generated_posts/day<N>/day<N>-content-<M>.png` (or .jpg/.webp)
4. **Use the page's brand identity**: read `pages/<slug>/page-brief.md` for tone/pillars and attach `pages/<slug>/assets/logo/` + `assets/style-references/` (page-level) as image references. Never borrow another page's mascot or style.
5. When generating images, save them directly to the path in rule 3 — the viewer picks them up automatically; no registration step is needed.

Example task: "สร้างคอนเทนต์ Day 2 ของโปรเจกต์ main ในเพจ kaset-intrend 3 โพสต์" → update `pages/kaset-intrend/projects/main/content_planner/content-topics.md` with a `## Day 2` section, create `day2-content-1.md` … `day2-content-3.md` in the same folder, generate images into `pages/kaset-intrend/projects/main/generated_posts/day2/`.

## Drama Projects (format: "drama") — กติกาละครคุณธรรมสั้น

Check the project's `pages/<slug>/projects/<proj>/project.config.json` first. When `"format": "drama"`, the project is a short moral-drama studio for TikTok/Reels and these rules OVERRIDE the normal post workflow. The file layout is the same as infographic projects but the meaning changes:

- **Day N = เรื่องที่ N (one complete story)** — Content M = ฉากที่ M of that story. One page holds many stories across many genres.
- Day heading format in `content-topics.md`: `## Day N — <ชื่อเรื่อง>` (story title is REQUIRED — the viewer shows it on the story card)
- Topics line format in `content-topics.md`: `- Content M: ฉากที่ M (<beat>) — <สรุปสั้น>`
- Scene file: `pages/<slug>/projects/<proj>/content_planner/day<N>-content-<M>.md`
- **Storyboard = shot images + composed sheet (two steps, never one giant image)**:
  1. Generate ONE illustration per shot — framed in the story's aspect ratio (default 9:16), **absolutely NO text/letters/numbers/captions anywhere in the image** — and save to `pages/<slug>/projects/<proj>/generated_posts/day<N>/shots/day<N>-content-<M>-shot-<K>.png`.
  2. Run `node scripts/compose-sheet.mjs <slug> <proj> <N> <M>` (or omit `<M>` for the whole story). The script builds a **clean storyboard sheet — a "Shot K" navy bar + the shot images side by side, no data table, height fits the images** — and saves it to `pages/<slug>/projects/<proj>/generated_posts/day<N>/day<N>-content-<M>.png` (the path the viewer shows). Per-shot data (dialogue / action / emotion / camera / key object / sound) is NOT on the sheet anymore — the team reads it on the scene's web page; the sheet is kept clean on purpose so it can be attached as a text-free visual reference when generating the video.

  NEVER ask the image model to draw the sheet layout or any text on it (image models garble Thai glyphs), and NEVER edit the composed sheet with an image model — to fix a shot, regenerate only that shot image and re-run compose.

### Platforms (from `project.config.json` → `platform`)
บริการ/โมเดล + ความยาวฉาก + ลิมิตบทพูดรวมทั้งฉาก:
- `flow-veo31-8s`: Google Flow · Veo 3.1 — 8 วินาที/ฉาก, บทพูด 25–32 คำ
- `flow-omni-4s`: Google Flow · Omni Flash — 4 วินาที/ฉาก, บทพูด 12–16 คำ
- `flow-omni-6s`: Google Flow · Omni Flash — 6 วินาที/ฉาก, บทพูด 19–24 คำ
- `flow-omni-8s`: Google Flow · Omni Flash — 8 วินาที/ฉาก, บทพูด 25–32 คำ
- `flow-omni-10s`: Google Flow · Omni Flash — 10 วินาที/ฉาก, บทพูด 38–48 คำ
- `grok-6s`: Grok — 6 วินาที/ฉาก, บทพูด 19–24 คำ
- `grok-10s`: Grok — 10 วินาที/ฉาก, บทพูด 38–48 คำ
- `flow-8s` (legacy id): เท่ากับ `flow-omni-8s`

เพิ่มแพลตฟอร์ม/โมเดลใหม่ = เพิ่มรายการที่นี่ + `DRAMA_PLATFORM_OPTIONS` ใน `src/builders.js` + `VIDEO_PLATFORMS` ใน `server/formats.mjs` — กติกา video prompt ไม่ต้องแก้ (โครงเดียวกันทุกแพลตฟอร์ม เปลี่ยนแค่ความยาว/ลิมิตคำ)

### Story structure (บังคับตามจำนวนฉาก)
- 6 ฉาก: เปิดเรื่องด้วยหมัดฮุก → จุดขัดแย้ง → ขยี้อารมณ์ → จุดพลิกผัน → จุดพีคสุดสะใจ → บทสรุปข้อคิด
- 8 ฉาก: เปิดเรื่องด้วยหมัดฮุก → จุดขัดแย้ง → ขยี้อารมณ์ → ซ้ำเติม/กดดัน → จุดพลิกผัน → เปิดความจริง → จุดพีคสุดสะใจ → บทสรุปข้อคิด
- 10 ฉาก: แบบ 8 ฉาก แต่ขยาย "ขยี้อารมณ์" และ "เปิดความจริง" เป็นอย่างละ 2 ฉาก
- 12 ฉาก: แบบ 10 ฉาก แต่ขยาย "จุดขัดแย้ง" และ "ซ้ำเติม/กดดัน" เป็นอย่างละ 2 ฉาก
- ฉากที่ 1 ต้องเปิดด้วยวิกฤต/ความขัดแย้งขั้นสุดทันที ห้ามปูเรื่อง

### ชื่อเรื่อง (Story title)
- **ห้ามใช้บรรทัดโจทย์/หัวข้อที่ผู้ใช้พิมพ์เป็นชื่อเรื่องตรง ๆ** — โจทย์คือพล็อต ไม่ใช่ชื่อ ต้องตั้งชื่อใหม่ทุกครั้ง
- **ตั้งแบบชื่อละคร/หนังไทย** — เป็นวลีนามสั้น ๆ ที่มีนัยถึงปมเรื่อง ไม่ใช่ประโยคเล่าเรื่อง ไม่ใช่พาดหัวข่าว/คลิกเบต
  โครงที่ใช้ (เลือกให้เข้ากับเรื่อง):
  1. ฉายา/สถานะตัวละคร — แบบ "เด็กวัด", "เมียหลวง", "ลูกอกตัญญู"
  2. สำนวน/ภาพเปรียบเปรยสะท้อนปม — แบบ "เขียนฝันไว้ข้างฝา", "กรงกรรม", "ใบไม้ที่ปลิดปลิว", "รอยไหม"
  3. คู่ตัวละคร/คู่ขัดแย้ง — แบบ "ยัยตัวร้ายกับนายจอมป่วน"
  4. คำเดี่ยว/วลีสั้นที่มีน้ำหนัก — แบบ "แรงเงา", "ทองเนื้อเก้า"
- ยาว 1–5 คำ อาจต่อสร้อยสั้น ๆ ขยายอารมณ์ได้ (แบบ "ลูกอกตัญญู กว่าจะคิดได้ก็สายเกินไป") ห้ามสปอยล์จุดหักมุม
- ในโหมด pitch ให้เสนอ 5 ชื่อใน `## ชื่อเรื่องตัวเลือก` (คละโครงข้างบน ไม่ใช่โครงเดียว 5 แบบ) และใส่ชื่อที่ดีที่สุด
  ในหัวไฟล์ — ผู้ใช้อาจแก้หัวไฟล์เป็นชื่ออื่นตอนรีวิว จังหวะที่ 2 ต้องใช้ชื่อจากหัวไฟล์ pitch ล่าสุดเสมอ

### Two-step pitch (optional) — `pages/<slug>/projects/<proj>/content_planner/day<N>-pitch.md`

Some commands split a story into two beats. จังหวะที่ 1 (pitch): create ONLY the pitch file below — do NOT touch characters.md, scene files, or content-topics.md — then stop and wait for the user to review. จังหวะที่ 2 (write): read the latest content of the pitch file (the user may have edited it) and produce the full story from it exactly — characters, scene files, topics — without inventing a new plot or new characters.

```markdown
# เรื่องที่ N — <ชื่อเรื่อง>

## ชื่อเรื่องตัวเลือก
(5 ชื่อตามกติกา "ชื่อเรื่อง" — ชื่อแรกคือชื่อเดียวกับหัวไฟล์ ผู้ใช้เลือกชื่ออื่นได้โดยแก้หัวไฟล์)
- <ชื่อ 1 — ตัวที่ใช้ในหัวไฟล์>
- <ชื่อ 2>
- <ชื่อ 3>
- <ชื่อ 4>
- <ชื่อ 5>

## เรื่องย่อ
(4–6 ประโยค: ใครโดนอะไร หักมุมยังไง จบสะใจยังไง)

## ตัวละคร
- <ชื่อ>: <บทบาทในเรื่อง> — <นิสัย> — จุดจำ: <สิ่งที่มองเห็นได้ 1–2 อย่าง>

## โครงฉาก
- ฉากที่ M (<beat>): <เหตุการณ์ 1 ประโยค>
```

### Characters — `pages/<slug>/projects/<proj>/characters/characters.md` (Character Lock)
Create or update this file BEFORE writing scenes. One section per character:

```markdown
## <ชื่อตัวละคร>
- เพศ/อายุ: (คนไทย อายุ 20 ปีขึ้นไป)
- จุดจำ: (เช่น ไฝที่แก้มซ้าย, รอยแผลเป็นที่คิ้วขวา, ชุดแม่บ้านสีฟ้าซีด)
- ภาพต้นแบบ: characters/<char-slug>.png (ตั้ง char-slug เป็นอังกฤษตัวเล็ก เช่น mae-baan.png
  — ไฟล์อาจยังไม่มีจนกว่าผู้ใช้จะ generate; ห้ามข้ามบรรทัดนี้ เพราะหน้าเว็บใช้ map ภาพเข้าการ์ดตัวละคร)
- ย่อหน้าบรรยายมาตรฐาน: (ONE English paragraph — gender, age, Thai ethnicity, body build, face,
  hairstyle, detailed clothing, distinguishing marks. prompt ภาพของทุกฉากต้องคัดลอกก้อนนี้ไปวางเต็ม ๆ
  ห้ามพิมพ์ใหม่ — field ชื่อไทย เนื้อหาอังกฤษ)
- บรรยายย่อสำหรับวิดีโอ: (ONE short English line ใช้ในบล็อก "Main characters:" ของคำสั่งสร้างวิดีโอ —
  role/เพศ, อายุ, ทรงผม, สีหน้า/บุคลิก, ชุด, จุดจำ/prop ประจำตัว ครบใน 1–2 ประโยค ย่อจาก
  ย่อหน้าบรรยายมาตรฐานโดยคงจุดจำครบ — ทุกฉากของเรื่องต้องวางบรรทัดนี้เหมือนกันเป๊ะ ห้ามแต่งใหม่รายฉาก)
- คำสั่งสร้างภาพต้นแบบ: (English prompt สร้าง "character reference sheet" แผ่นเดียว 9:16 —
  photorealistic 2x2 grid บนพื้นสตูดิโอขาวล้วน ของคนคนเดียวกันเป๊ะทุกช่อง: front portrait /
  three-quarter portrait / full body front / full body side-or-back view โดยวางย่อหน้าบรรยายมาตรฐานเต็มก้อน
  + film-studio lighting + 8K skin-pore detail + แถบล่างสุด: still-life close-up ของจุดจำ/ของประจำตัวบนพื้นขาว
  — ป้ายกำกับช่องเป็นภาษาอังกฤษเท่านั้น (เช่น "Front Portrait") **ห้ามมีตัวหนังสือไทยบนภาพเด็ดขาด**
  ("identical face, hairstyle, and outfit in every view" ต้องอยู่ใน prompt เสมอ) ลงท้าย "9:16 aspect ratio")
```

Reference image after generation: `pages/<slug>/projects/<proj>/characters/<char-slug>.png` — attach it when generating every shot that includes the character.

### Image generation (Codex generates images itself, same as posts pages)
After writing all scene files for a story, generate the images in this order:

1. **Character master images**: generate each character's image from its `คำสั่งสร้างภาพต้นแบบ` and save to `pages/<slug>/projects/<proj>/characters/<char-slug>.png`. If the file already exists, NEVER regenerate or overwrite it — the face is locked.
2. **Shot images**: for every scene, generate each shot from its `### Shot K` prompt under `## คำสั่งสร้างภาพช็อต`, **always attaching the master image of every character appearing in that shot as an image reference** (Character Lock), and save to `pages/<slug>/projects/<proj>/generated_posts/day<N>/shots/day<N>-content-<M>-shot-<K>.png`.
3. **Compose the sheets**: run `node scripts/compose-sheet.mjs <slug> <proj> <N>` once all shot images of the story exist (or `node scripts/compose-sheet.mjs <slug> <proj> <N> <M>` per scene). It writes `pages/<slug>/projects/<proj>/generated_posts/day<N>/day<N>-content-<M>.png` for the viewer. Report the script output to the user; if it warns about missing shot images, generate those and re-run.
4. **Story cover (movie poster)**: generate ONE poster-style image per story and save to `pages/<slug>/projects/<proj>/generated_posts/day<N>/day<N>-cover.png` — the viewer shows it on the story card (letterboxed on black if not 9:16). Requirements: same aspect ratio as the story's video (default 9:16), big readable Thai story title ON the image, main characters in the story's peak moment, one short Thai tagline, color/mood matching the story. Attach as references: the main characters' master images + 2–3 poster examples from `pages/<slug>/assets/cover-references/` if that folder exists (follow their title layout, composition, and tone only — NEVER copy their text, characters, or story). Prompt in English; the title and tagline that appear ON the poster are Thai, quoted inside the prompt.

The viewer picks up new files automatically — no extra wiring needed.

**Brand assets on drama pages are repurposed** (different meaning than posts pages):
- `assets/logo/charator-sheet.*` = **reference-sheet style guide**, NOT a mascot: attach it when generating every NEW character master sheet so all masters share the same multi-view layout, studio lighting, and background language (identity still comes from the prompt's ย่อหน้าบรรยายมาตรฐาน — never copy the person in the guide).
- `assets/style-references/` = **film tone refs**: attach 2–3 when generating every shot image so color grading and cinematic look stay consistent across scenes and stories (tone only — sheet layout is handled entirely by `scripts/compose-sheet.mjs`; never copy ref content).
- Attach order for a shot image: character master images (identity) + style references (tone). **ONLY these** — never attach `charator-sheet.*` (that is exclusively for generating new character masters) and never attach previously generated shot images or composed sheets as references.

### Scene file format (every scene, exact structure)

One scene = one shot-image prompt per shot (composed into one sheet by `scripts/compose-sheet.mjs`) + ONE video prompt covering all shots (the clip is generated in a single 4–10s run — duration per the page's platform — on Flow/Grok, with the timeline written as SHOT blocks inside the prompt).

```markdown
# เรื่องที่ N ฉากที่ M — <beat>

## สรุปฉาก
(ภาพรวมเหตุการณ์ + อารมณ์ของฉาก 1-2 ประโยค)

## ตัวละครในฉาก
- <ชื่อ> (ต้องมีอยู่ใน characters.md)

## Shot List
- Shot 1 (0.0-3.0 วิ, มุมกว้าง): <แอ็กชันหลัก 1 ประโยค> — รายละเอียดภาพ: <สิ่งที่เห็นในเฟรม> — อารมณ์: <อารมณ์/รีแอกชันของตัวละคร> — วัตถุสำคัญ: <prop ที่มีบทบาทในเรื่อง เช่น ของที่จะถูกเปิดโปงทีหลัง — ใส่เฉพาะช็อตที่มีจริง ช็อตไหนไม่มีให้ละ field นี้ทิ้ง ห้ามเค้นหาของมาใส่>
- Shot 2 (3.0-6.5 วิ, โคลสอัพ): <...> — รายละเอียดภาพ: <...> — อารมณ์: <...> — วัตถุสำคัญ: <...>
- Shot 3 (6.5-10.0 วิ, มุมต่ำ): <...> — รายละเอียดภาพ: <...> — อารมณ์: <...> — วัตถุสำคัญ: <...>

## คำสั่งสร้างภาพช็อต
(หนึ่งหัวข้อ `### Shot K` ต่อหนึ่ง shot ใน Shot List — แต่ละหัวข้อคือ ONE English prompt สร้างภาพประกอบ
ของช็อตนั้นภาพเดียว **ห้ามมีตัวหนังสือทุกชนิดในภาพ** (ตัวหนังสือไทยบนชีทมาจาก scripts/compose-sheet.mjs
ไม่ใช่จากโมเดลสร้างภาพ) โครงบังคับต่อ shot:
- เปิดด้วย: "Cinematic photorealistic Thai drama film still, a single video frame."
- ตามด้วย: [ย่อหน้าบรรยายมาตรฐานภาษาอังกฤษของตัวละครทุกตัวที่อยู่ใน shot — ห้ามใส่แค่ชื่อ] + [action] +
  [facial expression and eyes] + [location, time of day, weather] + [lighting and color tone],
  shot as <camera angle เป็นอังกฤษ เช่น wide establishing shot / extreme close-up / low angle>
- ปิดท้ายทุก shot: "Cinematic photorealism, 8K detail. No text, no letters, no numbers, no captions,
  no logo, no watermark anywhere in the image" + aspect ratio ของเรื่อง เช่น "9:16 aspect ratio")

### Shot 1
<English prompt ของ shot 1>

### Shot 2
<English prompt ของ shot 2>

## คำสั่งสร้างวิดีโอ
(ONE self-contained English prompt — เนื้อหาครบในตัว + **แนบชีทสตอรี่บอร์ดของฉากเป็น reference** (เรียงช็อต
Shot 1→N; ถ้าโมเดลจับตัวละครไม่ตรงค่อยแนบภาพช็อตแยกทีละใบเสริม) วางใน Flow/Grok/Veo ได้เลย
จัดเป็นบล็อกตามลำดับนี้ มีบรรทัดว่างคั่นทุกบล็อก **ห้ามเขียนรวมเป็นย่อหน้าเดียว** โครงบังคับ:
- บล็อกกันภาพแนบโผล่ในคลิป (บรรทัดแรกสุด):
  "Use the attached storyboard only as a visual reference for character identity, wardrobe, framing, and
  shot order. Do not show any storyboard frame borders, split panels, labels, text, subtitles, watermark,
  or grid layout in the final video."
- บล็อกสั่งงานหลัก:
  "Generate one continuous <ความยาววินาทีตาม platform>-second <Vertical 9:16 / Horizontal 16:9 ตาม aspect
  ของเรื่อง> photorealistic cinematic Thai drama video. Follow the storyboard order strictly as one real
  cinematic event, progressing in exact order Shot 1 → Shot 2 → Shot 3, keeping continuity of character
  positions and [prop สำคัญที่ต่อเนื่องข้ามช็อต]. [location + set dressing + เวลา/สภาพอากาศ],
  [ตัวประกอบ/ฉากหลัง], [โทนอารมณ์ของฉาก], [lighting], [แนวเรื่อง เช่น family moral revenge short drama style]."
- บล็อก "Main characters:" — บรรทัดละตัว เฉพาะตัวละครที่อยู่ในฉาก (ล็อกหน้า/ชุดให้เหมือนกันทุกช็อต):
  "<ชื่ออังกฤษ>: <บรรยายย่อสำหรับวิดีโอ จาก characters.md — วางเหมือนกันเป๊ะทุกฉากของเรื่อง ห้ามแต่งใหม่>"
- บล็อกราย shot ตาม Shot List (บล็อกละ shot เว้นบรรทัดคั่น):
  บรรทัดหัว: "Shot K: M:SS–M:SS"  ← เวลาจริงของช็อตจาก Shot List แปลงเป็น mm:ss (เช่น 0:00–0:03, 0:03–0:06.5)
    รวมทุกช็อต = ความยาวฉากตาม platform เป๊ะ ๆ
  บรรทัด "Visual:" — ใครอยู่ในเฟรม + ชุด/สี/ตำแหน่งซ้าย-ขวา + ของสำคัญอยู่ตรงไหน (เป็น anchor สายตา
    ให้โมเดลรู้ว่าใครเป็นใคร — เขียนทุก shot ที่มีคน)
  บรรทัด "Action:" — ใครทำอะไร ฉากหลัง/ตัวประกอบรีแอกยังไง (1–2 ประโยค)
  บรรทัด "Camera Movement:" — มุมกล้อง (Wide / Close-up / Low angle ฯลฯ) + การเคลื่อนกล้อง + depth of field
  บรรทัด "Dialogue (Thai):" (ถ้ามี) — **ผูกผู้พูดกับ visual anchor ไม่ใช่ชื่อลอย ๆ** (โมเดลจับ "หญิงชุดแดง
    ยืนขวา" ได้ แต่จับชื่อไม่ได้ → ป้องกันพูดสลับบท):
    "the <visual anchor เช่น woman in the red-gold robe on the right / bound man in blue on the left>
    <says/shouts/sobs/whispers> <ลักษณะ เช่น coldly / with calm restrained power>:" แล้วขึ้นบรรทัดใหม่เป็น
    บทพูดไทยในเครื่องหมายคำพูด ตรงกับ ## บทพูด เป๊ะ ๆ — shot ที่ไม่มีบทพูดเขียน "Dialogue: none."
    **ตั้งเป้า 1 ช็อต = คนพูดคนเดียว** ถ้าจำเป็นต้องมี 2 คนพูดในช็อตเดียว visual anchor ของแต่ละคนต้องต่าง
    กันชัด (สีชุด/ตำแหน่ง) เพื่อไม่ให้ lip-sync ผิดคน
  บรรทัด "ASMR/SFX:" — เสียง diegetic ของช่วงนั้น เป็นอังกฤษ สอดคล้องกับ ## เสียง
- บล็อก "Overall mood:" — 1–2 ประโยคอังกฤษสรุปอารมณ์รวมของฉาก + hook ที่ฉากต้องทิ้งไว้ให้คนดู
- บล็อกปิด "Global rules:" (กฎรวมท้าย prompt):
  "photorealistic, natural Thai environment, consistent character identity and wardrobe across all shots,
  realistic acting, natural diegetic sound only. No subtitles, no on-screen text, no captions, no logo,
  no watermark, no background music, no songs, no split-screen, no storyboard panels, no camera UI."
- **บทพูดไทยสะกดปกติ เว้นวรรคเฉพาะตามจังหวะวลีธรรมชาติ ห้ามเว้นวรรคคั่นรายคำเด็ดขาด**
  (เว้นวรรคถี่ ๆ ทำให้โมเดลอ่านเสียงขาดเป็นห้วง ๆ และออกเสียงบทพูดเพี้ยน))

## เสียง
(เฉพาะเสียง diegetic: ASMR, เสียงการกระทำ, เสียงธรรมชาติ, เสียงร้องไห้, เสียงหัวเราะ, ฝีเท้า —
ห้ามดนตรี/เพลงประกอบเด็ดขาด **ผูกราย shot เหมือนบทพูด** ทุก shot ต้องมีบรรทัดของตัวเอง
และต้องสอดคล้องกับ "Ambient sound" ของช่วงเดียวกันในคำสั่งสร้างวิดีโอ)
- Shot 1: <เสียง diegetic ของช่วงนั้น>
- Shot 2: <...>
- Shot 3: <...>

## บทพูด
(ทุกบรรทัดต้องผูกกับ shot — ระบุ shot + ผู้พูด + อารมณ์ บรรทัดละคำพูดเดียว รวมคำทั้งฉากตามลิมิตของ platform
shot ไหนไม่มีบทพูดไม่ต้องมีบรรทัด — **สะกดปกติ เว้นวรรคเฉพาะตามจังหวะวลีธรรมชาติ ห้ามเว้นวรรคคั่นรายคำ**)
- Shot 1 — <ผู้พูด> (<อารมณ์>): "<บทพูดไทย>"
- Shot 2 — <ผู้พูด> (<อารมณ์>): "<บทพูดไทย>"
- Shot 3 — <ผู้พูด> (<อารมณ์>): "<บทพูดไทย>"
```

- จำนวน shot ต่อฉาก: 2–4 ตามจังหวะเรื่อง (ฉากอารมณ์แรงควรมีโคลสอัพ) ช่วงเวลาของทุก shot รวมกัน = ความยาวฉากตาม platform
- บทพูดรวมทั้งฉากต้องอยู่ในช่วงจำนวนคำของ platform เป๊ะ ๆ

### Regenerate video prompt สำหรับแพลตฟอร์ม/โมเดลอื่น
เมื่อผู้ใช้สั่งทำนอง "สร้าง video prompt ของฉาก X (หรือทั้งเรื่อง) สำหรับ <platform id / ชื่อโมเดล / ความยาว>":

1. **แหล่งข้อมูลคือไฟล์ .md เสมอ**: อ่านไฟล์ฉาก + `บรรยายย่อสำหรับวิดีโอ` จาก characters.md + สเปกจากตาราง Platforms — **ห้ามอ่านข้อมูลจากภาพชีทสตอรี่บอร์ด** (ชีทถูก render มาจากไฟล์ .md การอ่านกลับจากภาพเสี่ยงตกหล่น/เพี้ยน ชีทมีไว้ให้คนดูและแนบเป็น first-frame reference ตอนเจนวิดีโอเท่านั้น)
2. **ความยาวเท่าเดิม** (เปลี่ยนแค่บริการ/โมเดล): เขียน `## คำสั่งสร้างวิดีโอ` ใหม่ตามโครงบล็อกบังคับเดิมทุกบล็อก — ไทม์ไลน์ บทพูด เสียง คงเดิมทั้งหมด
3. **ความยาวใหม่**: ห้ามแก้แค่ prompt — ต้องปรับทั้งฉากให้สอดคล้องกันก่อน: สเกลช่วงเวลาใน `## Shot List` ให้รวมเท่าความยาวใหม่, ตัด/ขยาย `## บทพูด` ให้อยู่ในลิมิตคำของแพลตฟอร์มโดยรักษาใจความและจังหวะดราม่า, ปรับ `## เสียง` ราย shot ตาม แล้วจึงเขียนคำสั่งสร้างวิดีโอใหม่จากข้อมูลที่ปรับแล้ว จากนั้นรัน `node scripts/compose-sheet.mjs <slug> <proj> <N> <M>` ใหม่ (ตัวเลขเวลาบนชีทมาจาก Shot List — ถ้าไม่รันซ้ำ ชีทกับ prompt จะขัดกัน)
4. ถ้าผู้ใช้จะสลับแพลตฟอร์มถาวร ให้ชวนอัพเดท `platform` ใน `page.config.json` ของเพจนั้นด้วย เพื่อให้เรื่องถัดไปเขียนด้วยสเปกที่ถูกต้องตั้งแต่ต้น

### Iron rules (ห้ามฝ่าฝืน)
1. คำสั่งสร้างภาพ/วิดีโอทั้งหมดเขียนเป็น **ภาษาอังกฤษ** (โมเดลตีความแม่นกว่า โดยเฉพาะศัพท์กล้อง/แสง) — **ยกเว้น** ชื่อเรื่อง/แท็กไลน์บนปกเรื่อง และบทพูดในคำสั่งสร้างวิดีโอ ให้เป็น **ภาษาไทยในเครื่องหมายคำพูด** ส่วนเนื้อหาอื่นของไฟล์ (สรุปฉาก, Shot List, เรื่องย่อ, เสียง, บทพูด) ยังเป็นภาษาไทยเพื่อให้ผู้ใช้อ่านตรวจได้ — **ภาพช็อตห้ามมีตัวหนังสือทุกชนิด** (โมเดลสร้างภาพวาดตัวอักษรไทยเพี้ยนเสมอ ตัวหนังสือบนชีทจึงมาจาก compose script เท่านั้น)
2. คำสั่งสร้างภาพช็อตลงท้ายด้วย **aspect ratio ของเรื่อง** ตามที่คำสั่งของเรื่องนั้นระบุ (ค่าเริ่มต้น "9:16 aspect ratio" — เลือกได้ 9:16 / 16:9 / 4:5 / 1:1) ส่วนคำสั่งสร้างวิดีโอระบุ aspect ไว้ต้นบล็อกเปิดแทน ("Vertical 9:16" / "Horizontal 16:9") — ปกเรื่องใช้ aspect ratio เดียวกับวิดีโอของเรื่อง ภาพต้นแบบตัวละครลงท้าย **"9:16 aspect ratio"** เสมอ (ตัวชีท 4:5 เป็นหน้าที่ของ compose script ไม่ต้องเขียนใน prompt ไหนอีก)
3. ห้ามอ้างตัวละครด้วยชื่ออย่างเดียวใน prompt — **prompt ภาพ** (ภาพช็อต/ภาพต้นแบบ/ปกเรื่อง) วางย่อหน้าบรรยายมาตรฐานเต็มทุกครั้ง ส่วน**คำสั่งสร้างวิดีโอ**ใช้ "บรรยายย่อสำหรับวิดีโอ" ในบล็อก Main characters: แทน (คำบรรยายเต็มยาวเกินไปจนกลบน้ำหนักบทพูด ทำให้เสียงพูดเพี้ยน — บรรทัดย่อของแต่ละตัวต้องเหมือนกันเป๊ะทุกฉากของเรื่อง)
4. **ห้ามใส่ดนตรี/เพลงประกอบทุกกรณี** — เสียงในคลิปเป็น diegetic เท่านั้น และต้องเขียน "no background music, no songs" ในคำสั่งสร้างวิดีโอทุกฉาก
5. อัพเดท `content-topics.md` ทุกครั้งที่เพิ่มฉาก (`## Day N — <ชื่อเรื่อง>` + `- Content M: ...`)
6. เรื่องใหม่ = Day ใหม่เสมอ ห้ามเขียนทับเรื่องเก่า (การเปลี่ยนสถานที่/เวอร์ชันใหม่ของเรื่องเดิมก็เป็น Day ใหม่)
7. สตอรี่บอร์ด 1 ฉาก = ภาพช็อตราย shot ใน `generated_posts/day<N>/shots/` + ชีท 1 แผ่นจาก `scripts/compose-sheet.mjs` — **ห้ามใช้โมเดลสร้างภาพ gen หรือแก้ตัวชีทเด็ดขาด** อยากแก้ช็อตไหน gen ภาพช็อตนั้นใหม่แล้วรัน compose ซ้ำ
8. ตอน gen ภาพช็อตต้องแนบภาพต้นแบบตัวละครทุกตัวใน shot นั้นเป็น image reference เสมอ และห้าม gen ภาพต้นแบบซ้ำถ้าไฟล์มีอยู่แล้ว — ยกเว้นผู้ใช้สั่งอัพเกรด master เดี่ยวแบบเก่าเป็น reference sheet: ต้องแนบ master เดิมเป็น identity reference และหน้า/ทรงผม/ชุดต้องตรงของเดิมทุกประการ
9. **Safe wording ใน prompt ภาพ**: ตัวสร้างภาพมักปฏิเสธคำที่สื่อความรุนแรง/การทำร้าย (abuse, violence, hitting, hurting) — ให้เลี่ยงเป็นคำเชิงอารมณ์แทน เช่น "family moral drama, tense confrontation, emotional argument, no physical injury" โดยคงโครงฉาก ตัวละคร และช่วงเวลาไว้ครบ (บทและ Shot List ในไฟล์ .md ยังเขียนตามเนื้อเรื่องจริงได้ปกติ — กติกานี้ใช้กับ prompt ภาพเท่านั้น)

## Review Projects (format: "review") — กติการีวิวสินค้าสไตล์ UGC

Check the project's `pages/<slug>/projects/<proj>/project.config.json` first. When `"format": "review"`, the project is a UGC-style product-review studio (คลิปรีวิวสั้นแนว "คนธรรมดาเพิ่งซื้อของมาโชว์" — ภาพสวยโทนบ้านมินิมอล, Voice Over ไทย, ข้อความ overlay ลายมือ) and these rules OVERRIDE the normal post workflow. File layout mirrors drama projects:

- **Day N = รีวิวที่ N (สินค้า 1 ชิ้น = คลิป 1 ตัว)** — ปกติมีไฟล์เดียว `day<N>-content-1.md` ต่อรีวิว (คลิปเดียวจบ ทุกช็อตอยู่ในไฟล์นั้น) — ถ้าผู้ใช้สั่งหลายคลิปต่อสินค้า (เช่น เวอร์ชัน 6 วิ + 10 วิ) ค่อยเพิ่ม content-2, content-3
- Day heading ใน `content-topics.md`: `## Day N — <ชื่อสินค้า>` + `- Content M: <ความยาว/เวอร์ชัน> — <สรุปสั้น>`
- **รูปสินค้าจริงจากผู้ใช้ = ภาพต้นแบบ (Product Lock)**: เก็บที่ `pages/<slug>/projects/<proj>/products/<product-slug>/` — **ทุกครั้งที่ gen ภาพช็อต ต้องแนบรูปสินค้าต้นฉบับ 1–3 รูปเป็น image reference เสมอ** ห้าม gen สินค้าจากคำบรรยายลอย ๆ
- **รับรูปได้ 2 ทาง — เลือกอันที่มี:**
  1. ผู้ใช้**แนบรูปสินค้ามากับคำสั่ง** (สะดวกสุด) → ถ้าโฟลเดอร์ `products/<product-slug>/` ยังว่าง/ไม่มี ให้**สร้างโฟลเดอร์แล้วเซฟรูปที่แนบทั้งหมดลงไปก่อน** (ตั้งชื่อ `product-1.<ext>`, `product-2.<ext>`, … คงไฟล์ต้นฉบับ ห้ามแก้/รีทัช) แล้วค่อยทำต่อ
  2. ผู้ใช้วางไฟล์ไว้ในโฟลเดอร์นั้นแล้ว → ใช้ได้เลย
  - ถ้าไม่มีทั้งรูปแนบและรูปในโฟลเดอร์ → **หยุดแล้วขอรูปสินค้า** (ห้ามเดาหน้าตาสินค้าเอง)
- ก่อนเขียนรีวิว ให้เปิดดูรูปสินค้าจริง ๆ (Read เป็นภาพ) แล้ววิเคราะห์: สินค้าคืออะไร วัสดุ/สี จุดขายที่มองเห็นได้ 3–5 ข้อ → ใช้เป็นแกนของ Shot List ถ้าผู้ใช้ให้จุดขาย/ราคา/สเปกมาด้วย ให้ยึดของผู้ใช้ก่อนเสมอ
- **ข้อควรระวังฉลาก**: โมเดลภาพเลียนแบบสินค้าได้ใกล้เคียงแต่ตัวหนังสือ/โลโก้บนแพ็กเกจจะเพี้ยน — สินค้าที่มีฉลากเด่นให้เลี่ยงช็อตซูมฉลาก (ถ่ายมุมที่ฉลากไม่ใช่พระเอก) และเตือนผู้ใช้ว่าช็อตฉลากชัด ๆ ควรใช้รูปถ่ายจริงเป็น first frame ตอนเจนวิดีโอแทน
- สตอรี่บอร์ด 2 ขั้นเหมือน drama: ภาพราย shot ที่ `generated_posts/day<N>/shots/day<N>-content-<M>-shot-<K>.png` (**ห้ามมีตัวหนังสือทุกชนิดในภาพ**) แล้วรัน `node scripts/compose-sheet.mjs <slug> <proj> <N> <M>` — ชีทรีวิวแสดงภาพช็อต + ตาราง ฉาก/เวลา/มุมกล้อง/การเคลื่อนกล้อง/Overlay/Voice Over (ตัวหนังสือไทยมาจากฟอนต์จริงในสคริปต์เท่านั้น)
- **ปก/ธัมบ์เนลรีวิว (movie-poster เวอร์ชันสินค้า)**: ภาพเดียว **สินค้าเป็นพระเอกกลางเฟรม** จัดฉาก/แสงตาม mood & tone ของคลิป (ค่าเริ่มต้นตาม `page-brief.md`: cozy minimal Thai home, soft natural daylight) ให้สะดุดตาน่าซื้อบนฟีด — **แนบรูปสินค้าต้นฉบับเสมอ (Product Lock)** สัดส่วนเท่าวิดีโอ, ใส่ฮุกไทยสั้นตัวใหญ่ได้ (optional, เลี่ยงถ้ากลัวตัวอักษรเพี้ยน), หลีกเลี่ยงซูมฉลาก/โลโก้บนตัวสินค้า → เซฟเป็น `generated_posts/day<N>/day<N>-cover.png` (viewer ใช้เป็นปกการ์ดรีวิว)

### พรีเซนเตอร์ (3 ระดับ — ผู้ใช้เลือกตอนสั่ง ถ้าไม่ระบุ = มือเท่านั้น)
1. **ไม่มี** — สินค้าล้วนทุกช็อต
2. **มือเท่านั้น (ค่าเริ่มต้น)** — เห็นแค่มือ+แขนกำลังใช้สินค้า และ**ต้องล็อกสเปกมือ/แขนเสื้อไว้ใน `## พรีเซนเตอร์` แล้ววางลง prompt ภาพและ video prompt ของทุกช็อตที่มีมือ** (เช่น "the same young Thai woman's hands, slim fingers, cream long-sleeve knit sweater") — เสื้อแขนยาวสีเดียวกันทุกช็อตคือสิ่งที่ทำให้คลิปดูเป็นคนคนเดียว
3. **เปิด+ปิด** — นางแบบ/นายแบบเป็นตัวละครใน `characters/characters.md` ของเพจ (format เดียวกับ drama ครบทุก field รวม บรรยายย่อสำหรับวิดีโอ + reference sheet ล็อกหน้า) ปรากฏตัวเฉพาะ**ช็อตแรก** (กำลังแกะ/วาง/ใช้สินค้า — ห้ามยืนถือสินค้าหันหน้ากล้องแบบโฆษณา) และ**ช็อตสุดท้าย** (lifestyle อยู่กับสินค้าในห้อง) ช็อตกลางเป็นมือของคนเดิม — มือ/แขนเสื้อต้องตรงกับชุดพรีเซนเตอร์เป๊ะ ๆ — **พรีเซนเตอร์ไม่พูดออกกล้องเด็ดขาด** เสียงทั้งคลิปเป็น Voice Over (lip-sync ของ AI ยังหลุดง่าย) — พรีเซนเตอร์ผูกกับเพจ ใช้ซ้ำทุกรีวิวเพื่อให้เพจมีตัวตน ห้ามสร้างคนใหม่ทุกคลิปถ้าผู้ใช้ไม่สั่ง

### Review file format — `day<N>-content-<M>.md` (exact structure)

```markdown
# รีวิวที่ N — <ชื่อสินค้า>

## สินค้า
- ชื่อ: <ชื่อสินค้า>
- รูปต้นฉบับ: products/<product-slug>/ (<รายชื่อไฟล์>)
- จุดขาย: <ข้อละบรรทัด 3–5 ข้อ เรียงตามลำดับช็อต>

## พรีเซนเตอร์
- โหมด: ไม่มี | มือเท่านั้น | เปิด+ปิด — <ชื่อตัวละคร>
- สเปกมือ/แขน: <ONE English line วางซ้ำทุก prompt ที่มีมือ>

## Shot List
- Shot 1 (0.0-2.0 วิ, Wide 45°, Slow Push In): <สิ่งที่เกิด/เห็นในเฟรม 1 ประโยค> — จุดขาย: <ข้อที่โชว์ในช็อตนี้ ช็อตเปิด/ปิดละ field นี้ได้>
- Shot 2 (2.0-4.0 วิ, Close Up, Slow Dolly): <...>

## คำสั่งสร้างภาพช็อต
(`### Shot K` ละ ONE English prompt — เปิดด้วย "Photorealistic UGC-style product photo, a single video frame."
+ คำบรรยายสินค้าจากที่วิเคราะห์รูปจริง + [action/มือ/พรีเซนเตอร์ตามโหมด] + [ฉากหลังบ้านตามโทนเพจ]
+ [แสง] shot as <camera angle> — ปิดท้าย "no text, no letters, no numbers, no captions, no logo,
no watermark anywhere in the image" + aspect ratio — ตอน gen แนบรูปสินค้าจริง + master พรีเซนเตอร์
(ช็อตที่มีตัว) + style references ของเพจ (ถ้ามี))

### Shot 1
<English prompt>

## คำสั่งสร้างวิดีโอ
(โครงบล็อกเดียวกับ drama ทุกประการ — guard line + บล็อกเปิด + ตัวละคร + directing rule + SHOT blocks + Overall mood
— ต่างแค่:
- บล็อกเปิด: "photorealistic UGC-style product review video" + ฉากบ้าน/แสง/โทน + ลงท้ายบล็อกด้วย
  "Use only a Thai <female/male> voice-over and natural product ASMR/SFX." แทนบรรทัด Thai dialogue
- บล็อก "Product:" (แทน Main characters:): คำบรรยายสินค้าอังกฤษ 1–2 ประโยคจากรูปจริง — วางเหมือนกันทุกช็อต/ทุกคลิปของสินค้านั้น
- บล็อก "Presenter:" (เฉพาะโหมด 2–3): สเปกมือ/แขน และ/หรือ บรรยายย่อสำหรับวิดีโอของพรีเซนเตอร์ + ระบุว่าโผล่ช็อตไหน
- directing rule เพิ่ม: "The product stays visually identical in every shot."
- ราย shot: "SHOT K | X.X–Y.Ys | <angle> + <camera movement>" แล้วบรรทัด action / Camera: /
  Voice-over (<โทน เช่น bright and friendly>): ขึ้นบรรทัดใหม่เป็น VO ไทยในเครื่องหมายคำพูด ตรงกับ ## Voice Over เป๊ะ ๆ
  (ช็อตไม่มี VO เขียน "No voice-over.") / SFX: <เสียงสินค้า ASMR>
- ห้ามมี on-screen text ในวิดีโอเช่นเดิม — **Overlay ไม่อยู่ใน video prompt** ผู้ใช้เอาข้อความจากชีทไปใส่เองตอนตัดต่อ)

## Voice Over
(ผูกราย shot เหมือนบทพูดของ drama — โทน UGC เป็นกันเอง เหมือนเล่าให้เพื่อนฟัง ("แก...อันนี้ดีมาก")
ไม่ใช่โฆษณา ห้ามเว้นวรรคคั่นรายคำ รวมคำทั้งคลิปตามลิมิตของ platform เป๊ะ ๆ)
- Shot 1 (<โทน>): "<VO ไทย>"

## Overlay
(ข้อความลายมือบนภาพ ช็อตละ 1 วลี 3–6 คำ + อีโมจิ/สัญลักษณ์ได้เล็กน้อย — ใช้แสดงบนชีทและให้ผู้ใช้
copy ไปใส่ตอนตัดต่อเท่านั้น ห้ามใส่ในภาพ gen หรือ video prompt)
- Shot 1: "<วลี>"
```

### โครงช็อตรีวิว (บังคับตามจำนวนช็อต)
- คลิป 10 วิ = 5 ช็อต (ช็อตละ 2 วิ) / คลิป 8 วิ = 4 ช็อต / คลิป 6 วิ = 3 ช็อต / คลิป 4 วิ = 2 ช็อต
- ลำดับ: **เปิดตัวสินค้า** (hook — เห็นสินค้าเต็มตัวในบ้านสวย ๆ + ชื่อสินค้าใน overlay) → **จุดขายทีละข้อ** (โคลสอัพ/มุมเดโม ข้อละช็อต เลือกข้อที่ "มองเห็นได้" ก่อน) → **ช็อตปิด lifestyle** ("เข้ากับบ้านสุด ๆ" — สินค้าอยู่ในมุมห้องจัดเสร็จ + CTA ใน overlay)
- คลังมุมกล้อง: Wide / Wide 45° / Close Up / Macro / Top View / Side View — คลังการเคลื่อนกล้อง: Slow Push In / Slow Pull Out / Slow Dolly / Slow Pan / Slow Follow / Slow Motion / Static (เลือกให้เข้ากับ action ไม่บังคับครบทุกแบบ แต่ช็อตเปิดควร Push In และช็อตปิดควร Pull Out)

### Iron rules เพิ่มเติมของ review (ใช้ร่วมกับ Iron rules ของ drama ที่ไม่ขัดกัน)
1. ห้าม gen ภาพสินค้าโดยไม่แนบรูปต้นฉบับ และห้ามแก้รูปต้นฉบับของผู้ใช้ทุกกรณี
2. Voice Over เท่านั้น — ไม่มีใครพูดออกกล้อง ไม่มีบทสนทนา
3. Overlay อยู่บนชีทและในไฟล์ .md เท่านั้น — ไม่อยู่ในภาพ gen ไม่อยู่ใน video prompt
4. ข้อมูลสินค้า (ราคา สเปก คุณสมบัติ) ที่มองไม่เห็นจากรูป ห้ามแต่งเอง — ใช้เฉพาะที่ผู้ใช้บอก ไม่รู้ก็ไม่พูดถึง
5. โทนภาพทุกช็อตตาม `page-brief.md` ของเพจ (ค่าเริ่มต้น: cozy minimal Thai home, soft natural daylight, clean warm tones)

## Content Workflow
Use this sequence for each post (always inside one page's folder):

1. Add or update the title in `pages/<slug>/projects/<proj>/content_planner/content-topics.md` using one short line per post.
2. Create or update the detailed brief in `pages/<slug>/projects/<proj>/content_planner/dayN-content-M.md`.
3. Verify any time-sensitive facts before design, especially prices, dates, and headlines.
4. Build the image prompt following that page's `page-brief.md` (mascot, tone, logo requirement).
5. Generate drafts, review readability on mobile, and refine layout or text density.
6. Export the approved file to `pages/<slug>/projects/<proj>/generated_posts/dayN/`.
7. Review the result in the React viewer (select the page in the page switcher) before publishing to Facebook.

Each `dayN-content-M.md` file should usually include:
- `Content Type`
- `Title`
- `Objective`
- `Key Message`
- `Talking Points` or `Visual Direction`
- `Image Prompt`
- `Caption + Hashtags`
- `CTA` when useful

## Testing Guidelines
Quality control is manual.

- Confirm each image is readable on mobile.
- Verify the page's logo is present and recognizable when required.
- Confirm the caption matches the exact topic of the image and can be long-form when the post is educational.
- Check that market facts with dates or prices are validated before publishing.
- Review final files from the page's `generated_posts/` before delivery.
- Run `npm run build` after UI changes to confirm the React viewer still compiles.

## Viewer Notes
The React viewer is intentionally overview-first: cards should stay compact and show only the identifier, title, thumbnail, status, and action buttons. Full content belongs in modals, not in the grid.

Multi-page behavior:
- pages are discovered automatically from `pages/*/page.config.json` and `pages/*/content_planner/content-topics.md` via `import.meta.glob`
- the root URL (`/`) is a dashboard listing every page as a card (cover image, logo, FB-connected badge, post/image counts) with create/edit/delete actions; `?page=<slug>` is that page's content view (history API navigation, browser back works)
- page create/edit/delete call the dev-only `/api/pages` endpoints; deleting moves the folder to `_trash/`
- dropping an image file onto a post card uploads it via `/api/pages/<slug>/projects/<proj>/images/<day>/<content>` and saves it with the correct `dayN-content-M.<ext>` name
- the create/edit page modal also uploads brand assets via `/api/pages/<slug>/assets/<kind>` (`logo` → `assets/logo/logo.<ext>`, `character-sheet` → `assets/logo/charator-sheet.<ext>`, `style-reference` → auto-numbered `assets/style-references/style-ref-NN.<ext>`)
- Facebook settings (token, page id, api version) are stored per page slug in `localStorage` and must never be shared across pages
- publish/schedule always uses the settings of the page that owns the post, so content cannot be posted to the wrong Facebook page

Facebook posting is currently client-side:
- settings are stored in browser `localStorage` (keyed by page slug)
- access tokens should stay masked by default in the settings modal
- published content should no longer show `โพสต์` or `ตั้งเวลาโพสต์`
- content status persists across refreshes per page, so the user can see what has already been posted
- legacy single-page settings/status keys are migrated to the first available page on first load

This workspace is local-only; do not deploy the viewer publicly because tokens live in the browser.

## Commit & Pull Request Guidelines
This folder is not tracked as its own Git repository, so no local commit history is available to infer conventions.

If this workspace is later tracked in Git:
- Use short imperative commit messages, e.g. `Add INTC intro post asset`.
- Keep commits focused on one content batch or asset update.
- In pull requests, include a short summary, affected paths, and screenshots or file links for newly generated visuals.

## Content Notes
Follow each page's own `page-brief.md` for brand direction and each project's format rules. Captions can be as long as the topic needs (educational/explainer posts may use full copy). Include a disclaimer when a post could be interpreted as investment/medical/other regulated advice.
