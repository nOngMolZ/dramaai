// Format Registry (ฝั่ง frontend) — ความรู้เฉพาะแต่ละ "ประเภทงาน" อยู่ที่นี่ที่เดียว
// กติกาเหล็ก: ห้ามมี if (format === "drama"/"review"/...) นอกไฟล์นี้ — เพิ่มแนวใหม่ = เพิ่ม entry ที่นี่
// คู่ขนานกับ server/formats.mjs (ฝั่ง scaffold/API)
import {
  buildDramaShotGenCommand,
  buildReviewShotGenCommand,
  buildDramaCoverCommand,
  buildReviewCoverCommand,
} from "./builders.js";

// ป้ายคำของ view แบบ "เรื่องเป็นหน่วย" (drama/review ใช้ story view ร่วมกัน ต่างแค่คำ)
const DRAMA_LABELS = {
  pill: "🎬 ละครสั้น",
  studioButton: "🎬 Drama Studio",
  studioName: "Drama Studio",
  unitAt: "เรื่องที่",
  unitPlural: "เรื่องทั้งหมด",
  overviewKicker: "Stories",
  detailKicker: "Story",
  backLabel: "← กลับหน้ารวมเรื่อง",
  sceneWord: "ฉาก",
  scenesHeading: "ฉากทั้งหมด",
  scenesKicker: "Scenes",
  castWord: "ตัวละคร",
  castAll: "ตัวละครทั้งหมด",
  castInStory: "ตัวละครในเรื่องนี้",
  castMain: "ตัวละครหลัก",
  coverHint: "ยังไม่มีปก — ลากภาพโปสเตอร์มาวาง",
};

const REVIEW_LABELS = {
  pill: "🛍️ รีวิวสินค้า",
  studioButton: "🛍️ Review Studio",
  studioName: "Review Studio",
  unitAt: "รีวิวที่",
  unitPlural: "รีวิวทั้งหมด",
  overviewKicker: "Reviews",
  detailKicker: "Review",
  backLabel: "← กลับหน้ารวมรีวิว",
  sceneWord: "คลิป",
  scenesHeading: "คลิปทั้งหมด",
  scenesKicker: "Clips",
  castWord: "พรีเซนเตอร์",
  castAll: "พรีเซนเตอร์ทั้งหมด",
  castInStory: "พรีเซนเตอร์ในรีวิวนี้",
  castMain: "พรีเซนเตอร์ของเพจ",
  coverHint: "ยังไม่มีปก — ลากภาพสินค้า/ชีทมาวาง",
};

// registry หลัก
//   isStory      ใช้ story/scene view ไหม (drama/review = true, infographic = false)
//   labels       ป้ายคำของ story view (null ถ้าไม่ใช่ story)
//   shotGen      ฟังก์ชันสร้างคำสั่ง gen ภาพช็อต (null ถ้าไม่มี)
//   coverCmd     ฟังก์ชันสร้างคำสั่ง gen ภาพปกเรื่อง/รีวิว (null ถ้าไม่มีปก)
//   studioKey    key ของ studio modal (ใช้ map ใน App); null = ไม่มี studio
export const FORMATS = {
  infographic: {
    id: "infographic",
    label: "อินโฟกราฟฟิก",
    isStory: false,
    labels: null,
    shotGen: null,
    coverCmd: null,
    studioKey: null,
  },
  drama: {
    id: "drama",
    label: "ละครสั้น",
    isStory: true,
    labels: DRAMA_LABELS,
    shotGen: buildDramaShotGenCommand,
    coverCmd: buildDramaCoverCommand,
    studioKey: "drama",
  },
  review: {
    id: "review",
    label: "รีวิวสินค้า UGC",
    isStory: true,
    labels: REVIEW_LABELS,
    shotGen: buildReviewShotGenCommand,
    coverCmd: buildReviewCoverCommand,
    studioKey: "review",
  },
};

export function getFormat(id) {
  return FORMATS[id] || FORMATS.infographic;
}

// normalize ค่า format ที่อ่านจาก config (ค่าที่ไม่รู้จัก → infographic)
export function normalizeFormat(raw) {
  return FORMATS[raw] ? raw : "infographic";
}

// เพจ/โปรเจกต์นี้เป็นแนว "เรื่องเป็นหน่วย" ไหม (ใช้แทน isStoryPage เดิม)
export function isStoryPage(page) {
  return getFormat(page?.type).isStory;
}

// ป้ายคำของ story view (fallback = drama labels เพื่อความปลอดภัย)
export function storyLabels(page) {
  return getFormat(page?.type).labels || DRAMA_LABELS;
}

// ฟังก์ชันสร้างคำสั่ง gen ปกของ format นี้ (null ถ้าไม่มีปก)
export function coverCommandFor(page) {
  return getFormat(page?.type).coverCmd;
}

// ฟังก์ชันสร้างคำสั่ง gen ภาพช็อตของ format นี้ (null ถ้าไม่มี)
export function shotGenFor(page) {
  return getFormat(page?.type).shotGen;
}

// ป้ายชื่อ format สั้น ๆ (ใช้บนการ์ด/แท็บ)
export const FORMAT_LABELS = Object.fromEntries(
  Object.values(FORMATS).map((f) => [f.id, f.label])
);

// ตัวเลือกตอนสร้างโปรเจกต์ใหม่
export const FORMAT_OPTIONS = [
  { id: "infographic", label: "อินโฟกราฟฟิก", hint: "โพสต์ภาพความรู้ + แคปชั่น ตั้งเวลาโพสต์ FB" },
  { id: "drama", label: "ละครสั้น", hint: "คลิปวิดีโอเป็นเรื่อง/ตอน มีตัวละคร" },
  { id: "review", label: "รีวิวสินค้า UGC", hint: "คลิปรีวิวสินค้าแนวผู้ใช้จริง" },
];
