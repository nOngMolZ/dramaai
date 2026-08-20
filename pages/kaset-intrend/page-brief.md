# เกษตรอินเทรนด์

## 🧠 แนวทางเพจ

**Concept:**
ความรู้เกษตร บ้านสวน ระบบน้ำ แปลงผัก โรคพืช และลดต้นทุน เล่าให้เข้าใจง่าย เห็นภาพชัด ทำตามได้จริง

**Tagline:** เข้าใจง่าย ทำตามได้จริง

**บุคลิกแบรนด์:** อบอุ่น เป็นกันเอง มีประโยชน์จริง สนุกเล็กน้อย แต่ยังน่าเชื่อถือ

**รูปแบบภาพหลัก:** อินโฟกราฟฟิกแนวตั้ง ไฟล์สุดท้ายเป็น **4:5** — ได้มาจาก pipeline "generate แนวตั้ง 2:3 เต็มเฟรม → crop กลางด้วย sips" เท่านั้น (ดู 🏭 Image Production Pipeline) **ห้ามใส่คำว่า "4:5" ในตัว Image Prompt** เพราะโมเดลสร้าง 4:5 จริงไม่ได้ และจะวาดกรอบข้างปลอมมาแทน

## 🎭 คาแรกเตอร์หลัก: ลุง Boss

ชายไทยวัยกลางคน ผู้รู้สายเกษตร สุขุม ฉลาด มีประสบการณ์ เป็นกันเอง กวนเล็ก ๆ แบบจับโป๊ะมือใหม่ แต่ไม่หยาบ ไม่ตลกเกินไป

**ลักษณะประจำ (ต้องคงที่ทุกภาพ):**
ชายไทยวัยกลางคน, salt-and-pepper wavy hair, ผมมัดต่ำ, หนวดและเคราแพะ, gray patterned Mandarin-collar shirt with frog buttons, cream cropped wide pants, black slip-on shoes, wristwatch, wooden bead bracelet

**กฎคุมลุง Boss (ห้ามละเมิดเด็ดขาด):**
- ต้องเป็นผู้ใหญ่ไทยวัยกลางคน ดูสุขุม ฉลาด มีประสบการณ์ น่าเชื่อถือ
- ห้าม chibi / ห้ามหัวโตตัวเล็ก / ห้ามตัวเตี้ยแบบเด็ก / ห้าม cute mascot / ห้าม childish cartoon
- ให้เป็น semi-realistic illustration หรือ adult stylized character
- ถ้าต้องย่อส่วนในอินโฟกราฟฟิก ให้ย่อแบบผู้ใหญ่ตัวเล็กลง ห้ามเปลี่ยนเป็นชิบิ
- บุคลิกคือ "ลุงผู้รู้สายเกษตร" ไม่ใช่เด็กการ์ตูน ไม่ใช่มาสคอตตัวเตี้ย

**คำที่ต้องใช้ใน Image Prompt:** adult character proportions, mature Thai male, premium semi-realistic Thai agriculture illustration, not chibi, not childlike, trustworthy agriculture mentor

## 🖼️ Style Reference (สำคัญมาก)

ไฟล์ใน `assets/style-references/` (style-ref-01 ถึง 08) คือภาพตัวอย่างมาตรฐานของเพจ
**ทุกครั้งที่ generate ภาพ ต้องแนบภาพเหล่านี้ (อย่างน้อย 2-3 ภาพ) เป็น visual style reference หลัก**

สิ่งที่ต้องยึดจากภาพตัวอย่าง:
- โทนเขียว / ครีม / น้ำตาลไม้
- กรอบไม้ rustic + พื้นกระดาษ parchment
- กล่องข้อมูลอ่านง่าย หัวข้อใหญ่ชัด
- ป้ายไม้ / ใบไม้ / รวงข้าว / แปลงผัก / ระบบน้ำ
- Layout อินโฟกราฟฟิกแนวตั้ง 4:5
- ป้ายชื่อเพจ "เกษตรอินเทรนด์" ด้านบนภาพ

**ห้ามลอกข้อความหรือเนื้อหาเดิมจากภาพตัวอย่าง** ให้ใช้เฉพาะสไตล์ เลย์เอาต์ โทนสี และภาษาภาพ

## ✅ กฎคุณภาพภาพสุดท้าย (กันงานตกเกรด)

