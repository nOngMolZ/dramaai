import { normalizeFormat } from "./formats.js";

// ---- Brand-level globs (อยู่ที่ pages/<slug>/) ----
const pageConfigModules = import.meta.glob("../pages/*/page.config.json", {
  eager: true,
  import: "default",
});

const logoModules = import.meta.glob("../pages/*/assets/logo/logo.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default",
});

const characterSheetModules = import.meta.glob(
  "../pages/*/assets/logo/charator-sheet.{png,jpg,jpeg,webp}",
  {
    eager: true,
    import: "default",
  }
);

const styleRefModules = import.meta.glob(
  "../pages/*/assets/style-references/*.{png,jpg,jpeg,webp}",
  {
    eager: true,
    import: "default",
  }
);

const coverRefModules = import.meta.glob(
  "../pages/*/assets/cover-references/*.{png,jpg,jpeg,webp}",
  {
    eager: true,
    import: "default",
  }
);

// ---- Project-level globs (อยู่ที่ pages/<slug>/projects/<proj>/) ----
const projectConfigModules = import.meta.glob("../pages/*/projects/*/project.config.json", {
  eager: true,
  import: "default",
});

const topicsModules = import.meta.glob(
  "../pages/*/projects/*/content_planner/content-topics.md",
  {
    eager: true,
    import: "default",
    query: "?raw",
  }
);

const briefModules = import.meta.glob(
  "../pages/*/projects/*/content_planner/day*-content-*.md",
  {
    eager: true,
    import: "default",
    query: "?raw",
  }
);

const imageModules = import.meta.glob(
  "../pages/*/projects/*/generated_posts/day*/*.{png,jpg,jpeg,webp}",
  {
    eager: true,
    import: "default",
  }
);

// ภาพช็อตรายตัว (input ของ compose-sheet) — ใช้เป็น first frame ตอนสั่ง video gen
const shotImageModules = import.meta.glob(
  "../pages/*/projects/*/generated_posts/day*/shots/day*-content-*-shot-*.{png,jpg,jpeg,webp}",
  {
    eager: true,
    import: "default",
  }
);

const charactersDocModules = import.meta.glob(
  "../pages/*/projects/*/characters/characters.md",
  {
    eager: true,
    import: "default",
    query: "?raw",
  }
);

const characterImageModules = import.meta.glob(
  "../pages/*/projects/*/characters/*.{png,jpg,jpeg,webp}",
  {
    eager: true,
    import: "default",
  }
);

