# Facebook Auto Content (Multi-Page)

โปรเจกต์นี้ใช้วางแผนคอนเทนต์ Facebook แบบภาพล้วน โครงสร้างเป็น **3 ชั้น: เพจ (แบรนด์) → โปรเจกต์ (เลือกแนวงาน) → คอนเทนต์** เพจเดียวทำได้หลายแนว — อินโฟกราฟฟิก, ละครสั้น, รีวิวสินค้า UGC — โดยไม่ต้องสร้างเพจซ้ำ ดูภาพ/คอนเทนต์ผ่านหน้าเว็บ React แล้วสั่งโพสต์หรือตั้งเวลาโพสต์ไป Facebook Page ได้จากที่เดียว

## โครงสร้างหลัก

```
pages/
  <page-slug>/                        ← เพจ = แบรนด์ (ใช้ร่วมทุกโปรเจกต์)
    page.config.json                  ← identity: name / shortName / description
    page.config.local.json            ← 🔒 FB token/pageId (git-ignored, optional)
    page-brief.md                     ← brief แบรนด์ (คอนเซปต์ มาสคอท pillars)
    assets/logo/ · style-references/   ← โลโก้/สไตล์ระดับแบรนด์
    projects/
      <project-slug>/                 ← โปรเจกต์ = 1 แนวงาน
        project.config.json           ← { format, name, platform? }
        content_planner/
          content-topics.md           ← สารบัญหัวข้อ แบ่งเป็น Day
          dayN-content-M.md           ← brief รายโพสต์
        generated_posts/
          dayN/dayN-content-M.png     ← ภาพที่สร้างเสร็จ
        characters/ · products/       ← (ละคร/รีวิว) ตัวละคร/รูปสินค้า
src/                                  ← โค้ด React (formats.js = Format Registry)
server/formats.mjs                    ← format registry ฝั่ง scaffold/API
scripts/migrate-to-projects.mjs       ← ย้ายเพจโครงเก่า → page→project (ครั้งเดียว)
```

`format` มี 3 แบบ: `infographic` (โพสต์ภาพความรู้), `drama` (ละครสั้นวิดีโอ), `review` (รีวิวสินค้า UGC)

## วิธีรัน

ติดตั้ง dependency:

```bash
npm install --cache /private/tmp/codex-gpt-image2-npm-cache
```

รันหน้าเว็บ:

```bash
npm run dev
```

เปิดใช้งานที่:

```text
http://localhost:3000/
```

ถ้าต้องการ build:

```bash
npm run build
```

## แดชบอร์ดหน้าแรก

เปิด `http://localhost:3000/` จะเจอ**แดชบอร์ดรวมทุกเพจ** แสดงเป็นการ์ด (ภาพ cover จากโพสต์แรกที่มีภาพ + โลโก้เพจ + สถานะเชื่อม Facebook + จำนวนวัน/โพสต์/ภาพ/โพสต์แล้ว) จัดการทุกอย่างได้จากหน้านี้:

- **เปิดเพจ** — คลิกการ์ดหรือปุ่ม `เปิดเพจ` เพื่อเข้าไปดูคอนเทนต์ โพสต์ ตั้งเวลาโพสต์ (URL เป็น `/?page=<slug>` แชร์/บุ๊กมาร์กได้ ปุ่ม back ของ browser ใช้ได้)
- **สร้างเพจใหม่** — ปุ่ม `+ สร้างเพจใหม่` หรือการ์ดเส้นประท้ายรายการ กรอกชื่อเพจ ระบบเดา slug ให้ แล้วสร้างโฟลเดอร์พร้อมไฟล์ template ครบ
- **แก้ไขเพจ** — เปลี่ยนชื่อ, ชื่อสั้นบนแท็บ, คำอธิบาย (เขียนกลับลง `page.config.json`)
- **อัพโหลด Brand Assets** — ในโมดอลสร้าง/แก้ไขเพจ ลากไฟล์ (หรือคลิกเลือก) ลงช่อง **โลโก้**, **Character Sheet**, **Style References** (หลายไฟล์ได้) ระบบตั้งชื่อและวางโฟลเดอร์ให้ถูกเอง: `assets/logo/logo.png`, `assets/logo/charator-sheet.png`, `assets/style-references/style-ref-NN.png`
- **ลบเพจ** — กด 2 ครั้งเพื่อยืนยัน ระบบจะ**ย้ายโฟลเดอร์ไป `_trash/` ไม่ได้ลบจริง** กู้คืนได้โดยย้ายโฟลเดอร์กลับมาที่ `pages/`

ในหน้าเพจแต่ละเพจ มีแท็บ `⌂ แดชบอร์ด` มุมซ้ายบนสำหรับกลับหน้าแรก และแท็บสลับเพจอื่นได้ทันที

นอกจากนี้ยัง**ลากรูปมาวางบนการ์ดโพสต์**เพื่ออัพโหลด/แทนที่ภาพได้เลย ระบบจะตั้งชื่อไฟล์และวางลงโฟลเดอร์ที่ถูกต้องให้อัตโนมัติ (รองรับ PNG, JPG, WEBP)