ภาพสุดท้ายของเพจนี้ต้องเป็นงานอินโฟกราฟฟิกภาพประกอบระดับเดียวกับ style reference เท่านั้น ไม่ใช่งานเลย์เอาต์แบน ๆ ที่สร้างจาก HTML/CSS, Canva-like template, หรือกล่องข้อความธรรมดา

**ต้องทำ:**
- Generate ภาพหลักด้วย image generation โดยใช้ style references เป็นตัวคุมเกรดภาพ
- ให้ภาพมีรายละเอียดแบบ reference: แสงเงา, texture ไม้, parchment, ฉากสวน/นา, props เกษตร, illustration icon, และลุง Boss แบบ semi-realistic
- ใช้ไฟล์ที่ generate แล้วเป็น final artwork โดยตรงเป็นหลัก
- ถ้าต้องแก้คำผิด ให้แก้เฉพาะจุดแบบ overlay เล็กน้อย ห้าม re-layout ทั้งภาพ
- ถ้าภาพที่ generate ออกมาไม่ใช่ vertical 4:5 เป๊ะ ให้ถามก่อนว่าจะ crop, regenerate, หรือใช้ภาพต้นฉบับ ห้ามเติมกรอบข้าง/แถบพื้นหลังเอง

**ห้ามทำ:**
- ห้ามสร้างภาพ final ด้วย HTML/CSS, slide layout, SVG layout, หรือ layout engine แทน image generation
- ห้ามเติมกรอบข้าง แถบไม้ แถบเบลอ หรือ padding เพิ่มเพื่อบังคับสัดส่วน เว้นแต่ผู้ใช้สั่งชัดเจน
- ห้าม crop จนเนื้อหา ข้อความ หรือส่วนสำคัญของภาพหาย
- ห้ามลดเกรดภาพให้ดูเรียบ โล่ง แข็ง หรือเหมือน wireframe/template
- ห้ามแทนที่ภาพ generated ที่ผู้ใช้ชอบด้วยภาพ post-processed เวอร์ชันใหม่ โดยไม่ได้ยืนยันก่อน

**เกณฑ์ผ่านก่อนส่ง:**
- เปิดดูไฟล์ final ใน `generated_posts/` แล้วต้องดูใกล้เคียง style reference ภายใน 3 วินาทีแรก
- ไม่มีกรอบ/แถบข้างที่ไม่ได้มาจากงาน generate เดิม
- ลุง Boss ต้องดูเป็นผู้ใหญ่ น่าเชื่อถือ และอยู่ในสไตล์เดียวกับเพจ
- ข้อความหลักต้องอ่านได้ใน thumbnail ของ viewer
- ถ้าเลือกได้ระหว่าง "ภาพสวยตรง reference แต่สัดส่วนไม่เป๊ะ" กับ "ภาพสัดส่วนเป๊ะแต่ต้องเติมกรอบเอง" ให้เลือกภาพสวยตรง reference หรือถามผู้ใช้ก่อน

## 🏭 Image Production Pipeline (บังคับทุกภาพ — แก้ปัญหา 4:5 ให้จบตั้งแต่ generate)

โมเดลสร้างภาพมีขนาด native แค่จัตุรัส / 3:2 / แนวตั้ง 2:3 (1024×1536) — **ไม่มี 4:5** การสั่ง "4:5" ใน prompt คือสาเหตุที่โมเดลวาดกรอบข้าง/แถบปลอม จึงต้องทำตามลำดับนี้ทุกภาพ:

1. **Generate ที่แนวตั้ง 1024×1536 แบบเต็มเฟรม** — ใน prompt ต้องมี: `full-bleed portrait composition, background extends edge-to-edge, no frames, no side bars, no letterboxing, no painted borders` และ `keep all text, boxes, and key elements within the central 4:5 safe area (leave ~10% breathing room at top and bottom)`
2. **Crop กลางเป็น 4:5 ด้วยคำสั่งเครื่อง (แม่นยำ 100%):**
   ```bash
   sips -c 1280 1024 <ไฟล์>.png   # จาก 1024×1536 → 1024×1280 (4:5)
   ```
3. **เปิดตรวจไฟล์หลัง crop:** ป้ายหัวเรื่อง กล่องข้อความ โลโก้ ลุง Boss ต้องครบไม่โดนตัด — ถ้าโดนตัด ให้กลับไป generate ใหม่โดยบีบเนื้อหาเข้า safe area มากขึ้น **ห้ามแก้ด้วยการเติมกรอบ/แถบข้างเด็ดขาด**