function getPageSlug(path) {
  const match = path.match(/^\.\.\/pages\/([^/]+)\//);
  return match ? match[1] : null;
}

function getProjectSlug(path) {
  const match = path.match(/^\.\.\/pages\/[^/]+\/projects\/([^/]+)\//);
  return match ? match[1] : null;
}

// prefix ของ content ภายในโปรเจกต์ (ใช้ประกอบ glob key)
function projectPrefix(pageSlug, projectSlug) {
  return `../pages/${pageSlug}/projects/${projectSlug}`;
}

function parseTopics(markdown) {
  const lines = markdown.split(/\r?\n/);
  const days = [];
  let currentDay = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const dayMatch = line.match(/^##\s+Day\s+(\d+)\s*(?:[—–:-]\s*(.+))?$/i);
    if (dayMatch) {
      const dayNumber = Number(dayMatch[1]);
      const existing = days.find((entry) => entry.day === dayNumber);
      currentDay = existing || { day: dayNumber, title: "", posts: [] };
      if (!existing) {
        days.push(currentDay);
      }
      if (dayMatch[2] && !currentDay.title) {
        currentDay.title = dayMatch[2].trim();
      }
      continue;
    }

    const contentMatch = line.match(/^-+\s+Content\s+(\d+):\s+(.+)$/i);
    if (contentMatch && currentDay) {
      currentDay.posts.push({
        contentNumber: Number(contentMatch[1]),
        listedTitle: contentMatch[2].trim(),
      });
    }
  }

  return days;
}

function getSection(markdown, sectionName) {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, "i");
  const match = markdown.match(regex);
  return match ? match[1].trim() : "";
}

function normalizeParagraphs(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");
}

function getImagePath(pageSlug, projectSlug, day, contentNumber) {
  const prefix = `${projectPrefix(pageSlug, projectSlug)}/generated_posts/day${day}/day${day}-content-${contentNumber}.`;
  const match = Object.entries(imageModules).find(([path]) => path.startsWith(prefix));
  return match ? match[1] : null;
}

// ภาพช็อตรายตัว: generated_posts/dayN/shots/dayN-content-M-shot-K.<ext>
function getShotImagePath(pageSlug, projectSlug, day, contentNumber, shotNumber) {
  const prefix = `${projectPrefix(pageSlug, projectSlug)}/generated_posts/day${day}/shots/day${day}-content-${contentNumber}-shot-${shotNumber}.`;
  const match = Object.entries(shotImageModules).find(([path]) => path.startsWith(prefix));
  return match ? match[1] : null;
}

// ภาพปกเรื่อง (movie poster) ของเพจละคร: generated_posts/dayN/dayN-cover.<ext>
function getStoryCoverPath(pageSlug, projectSlug, day) {
  const prefix = `${projectPrefix(pageSlug, projectSlug)}/generated_posts/day${day}/day${day}-cover.`;
  const match = Object.entries(imageModules).find(([path]) => path.startsWith(prefix));
  return match ? match[1] : null;
}

// แปลงไฟล์ฉากละคร (format ใน AGENTS.md) — สตอรี่บอร์ดแผ่นเดียว + video prompt เดียวต่อฉาก
function parseDramaScene(markdown) {
  const headingMatch = markdown.match(/^#\s+[^\n]*?[—-]\s*(.+)$/m);
  const charactersText = getSection(markdown, "ตัวละครในฉาก");

  // ตารางข้อมูลราย shot ย้ายจากชีท (compose-sheet) มาโชว์บนหน้าเว็บแทน — แตก field ให้ทีมอ่านง่าย
  // meta ในวงเล็บ = "เวลา, มุมกล้อง"; description ท้าย = "<action> — รายละเอียดภาพ: … — อารมณ์: … — วัตถุสำคัญ: …"
  const SHOT_FIELD_MAP = { "รายละเอียดภาพ": "detail", "อารมณ์": "emotion", "วัตถุสำคัญ": "keyObject" };
  const shotList = getSection(markdown, "Shot List")
    .split(/\r?\n/)
    .map((line) => line.replace(/^-+\s*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^Shot\s+(\d+)\s*(?:\(([^)]*)\))?\s*:?\s*(.*)$/i);
      if (!match) {
        return { shotNumber: 0, meta: "", description: line, action: line, detail: "", emotion: "", keyObject: "", time: "", camera: "" };
      }
      const meta = (match[2] || "").trim();
      const description = match[3].trim();
      const [timePart, ...cameraParts] = meta.split(/\s*,\s*/);
      const parts = description.split(/\s+[—–]\s+/);
      const fields = { action: parts[0].trim(), detail: "", emotion: "", keyObject: "" };
      for (const part of parts.slice(1)) {
        const field = part.match(/^([^:]+):\s*(.*)$/);
        if (field && SHOT_FIELD_MAP[field[1].trim()]) {
          fields[SHOT_FIELD_MAP[field[1].trim()]] = field[2].trim();
        } else if (part.trim()) {
          fields.detail = fields.detail ? `${fields.detail} — ${part.trim()}` : part.trim();
        }
      }
      return {
        shotNumber: Number(match[1]),
        meta,
        description,
        time: (timePart || "").replace(/\s*(?:วิ\.?|วินาที)\s*$/, "").trim(),
        camera: cameraParts.join(", ").trim(),
        ...fields,
      };
    });

  // บทพูด format ใหม่ผูกราย shot ("- Shot 1 — ผู้พูด (อารมณ์): ...") — แยกเข้าการ์ด shot
  // บรรทัดที่ไม่ระบุ shot (format เก่า) เก็บไว้โชว์รวมท้าย modal เหมือนเดิม
  const parseShotBoundSection = (heading) => {
    const byShot = {};
    const rest = [];
    for (const rawLine of getSection(markdown, heading).split(/\r?\n/)) {
      const line = rawLine.replace(/^-+\s*/, "").trim();
      if (!line) {
        continue;
      }
      // รองรับทั้ง "Shot 1 — ..." (drama) และ "Shot 1 (โทน): ..." (review Voice Over)
      const shotMatch = line.match(/^Shot\s+(\d+)\s*(?:\(([^)]*)\))?\s*[—–:-]\s*(.+)$/i);
      if (shotMatch) {
        const shotNumber = Number(shotMatch[1]);
        if (!byShot[shotNumber]) {
          byShot[shotNumber] = [];
        }
        byShot[shotNumber].push(
          shotMatch[2] ? `(${shotMatch[2].trim()}) ${shotMatch[3].trim()}` : shotMatch[3].trim()
        );
      } else {
        rest.push(line);
      }
    }
    return { byShot, rest };
  };

  // เพจรีวิวใช้ "## Voice Over" แทน "## บทพูด" — อ่านช่องไหนมีข้อมูล
  const dialogueText = getSection(markdown, "บทพูด") || getSection(markdown, "Voice Over");
  const dialogueSectionName = getSection(markdown, "บทพูด") ? "บทพูด" : "Voice Over";
  const { byShot: dialogueByShot, rest: dialogueRest } = parseShotBoundSection(dialogueSectionName);
  // เสียง format ใหม่ผูกราย shot เหมือนบทพูด — format เก่า (ระดับฉาก) ตกไปอยู่ใน rest
  const { byShot: soundByShot, rest: soundRest } = parseShotBoundSection("เสียง");
  // เพจรีวิว: ข้อความ overlay ลายมือราย shot (แสดงในการ์ด shot — ผู้ใช้เอาไปใส่ตอนตัดต่อ)
  const { byShot: overlayByShot } = parseShotBoundSection("Overlay");

  return {
    beat: headingMatch ? headingMatch[1].trim() : "",
    summary: getSection(markdown, "สรุปฉาก"),
    characters: charactersText
      .split(/\r?\n/)
      .map((line) => line.replace(/^-+\s*/, "").trim())
      .filter(Boolean),
    shotList,
    // format ใหม่: prompt ราย shot (## คำสั่งสร้างภาพช็อต) — fallback อ่าน format เก่า (ชีทแผ่นเดียว)
    storyboardPrompt:
      getSection(markdown, "คำสั่งสร้างภาพช็อต") || getSection(markdown, "คำสั่งสร้างภาพสตอรี่บอร์ด"),
    videoPrompt: getSection(markdown, "คำสั่งสร้างวิดีโอ"),
    sound: soundRest.join(" "),
    soundByShot,
    dialogue: dialogueText,
    dialogueByShot,
    dialogueRest,
    overlayByShot,
  };
}

