# Smoke Checklist — เทียบก่อน/หลังรื้อระบบ

> รันเช็คลิสต์นี้ท้ายทุกเฟส เทียบกับ baseline (เฟส 0 กับระบบเดิม)
> ผ่าน = พฤติกรรมเหมือน baseline · ไม่ผ่าน = bug ต้องแก้ก่อนไปเฟสถัดไป
> UI ทดสอบบนเบราว์เซอร์ Mac (`open http://localhost:3000/`) — ไม่ใช้ Claude-in-Chrome กับ localhost

## A. Programmatic (รันได้อัตโนมัติ — ดู `scripts/` หรือ curl)

- [ ] `GET /` = 200
- [ ] app โหลดไม่มี error ใน console
- [ ] นับไฟล์เท่า baseline: **md=25, images=64, config=2** (หลัง migrate นับใหม่ให้เท่า)
- [ ] ทุกเพจเดิมยังเปิดได้: drama-1, kaset-intrend

## B. อ่าน/แสดงผล (เพจเดิม — ห้าม regression)

- [ ] เปิด kaset-intrend → เห็นโพสต์อินโฟ 3 ชิ้น (day1-content-1..3) + รูปขึ้นครบ
- [ ] เปิด drama-1 → เห็นเรื่อง/ตอน + รูป shot + ภาพปก + ตัวละคร (characters.md + รูป) ขึ้นครบ
- [ ] โลโก้ + character-sheet + style-references + cover-references ของแต่ละเพจแสดงถูก
- [ ] บรีфแต่ละโพสต์กดเปิดอ่านได้ เนื้อหาตรง

## C. สร้าง/แก้ (เขียนไฟล์)

- [ ] สร้างเพจใหม่ (หลังเฟส 2: ไม่ถาม type แล้ว)
- [ ] สร้างโพสต์/บรีфใหม่ในเพจ → เขียน dayN-content-M.md + อัปเดต content-topics.md
- [ ] แก้บรีфแล้วเซฟ → ไฟล์เปลี่ยนจริง
- [ ] อัปโหลดภาพโพสต์ → ไฟล์ลง generated_posts ถูก path + แสดงในหน้าเว็บ
- [ ] (drama) อัปโหลดภาพตัวละคร / ภาพปก → ลงถูกที่
- [ ] ลบเพจ → ย้ายไป _trash + กู้คืนกลับได้

## D. Prompt generation (หัวใจของระบบ — ต้องเหมือนเดิม 100%)

- [ ] (infographic) gen คำสั่งสร้างภาพอินโฟ → ข้อความ prompt เหมือน baseline
- [ ] (drama) gen prompt เขียนเรื่อง + prompt ราย shot (video) → เหมือน baseline
- [ ] (review) gen prompt UGC review + shot list → เหมือน baseline
- [ ] aspect ratio / platform / seconds สะท้อนใน prompt ถูก

## E. Facebook (โพสต์/ตั้งเวลา)

- [ ] ตั้งค่า FB token/pageId แล้วเช็คสถานะเชื่อมต่อ (GET /me) ผ่าน
- [ ] โพสต์ทันที → ได้ fbPostId + ลิงก์
- [ ] ตั้งเวลาโพสต์ → สำเร็จ (validate ≥10 นาที ≤75 วัน — เพิ่มเฟส 4)

## F. เคสใหม่ที่ระบบเก่าทำไม่ได้ (ตัวชี้วัดว่ารื้อสำเร็จ)

- [ ] **สร้างโปรเจกต์ format ที่ 2 ใต้เพจเดิม** เช่น เพิ่ม review ใต้ drama-1 หรือ drama ใต้ kaset-intrend — โดยไม่ต้องสร้างเพจใหม่ ✨
- [ ] แต่ละโปรเจกต์ในเพจเดียวกันมี characters/products แยกกัน
- [ ] calendar รวมโพสต์จากทุกโปรเจกต์ของเพจ (เฟส 4)

---

## วิธีรันเร็ว

```bash
# ตรวจ baseline programmatic
curl -s -o /dev/null -w "app=%{http_code}\n" http://localhost:3000/
find pages -name '*.md' | wc -l          # ต้อง = 25
find pages \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.webp' \) | wc -l  # = 64

# UI เปิดบนเบราว์เซอร์ Mac
open http://localhost:3000/
```