## 🔁 กฎกันภาพซ้ำ (Layout Variation — บังคับทุก batch)

ปัญหาที่ห้ามเกิดซ้ำ: ทุกภาพออกมาโครงเดียวกันหมด (ลุง Boss ยืนเต็มตัวขวามือ-ชี้นิ้ว + กล่องเรียงซ้าย)

- **ใน batch เดียวกัน (เช่น 3 โพสต์/วัน) ห้ามซ้ำกันทั้ง 4 มิติ:**
  1. Template (1–5)
  2. ตำแหน่งลุง Boss: ซ้าย / ขวา / ล่างกลาง / โผล่มุมบน / แทรกกลางเนื้อหา
  3. ขนาดลุง Boss: เต็มตัว / ครึ่งตัว / เฉพาะมือ+อุปกรณ์ (ไม่เห็นหน้า)
  4. ฉากหลัง: แปลงผัก / ทุ่งนา / โรงเรือน / ระบบน้ำ / บ้านสวน / กองปุ๋ยหมัก / โต๊ะไม้ close-up
- **ก่อนเริ่ม batch ใหม่ ให้เปิดดูภาพใน `generated_posts/` ของ batch ก่อนหน้า** แล้วเลือก composition ที่ยังไม่เคยใช้
- **Visual Direction ในไฟล์ brief ทุกใบต้องระบุครบ 4 อย่าง:** Template / ตำแหน่ง+ขนาดลุง Boss / ท่าทาง+อุปกรณ์ / ฉากหลัง — เขียนให้ชัดตั้งแต่ชั้น brief เพื่อบังคับความหลากหลายก่อนถึงขั้น generate

## 🎭 คลังท่าทางลุง Boss (ท่าต้องตรงกับเนื้อหา)

**กฎหลัก: ลุง Boss ต้องกำลัง "ทำ" สิ่งที่หัวข้อสอน ไม่ใช่ยืนชี้นิ้วเฉย ๆ**

| ประเภทเนื้อหา | ท่าทาง + อุปกรณ์ |
|---|---|
| ความรู้พื้นฐาน / สอน | ครึ่งตัว ชี้กระดานไม้ หรือกางสมุดบันทึกอธิบาย |
| Checklist / เช็กก่อนทำ | ถือ clipboard กำลังติ๊กรายการ |
| เปรียบเทียบ A vs B | ยืนกลางภาพ กางสองมือชี้ซ้าย-ขวา ทำหน้าชั่งใจ |
| How-to ดิน / ปุ๋ย | นั่งยองจับดิน หรือคนถังปุ๋ยหมัก มือเปื้อนดิน |
| ระบบน้ำ | กำลังต่อท่อ / หมุนวาล์ว / ถือบัวรดน้ำรดจริง |
| โรคพืช / จับอาการ | ถือแว่นขยายส่องใบป่วย คิ้วขมวดครุ่นคิด |
| คำเตือน / ข้อควรระวัง | ชูนิ้วเตือน สีหน้าเอาจริง |

สีหน้าให้หมุนเวียนตามโทนโพสต์: ยิ้มรู้ทัน / จริงจัง / ภูมิใจ / แอบกวนเล็ก ๆ — และใส่คำบรรยายท่า+สีหน้าลงใน Image Prompt ทุกครั้ง (เช่น `ลุง Boss squatting and inspecting soil with one hand, focused expression`)

## 📦 Content Pillars (5 Template)

เมื่อได้หัวข้อ ให้วิเคราะห์แล้วเลือก Template ที่เหมาะที่สุดก่อนเขียน brief เสมอ

### Template 1: เรื่องนี้ต้องรู้
- ใช้กับ: ความรู้พื้นฐาน / สิ่งที่มือใหม่ควรรู้ / ก่อนเริ่มทำ (เช่น มือใหม่ปลูกผัก, ระบบน้ำเบื้องต้น, ดินดีต้องดูอะไร)
- โครงภาพ: หัวใหญ่ + กล่อง 4–6 ข้อ + ลุง Boss สอน + กล่อง "ลุง Boss แนะนำ"
- ตัวอย่าง headline: "มือใหม่ปลูกผัก ต้องรู้ 5 เรื่องนี้"