// บรรทัดกันเหตุ video gen เอา "ชีทสตอรี่บอร์ด/ตัวหนังสือ" ไปโผล่ในคลิป เวลาผู้ใช้แนบภาพประกอบคำสั่ง
const VIDEO_REF_GUARD =
  "If a reference image is attached, use it only as the first-frame / storyboard reference for the characters, framing, and shot order — never show a storyboard sheet, paper background, panel borders, or any text on screen.";

// format ใหม่: คำสั่งสร้างวิดีโอเป็น English prompt เดียวจบในตัว (มีบทพูดผูกช่วงเวลาแล้ว) — คัดลอกตรง ๆ
// format เก่า (ไทย ไม่มีบทพูดใน prompt): fallback รวม Shot List + เสียง + บทพูด ให้เหมือนเดิม
function buildSceneVideoPack(scene) {
  const prompt = scene.videoPrompt || "";
  // English prompt เดียวจบในตัว — โครงใหม่ (Shot K: / Global rules: / Use the attached storyboard)
  // และโครงเดิม (SHOT 1 | / aspect ratio) → คัดลอกตรง ๆ
  const isSelfContained =
    /aspect ratio|Global rules:|Main characters:|Generate one continuous|^\s*SHOT\s*1\s*\||^\s*Shot\s*1\s*:/im.test(prompt);
  if (isSelfContained) {
    // มี reference guard อยู่แล้ว (guard เก่า "never show a storyboard sheet" หรือ guard ใหม่
    // "Use the attached storyboard") → ไม่ prepend ซ้ำ
    return /never show a storyboard sheet|Use the attached storyboard/i.test(prompt)
      ? prompt
      : `${VIDEO_REF_GUARD}\n\n${prompt}`;
  }

  const shotLines = scene.shotList
    .map((shot) => `- Shot ${shot.shotNumber}${shot.meta ? ` (${shot.meta})` : ""}: ${shot.description}`)
    .join("\n");

  return [
    scene.videoPrompt ? `คำสั่งสร้างวิดีโอ:\n${scene.videoPrompt}` : "",
    shotLines ? `ภาพที่เห็นตามช่วงเวลา:\n${shotLines}` : "",
    scene.sound ? `เสียง:\n${scene.sound}` : "",
    scene.dialogue ? `บทพูด:\n${scene.dialogue}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

// แปลง characters.md เป็นรายการตัวละคร (field ตาม template ใน AGENTS.md)
function parseCharacters(markdown) {
  const lines = markdown.split(/\r?\n/);
  const characters = [];
  let current = null;
  let currentField = null;

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      current = { name: heading[1].trim(), fields: {} };
      characters.push(current);
      currentField = null;
      continue;
    }
    if (!current) {
      continue;
    }
    const bullet = line.match(/^-\s*([^:]+):\s*(.*)$/);
    if (bullet) {
      currentField = bullet[1].trim();
      current.fields[currentField] = bullet[2].trim();
      continue;
    }
    if (currentField && line.trim()) {
      current.fields[currentField] +=
        (current.fields[currentField] ? "\n" : "") + line.trim();
    }
  }

  // ข้าม section ตัวอย่างใน template ที่ยังไม่ได้กรอก
  return characters.filter((entry) => !entry.name.startsWith("("));
}

function getCharacterImage(pageSlug, projectSlug, character, index) {
  const referenced = (character.fields["ภาพต้นแบบ"] || "").trim();
  const baseName = referenced
    ? referenced.split("/").pop().replace(/\.(png|jpe?g|webp)$/i, "")
    : `char-${index + 1}`;
  const prefix = `${projectPrefix(pageSlug, projectSlug)}/characters/${baseName}.`;
  const match = Object.entries(characterImageModules).find(([path]) => path.startsWith(prefix));
  return { href: match ? match[1] : null, baseName };
}

function buildDaysForProject(pageSlug, projectSlug, imageStyle = "") {
  const topicsMarkdown =
    topicsModules[`${projectPrefix(pageSlug, projectSlug)}/content_planner/content-topics.md`] || "";
  const topicDays = parseTopics(topicsMarkdown);

  return topicDays.map((dayEntry) => ({
    day: dayEntry.day,
    title: dayEntry.title || "",
    coverHref: getStoryCoverPath(pageSlug, projectSlug, dayEntry.day),
    posts: dayEntry.posts.map((postEntry) => {
      const briefPath = `${projectPrefix(pageSlug, projectSlug)}/content_planner/day${dayEntry.day}-content-${postEntry.contentNumber}.md`;
      const markdown = briefModules[briefPath] || "";
      const title = getSection(markdown, "Title").split(/\r?\n/)[0]?.trim() || postEntry.listedTitle;
      const type = getSection(markdown, "Content Type").split(/\r?\n/)[0]?.trim() || "Content";
      const objective = getSection(markdown, "Objective");
      const keyMessage = getSection(markdown, "Key Message");
      const caption = normalizeParagraphs(getSection(markdown, "Caption + Hashtags"));
      const summary = normalizeParagraphs(objective || keyMessage).slice(0, 260);

      return {
        id: `day${dayEntry.day}-content-${postEntry.contentNumber}`,
        pageSlug,
        projectSlug,
        imageStyle, // สไตล์ภาพของโปรเจกต์ (ฉีดเข้า shot-gen command)
        day: dayEntry.day,
        contentNumber: postEntry.contentNumber,
        title,
        type,
        summary,
        caption,
        markdown,
        imageHref: getImagePath(pageSlug, projectSlug, dayEntry.day, postEntry.contentNumber),
      };
    }),
  }));
}

// page.config.json เก่าที่ยังใช้ id เดิม — map เข้า platform ปัจจุบัน (ผู้ใช้เจนบน Flow ด้วย Omni Flash)
const DRAMA_PLATFORM_ALIASES = {
  "flow-8s": "flow-omni-8s",
};

// เพจแบบ "เรื่องเป็นหน่วย" (Day = เรื่อง/รีวิว) ใช้ story view ร่วมกัน ต่างแค่ป้ายคำ
// ป้ายคำ/registry ของ format ย้ายไป ./formats.js (Format Registry) แล้ว

// สร้าง "project working object" — มี shape เดียวกับ page เดิม (มี .slug, .type, .days, .platform,
// asset ของแบรนด์) เพื่อให้ view code เดิมทำงานได้เกือบทั้งหมด + เพิ่ม pageSlug/projectSlug
function buildProject(pageSlug, projectSlug, brand) {
  const config =
    projectConfigModules[`${projectPrefix(pageSlug, projectSlug)}/project.config.json`] || {};
  const format = normalizeFormat(config.format);
  const imageStyle = config.imageStyle || "";
  const days = buildDaysForProject(pageSlug, projectSlug, imageStyle);
  const totalPosts = days.reduce((sum, day) => sum + day.posts.length, 0);
  const totalImages = days.reduce(
    (sum, day) => sum + day.posts.filter((post) => post.imageHref).length,
    0
  );
  // ปกโปรเจกต์: ใช้โปสเตอร์เรื่อง (dayN-cover.png) ก่อน — drama/review มีปกสวย
  // ไม่มีค่อย fallback เป็นภาพโพสต์แรก (เช่น infographic ที่ไม่มีปกแยก)
  const storyCover = days.find((day) => day.coverHref)?.coverHref || null;
  const firstPostImage =
    days.flatMap((day) => day.posts).find((post) => post.imageHref)?.imageHref || null;
  const coverHref = storyCover || firstPostImage;

  return {
    // identity
    pageSlug,
    projectSlug,
    slug: pageSlug, // view code เดิมที่ใช้ page.slug (asset/FB/page-level) ยังทำงานได้
    name: config.name || projectSlug,
    type: format, // view เดิมเช็ค type (isStoryPage / storyLabels); "infographic" = non-story
    format,
    platform: DRAMA_PLATFORM_ALIASES[config.platform] || config.platform || "flow-omni-8s",
    aspectRatio: config.aspectRatio || "",
    imageStyle, // สไตล์ภาพของโปรเจกต์ (ใช้ใน episode/cover command)
    days,
    totalPosts,
    totalImages,
    coverHref,
    // brand fields (inherited จากเพจ) — view ใช้ผ่าน page object
    brandName: brand.name,
    description: brand.description,
    logoHref: brand.logoHref,
    characterSheetHref: brand.characterSheetHref,
    styleRefCount: brand.styleRefCount,
    coverRefCount: brand.coverRefCount,
  };
}

function buildPages() {
  const slugs = new Set();
  for (const path of Object.keys(pageConfigModules)) {
    const slug = getPageSlug(path);
    if (slug) slugs.add(slug);
  }
  // เผื่อเพจที่ยังไม่มี page.config.json แต่มีโปรเจกต์แล้ว
  for (const path of Object.keys(projectConfigModules)) {
    const slug = getPageSlug(path);
    if (slug) slugs.add(slug);
  }

  return [...slugs].sort().map((slug) => {
    const config = pageConfigModules[`../pages/${slug}/page.config.json`] || {};

    const logoEntry = Object.entries(logoModules).find(([path]) =>
      path.startsWith(`../pages/${slug}/assets/logo/logo.`)
    );
    const characterSheetEntry = Object.entries(characterSheetModules).find(([path]) =>
      path.startsWith(`../pages/${slug}/assets/logo/charator-sheet.`)
    );
    const styleRefCount = Object.keys(styleRefModules).filter((path) =>
      path.startsWith(`../pages/${slug}/assets/style-references/`)
    ).length;
    const coverRefCount = Object.keys(coverRefModules).filter((path) =>
      path.startsWith(`../pages/${slug}/assets/cover-references/`)
    ).length;

    const brand = {
      slug,
      name: config.name || slug,
      shortName: config.shortName || config.name || slug,
      description: config.description || "",
      logoHref: logoEntry ? logoEntry[1] : null,
      characterSheetHref: characterSheetEntry ? characterSheetEntry[1] : null,
      styleRefCount,
      coverRefCount,
    };

    // ค้นหาโปรเจกต์ของเพจนี้จาก project.config glob
    const projectSlugs = new Set();
    for (const path of Object.keys(projectConfigModules)) {
      if (getPageSlug(path) === slug) {
        const projectSlug = getProjectSlug(path);
        if (projectSlug) projectSlugs.add(projectSlug);
      }
    }

    const projects = [...projectSlugs]
      .sort()
      .map((projectSlug) => buildProject(slug, projectSlug, brand));

    return {
      ...brand,
      projects,
      totalPosts: projects.reduce((sum, p) => sum + p.totalPosts, 0),
      totalImages: projects.reduce((sum, p) => sum + p.totalImages, 0),
      coverHref: projects.find((p) => p.coverHref)?.coverHref || null,
    };
  });
}

const PAGES = buildPages();

function getSlugFromUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  const fromUrl = new URLSearchParams(window.location.search).get("page");
  if (fromUrl && PAGES.some((page) => page.slug === fromUrl)) {
    return fromUrl;
  }
  return null;
}

// ?project=<proj> — โปรเจกต์ที่กำลังเปิดในเพจนั้น
function getProjectFromUrl() {
  if (typeof window === "undefined") {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const pageSlug = params.get("page");
  const projectSlug = params.get("project");
  if (!pageSlug || !projectSlug) {
    return null;
  }
  const page = PAGES.find((p) => p.slug === pageSlug);
  return page?.projects.some((pr) => pr.projectSlug === projectSlug) ? projectSlug : null;
}

// ?story=<N> คือหน้ารายละเอียดเรื่องที่ N ของเพจละคร
function getStoryFromUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = new URLSearchParams(window.location.search).get("story");
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}
export {
  pageConfigModules,
  logoModules,
  characterSheetModules,
  styleRefModules,
  coverRefModules,
  projectConfigModules,
  topicsModules,
  briefModules,
  imageModules,
  shotImageModules,
  charactersDocModules,
  characterImageModules,
  getPageSlug,
  getProjectSlug,
  projectPrefix,
  parseTopics,
  getSection,
  normalizeParagraphs,
  getImagePath,
  getShotImagePath,
  getStoryCoverPath,
  parseDramaScene,
  VIDEO_REF_GUARD,
  buildSceneVideoPack,
  parseCharacters,
  getCharacterImage,
  buildDaysForProject,
  DRAMA_PLATFORM_ALIASES,
  buildProject,
  buildPages,
  PAGES,
  getSlugFromUrl,
  getProjectFromUrl,
  getStoryFromUrl,
};
