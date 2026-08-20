// Format registry (ฝั่ง server) — นิยามว่าแต่ละ "ประเภทงาน" ต้อง scaffold โฟลเดอร์/ไฟล์อะไรบ้าง
// กติกาเหล็ก: ความรู้เฉพาะ format อยู่ที่นี่ที่เดียว ห้ามมี if (format === ...) กระจายใน pages-api/scaffold
// คู่ขนานกับ src/formats/ ฝั่ง frontend (เพิ่มในเฟส 3)

export const SCHEMA_VERSION = 2;

// แพลตฟอร์ม gen วิดีโอที่รองรับ (ใช้ตอนสร้างโปรเจกต์ drama/review)
export const VIDEO_PLATFORMS = [
  "flow-veo31-8s",
  "flow-omni-4s",
  "flow-omni-6s",
  "flow-omni-8s",
  "flow-omni-10s",
  "grok-6s",
  "grok-10s",
  // legacy id — หน้าเว็บ map เป็น flow-omni-8s
  "flow-8s",
];

// นิยามแต่ละ format
//   label         ชื่อไทยแสดงใน UI
//   defaultPlatform ค่า platform เริ่มต้น (null = ไม่ใช้วิดีโอ)
//   dirs          โฟลเดอร์พิเศษที่ต้องสร้างตอน scaffold โปรเจกต์
//   withCharacters สร้าง characters/ + characters.md ไหม
//   starterBrief  สร้างไฟล์ day1-content-1.md ตัวอย่างไหม
//   studioTopics  content-topics.md แบบ studio (ว่าง ให้ AI เติม) หรือแบบมีตัวอย่าง Day 1
export const FORMATS = {
  infographic: {
    id: "infographic",
    label: "อินโฟกราฟฟิก",
    defaultPlatform: null,
    dirs: [],
    withCharacters: false,
    starterBrief: true,
    studioTopics: false,
  },
  drama: {
    id: "drama",
    label: "ละครสั้น",
    defaultPlatform: "flow-omni-8s",
    dirs: ["characters"],
    withCharacters: true,
    starterBrief: false,
    studioTopics: true,
  },
  review: {
    id: "review",
    label: "รีวิวสินค้า UGC",
    defaultPlatform: "flow-omni-10s",
    dirs: ["characters", "products"],
    withCharacters: true,
    starterBrief: false,
    studioTopics: true,
  },
};

export const FORMAT_IDS = Object.keys(FORMATS);

export function isValidFormat(format) {
  return Object.prototype.hasOwnProperty.call(FORMATS, format);
}

export function getFormat(format) {
  return FORMATS[format] || null;
}

// เลือก platform ให้ถูกต้องตาม format: ถ้าส่งค่ามาและ valid ใช้ค่านั้น ไม่งั้นใช้ default ของ format
export function resolvePlatform(format, platform) {
  const def = getFormat(format);
  if (!def || def.defaultPlatform === null) {
    return null;
  }
  return VIDEO_PLATFORMS.includes(platform) ? platform : def.defaultPlatform;
}
