// Image Style Presets — ตัวเลือกสไตล์ภาพที่ฉีด descriptor (อังกฤษ) เข้าท้าย prompt gen ภาพ/วิดีโอ
// เพิ่มสไตล์ใหม่ = เพิ่ม 1 entry ที่นี่ · descriptor คุมแค่ "ลุคภาพ" ไม่แตะเนื้อหา/ตัวละคร
// leaf module (ไม่ import อะไร) — builders.js import ไปใช้ได้โดยไม่เกิด circular

export const STYLE_PRESETS = [
  {
    id: "cinematic-real",
    label: "ภาพยนตร์สมจริง",
    hint: "หนังฟิล์มจริง แสงธรรมชาติ",
    descriptor:
      "cinematic photorealistic film look, natural soft daylight, shallow depth of field, subtle film grain, true-to-life skin tones",
  },
  {
    id: "intl-series",
    label: "ซีรีส์สากล (Netflix)",
    hint: "ขัดเกลา เกรดสีหรู ดูแพงอินเตอร์",
    descriptor:
      "premium streaming-series look, polished cinematography, rich teal-and-amber color grade, crisp detail, moody controlled lighting, high production value",
  },
  {
    id: "thai-tv-drama",
    label: "ละครไทยช่อง",
    hint: "สีสด คอนทราสต์จัด คมชัด",
    descriptor:
      "Thai prime-time TV drama look, bright vivid saturated colors, high contrast, even glossy lighting, sharp clean image, glamorous",
  },
  {
    id: "thai-period",
    label: "ไทยย้อนยุค",
    hint: "วินเทจอบอุ่น เครื่องแต่งกายสมัยก่อน",
    descriptor:
      "nostalgic Thai period look, warm vintage color palette, soft faded tones, golden-hour lighting, retro atmosphere, aged film aesthetic",
  },
  {
    id: "chinese-wuxia",
    label: "ซีรีส์จีนโบราณ",
    hint: "กำลังภายใน ผ้าไหม หมอก โคมไฟ",
    descriptor:
      "ancient Chinese historical wuxia look, flowing silk costumes, misty landscapes, warm lantern and candle light, elegant epic cinematography",
  },
  {
    id: "dark-noir",
    label: "ดราม่าเข้ม / นัวร์",
    hint: "มืด เงาลึก ดราม่าจัด",
    descriptor:
      "dark cinematic noir look, low-key moody lighting, deep shadows, high contrast, desaturated cool tones, tense dramatic atmosphere",
  },
  {
    id: "horror",
    label: "สยองขวัญ",
    hint: "หลอน โทนเย็นซีด น่าขนลุก",
    descriptor:
      "eerie horror look, cold desaturated palette, deep unsettling shadows, dim flickering light, ominous foggy atmosphere, unnerving mood",
  },
  {
    id: "romantic-dreamy",
    label: "โรแมนติกฟุ้ง",
    hint: "นุ่มฟุ้ง แสงอุ่น โบเก้",
    descriptor:
      "soft romantic dreamy look, warm glowing light, gentle bokeh, hazy pastel tones, tender flattering skin, delicate ethereal mood",
  },
  {
    id: "ugc-real",
    label: "UGC มือถือเรียล",
    hint: "ถ่ายมือถือจริง แคนดิด ธรรมชาติ",
    descriptor:
      "authentic UGC smartphone look, candid handheld feel, natural everyday indoor daylight, realistic un-staged relatable vibe",
  },
  {
    id: "k-drama",
    label: "เกาหลี K-drama",
    hint: "สะอาดตา พาสเทลนุ่ม ละมุน",
    descriptor:
      "Korean K-drama look, clean crisp image, soft pastel color grade, gentle diffused lighting, dewy flawless skin, cozy refined aesthetic",
  },
  {
    id: "anime",
    label: "อนิเมะ / การ์ตูน",
    hint: "อนิเมะ 2D ลายเส้นการ์ตูน",
    descriptor:
      "Japanese anime 2D illustration style, clean cel-shaded lines, vibrant flat colors, expressive stylized characters, painterly backgrounds",
  },
  {
    id: "premium-commercial",
    label: "โฆษณาพรีเมียม",
    hint: "สินค้าเด่น สตูดิโอสะอาด เงางาม",
    descriptor:
      "premium commercial product-photography look, clean minimal styling, soft studio lighting with gentle highlights, glossy crisp detail, aspirational high-end mood",
  },
];

// ตัวเลือกใน dropdown (มี "ไม่ระบุ" นำหน้า = ใช้โทนจาก page-brief/style-references เหมือนเดิม)
export const STYLE_OPTIONS = [
  { id: "", label: "— ใช้ค่าเพจ (ไม่ระบุสไตล์)", hint: "โทนมาจาก page-brief / style-references" },
  ...STYLE_PRESETS,
];

export function getStylePreset(id) {
  return STYLE_PRESETS.find((s) => s.id === id) || null;
}

// บรรทัดคำสั่งฉีดสไตล์ (ต่อท้าย prompt gen) — คืน "" ถ้าไม่ได้เลือกสไตล์
export function styleInstruction(id) {
  const preset = getStylePreset(id);
  if (!preset) return "";
  return `- สไตล์ภาพของงานนี้: ${preset.label} — ต่อท้ายทุก prompt สร้างภาพ/วิดีโอด้วยวลีนี้ "${preset.descriptor}" (คุมลุคภาพ/แสง/เกรดสีเท่านั้น ห้ามเปลี่ยนเนื้อหา ตัวละคร หรือ Product Lock)`;
}