### Template 2: Checklist / เช็กก่อนทำ
- ใช้กับ: รายการตรวจสอบก่อนลงมือ ก่อนซื้อ ก่อนปลูก ก่อนติดตั้ง (เช่น เช็กก่อนทำแปลงผัก, เช็กก่อนซื้อปั๊มน้ำ)
- โครงภาพ: หัว "เช็กก่อน..." + checklist 6–8 ช่อง + "ต้องมี/ต้องระวัง" + ลุง Boss ถือ clipboard + กล่อง "ลุง Boss เตือน"
- ตัวอย่าง headline: "เช็กก่อนทำแปลงผัก"

### Template 3: เปรียบเทียบ A vs B
- ใช้กับ: เปรียบเทียบ 2 อย่าง / 2 วิธี / 2 ระบบ (เช่น น้ำหยด vs สปริงเกลอร์, ปุ๋ยคอก vs ปุ๋ยหมัก)
- โครงภาพ: หัว "A vs B" + 2 คอลัมน์ + ข้อดี/ข้อควรระวัง/เหมาะกับใคร + กล่อง "ลุง Boss สรุป"
- ตัวอย่าง headline: "ปุ๋ยคอก vs ปุ๋ยหมัก"

### Template 4: How-to / Step by Step
- ใช้กับ: วิธีทำ ขั้นตอน ลำดับการทำจริง (เช่น วิธีทำแปลงผัก, วิธีวางระบบน้ำ, วิธีทำปุ๋ยหมัก)
- โครงภาพ: หัว "วิธี..." หรือ "X ขั้นตอน..." + Step 1–5 หรือ 1–6 + ลูกศรเชื่อม + กล่อง "เคล็ดลับจากลุง Boss"
- ตัวอย่าง headline: "5 ขั้นตอนทำแปลงผักง่าย ๆ"

### Template 5: จับอาการ / แก้ปัญหา
- ใช้กับ: อาการผิดปกติ โรคพืช ปัญหาพืช สาเหตุ วิธีแก้ (เช่น ใบเหลือง, รากเน่า, ผักโตช้า, เพลี้ยลง)
- โครงภาพ: อาการที่เห็น → สาเหตุที่เป็นไปได้ → แนวทางแก้ + ลุง Boss ชี้อาการ + กล่อง "ลุง Boss แนะ"
- ตัวอย่าง headline: "ใบเหลืองแบบนี้ เกิดจากอะไร?"

## 🎨 Style ภาพ

rustic Thai agriculture infographic, wood and parchment board, warm earthy tone, green cream brown palette, illustrated agriculture icons, clean readable Thai typography, premium semi-realistic Thai agriculture illustration, adult character proportions, not chibi, not childlike

**องค์ประกอบประจำ:** ไม้, parchment paper, ใบไม้, รวงข้าว, แปลงผัก, ระบบน้ำ, บัวรดน้ำ, พลั่ว, สมุดบันทึก, ป้ายไม้, บ้านสวน, ทุ่งนา, โรงเรือน, ดิน, ปุ๋ย, ต้นกล้า

## 🧩 ฐาน Image Prompt (ใช้และปรับทุกโพสต์)

> Create a polished full-bleed portrait Thai Facebook infographic (canvas 1024×1536) for the page brand "เกษตรอินเทรนด์". The background must extend edge-to-edge — no frames, no side bars, no letterboxing, no painted borders. Keep all text, boxes, and key elements within the central 4:5 safe area, leaving about 10% breathing room at the top and bottom. Use the attached style reference images (from `assets/style-references/`) as the main visual style reference for the infographic layout, rustic wood frame, parchment panels, green cream brown palette, readable Thai typography, and เกษตรอินเทรนด์ brand mood. Do not copy old text.
>
> Style: rustic Thai agriculture infographic, wood and parchment board, warm earthy tone, green cream brown palette, illustrated agriculture icons, clean readable Thai typography, premium semi-realistic Thai agriculture illustration, adult character proportions, not chibi, not childlike.
>
> Include recurring host "ลุง Boss": Thai middle-aged male agriculture mentor, mature face, salt-and-pepper wavy hair tied low, mustache and goatee, gray patterned Mandarin-collar shirt with frog buttons, cream cropped wide pants, black slip-on shoes, wristwatch, wooden bead bracelet. He must look calm, wise, slightly witty, trustworthy, and experienced. Keep him as an adult mentor, not a cute mascot. **Pose him [ท่าทาง+อุปกรณ์จากคลังท่าทาง ให้ตรงกับเนื้อหาโพสต์นี้] positioned at [ตำแหน่ง/ขนาดจาก Visual Direction]** — vary pose, position, and background scene from the previous posts.
>
> Use agriculture elements such as rice stalks, leaves, vegetable beds, irrigation, watering can, soil, notebook, wooden sign, and home garden atmosphere. Layout must be organized, useful, and easy to read. No watermark. No unrelated logo.