ระบบหลังบ้านนี้เป็น API ที่ฝังอยู่ใน Vite dev server (`server/pages-api.mjs`) จึง**ใช้ได้เฉพาะตอนรัน `npm run dev`** ซึ่งตรงกับการใช้งานแบบ local — ถ้าอนาคตจะ deploy ขึ้นเซิร์ฟเวอร์จริง สามารถนำ `createPagesApi` ไปเสียบกับ Express/connect แล้วเสิร์ฟ `dist/` ได้ (ควรเพิ่มระบบ login และย้าย token ไปฝั่ง server ก่อน)

### เพิ่มเพจผ่าน command line (ทางเลือก)

```bash
npm run new-page -- crypto-cat "คริปโตแมวส้ม"
```

สคริปต์จะสร้างโฟลเดอร์ `pages/<slug>/` พร้อมไฟล์ template ทั้งหมด จากนั้นรีสตาร์ท `npm run dev` เพจใหม่จะขึ้นในแถบสลับเพจด้านบนอัตโนมัติ (หรือจะสร้างโฟลเดอร์เองตามโครงสร้างด้านบนก็ได้)

`page.config.json` (แบรนด์) มีรูปแบบ:

```json
{
  "schemaVersion": 2,
  "name": "ชื่อเต็มของเพจ",
  "shortName": "ชื่อสั้นบนแท็บ",
  "description": "คำอธิบายที่แสดงใน hero",
  "channels": []
}
```

`project.config.json` (แต่ละโปรเจกต์) เลือกแนวงาน:

```json
{
  "schemaVersion": 2,
  "format": "drama",
  "name": "ชื่อโปรเจกต์",
  "platform": "flow-omni-8s"
}
```

## วิธีเพิ่มคอนเทนต์วันใหม่ (ต่อโปรเจกต์)

1. เพิ่มหัวข้อใน `pages/<slug>/projects/<proj>/content_planner/content-topics.md`
2. สร้างไฟล์ `dayN-content-1.md` ถึง `dayN-content-3.md` ในโฟลเดอร์ `content_planner/` ของโปรเจกต์นั้น
3. ในแต่ละไฟล์ควรมี:
   - `Content Type`
   - `Title`
   - `Objective`
   - `Key Message`
   - `Image Prompt`
   - `Caption + Hashtags`
4. สร้างภาพแล้วบันทึกไว้ที่ `pages/<slug>/projects/<proj>/generated_posts/dayN/`

เมื่อชื่อไฟล์ตรงตาม format หน้าเว็บจะดึงมาแสดงอัตโนมัติ และคอนเทนต์ของแต่ละเพจจะไม่ปนกัน

## การโพสต์ไป Facebook

เลือกเพจจากแถบด้านบนก่อน แล้วกด `Facebook Settings` เพื่อใส่:

- `Facebook Page Access Token`
- `Page ID` ถ้าระบบหาให้ไม่ได้

การตั้งค่าเป็น **รายเพจ** — token ของเพจหนึ่งจะไม่ถูกใช้กับอีกเพจ ปุ่มโพสต์/ตั้งเวลาจะยิงไปที่ Facebook Page ตาม token ของเพจที่กำลังเปิดอยู่เท่านั้น

ในโมดอลตั้งค่ามีคู่มือสร้าง token และลิงก์ไป `Graph API Explorer` ให้แล้ว

หมายเหตุ:

- token ของทุกเพจถูกเก็บใน `localStorage` ของ browser (แยก key ตามเพจ)
- ช่อง token ถูกซ่อนไว้โดย default
- ถ้าโพสต์แล้ว ระบบจะเก็บสถานะไว้และซ่อนปุ่ม `โพสต์` / `ตั้งเวลาโพสต์`
- การตั้งค่าและสถานะโพสต์จากเวอร์ชันเพจเดียว (ก่อนอัพเกรด) จะถูกย้ายมาเป็นของเพจ `mekastock` ให้อัตโนมัติ

## สถานะคอนเทนต์

แต่ละการ์ดในหน้าเว็บมีสถานะ เช่น:

- `ยังไม่โพสต์`
- `โพสต์แล้ว`
- `ตั้งเวลาแล้ว`
- `ผิดพลาดล่าสุด`

สถานะเหล่านี้ถูกเก็บไว้ใน browser แยกตามเพจ เพื่อให้รีเฟรชหน้าแล้วไม่หาย

## หมายเหตุการใช้งาน

- ควรตรวจสอบข้อมูลหุ้น, ราคา, และวันที่ก่อนโพสต์ทุกครั้ง
- ถ้าเป็นโพสต์เชิงการลงทุน ควรมี disclaimer
- หน้า overview ถูกออกแบบให้แสดงแค่ thumbnail, หัวข้อ, รหัสโพสต์, สถานะ, และปุ่มหลัก ส่วนคอนเทนต์เต็มจะดูในโมดอล
- ระบบออกแบบสำหรับใช้งาน local เท่านั้น ไม่ควร deploy ขึ้น public เพราะ token เก็บใน browser
# dramaai