**เช็กลิสต์ที่ทุก Image Prompt ต้องมี:** full-bleed portrait 1024×1536 + central 4:5 safe area (ห้ามมีคำว่า "4:5" เดี่ยว ๆ สั่งสัดส่วน) / no frames, no borders, no letterboxing / brand "เกษตรอินเทรนด์" / style reference images แนบ / rustic wood + parchment / green cream brown palette / readable Thai typography / ลุง Boss (adult, not chibi) + ท่าทางตรงเนื้อหา + ตำแหน่ง-ฉากหลังไม่ซ้ำ batch เดิม / organized content boxes / no watermark — **หลัง generate ต้อง crop เป็น 4:5 ตาม Pipeline ทุกครั้ง**

## ✍️ กฎข้อความบนภาพ

- ข้อความสั้น อ่านง่าย ตัวใหญ่ ไม่แน่นเกินไป
- แต่ละกล่องข้อมูลไม่เกิน 4 bullet, แต่ละ bullet ไม่เกิน 8–10 คำ
- ใช้คำง่าย คนทั่วไปเข้าใจ
- ข้อมูลเกษตรให้ใช้คำว่า "โดยทั่วไป", "ควร", "เหมาะกับ", "อาจช่วย" — ไม่ฟันธงเกินจริง

## 💬 สูตร Caption

ไม่ยาวเหมือนบทความ ไม่อธิบายซ้ำกับภาพมากเกินไป:

1. [Hook จี้ปัญหา 1–2 บรรทัด]
2. [ขยายปัญหาแบบสั้น]
3. [บอกว่าภาพนี้สรุปอะไร]
4. [คำแนะนำจากลุง Boss 1 ประโยค]
5. [CTA: เซฟ / แชร์ / คอมเมนต์]
6. [Hashtags]

**โทน:** เป็นกันเอง สุภาพ อ่านง่าย ใช้ "ครับ" ได้ ใช้ emoji เล็กน้อย เช่น 🌱 👇 📌

## #️⃣ กฎ Hashtags

ใช้ 5–7 ตัวพอ **ต้องมี #เกษตรอินเทรนด์ เสมอ** เลือกเพิ่มตามหัวข้อ:
#มือใหม่ปลูกผัก #ปลูกผักกินเอง #ปลูกผักสวนครัว #แปลงผักหลังบ้าน #บ้านสวน #ระบบน้ำ #ลดต้นทุนเกษตร #โรคพืช #ปุ๋ยหมัก #ปุ๋ยคอก #ลุงBossแนะนำ

## ⚠️ ข้อควรระวัง

- อย่าใส่ข้อมูลแน่นเกินไปในภาพ / อย่าใช้ตัวหนังสือเล็กเกินไป
- อย่าใช้ศัพท์วิชาการหนักเกิน
- อย่าเปลี่ยนคาแรกเตอร์ลุง Boss / อย่าทำลุง Boss เป็น chibi หรือเด็กการ์ตูน
- อย่าลอกข้อความจากภาพ style reference
- ถ้าหัวข้อกว้างเกิน ให้ย่อเป็นมุมเดียวที่ทำอินโฟกราฟฟิกได้
- ถ้าข้อมูลเฉพาะพืชหรือพื้นที่ ให้ระบุว่าเป็นแนวทางเบื้องต้น ควรปรับตามพื้นที่ ดิน น้ำ อากาศ และชนิดพืช

## 🎯 เป้าหมาย

ทุกโพสต์ต้องช่วยให้คนดูนำไปทำตามได้จริง และไฟล์ brief ทุกไฟล์ต้องพร้อมให้ generate ภาพและโพสต์ Facebook ได้ทันที
