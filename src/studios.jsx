import { useState } from "react";
import {
  DRAMA_ASPECT_RATIOS,
  DRAMA_GENRES,
  DRAMA_INTENSITY_LEVELS,
  DRAMA_PLATFORM_OPTIONS,
  DRAMA_SCENE_COUNTS,
  REVIEW_PRESENTER_OPTIONS,
  buildDramaCoverCommand,
  buildDramaEpisodeCommand,
  buildDramaIdeasCommand,
  buildDramaPitchCommand,
  buildDramaScenesFromPitchCommand,
  buildReviewEpisodeCommand,
  dramaBeats,
  reviewShotCount,
} from "./builders.js";
import {
  CopyButton,
} from "./components.jsx";
import { apiRequest } from "./api.js";
import { STYLE_OPTIONS } from "./style-presets.js";

// จำสไตล์ภาพที่เลือกลง project.config.json (fire-and-forget) — โปรเจกต์นี้จะใช้ค่านี้ครั้งต่อไป
function saveProjectStyle(page, style) {
  apiRequest(`/api/pages/${page.pageSlug}/projects/${page.projectSlug}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageStyle: style }),
  }).catch(() => {});
}

// dropdown เลือกสไตล์ภาพ (ใช้ร่วมทั้ง Drama/Review studio)
function StyleSelect({ value, onChange }) {
  const selected = STYLE_OPTIONS.find((option) => option.id === value);
  return (
    <label className="field">
      <span className="field-label">🎨 สไตล์ภาพ</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {STYLE_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {selected?.hint ? <p className="helper-copy">{selected.hint}</p> : null}
    </label>
  );
}

// dropdown เลือกแพลตฟอร์ม/โมเดล (ใช้ร่วมทั้ง Drama/Review studio)
function PlatformSelect({ label, value, onChange, helper }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {Object.entries(DRAMA_PLATFORM_OPTIONS).map(([key, option]) => (
          <option key={key} value={key}>
            {option.label} — {option.detail}
          </option>
        ))}
      </select>
      {helper ? <p className="helper-copy">{helper}</p> : null}
    </label>
  );
}

function ReviewStudioModal({ page, onClose }) {
  const [productName, setProductName] = useState("");
  const [productSlug, setProductSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [platform, setPlatform] = useState(
    DRAMA_PLATFORM_OPTIONS[page.platform] ? page.platform : "flow-omni-10s"
  );
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [presenterMode, setPresenterMode] = useState("hands");
  const [presenterName, setPresenterName] = useState("");
  const [sellingPoints, setSellingPoints] = useState("");
  const [style, setStyle] = useState(page.imageStyle || "");
  const [commands, setCommands] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  const nextDay = Math.max(0, ...page.days.map((day) => day.day)) + 1;
  const platformInfo = DRAMA_PLATFORM_OPTIONS[platform];
  const shotCount = reviewShotCount(platformInfo.seconds);

  function suggestProductSlug(name) {
    const ascii = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return ascii || `product-${nextDay}`;
  }

  function handleProductNameChange(value) {
    setProductName(value);
    if (!slugTouched) {
      setProductSlug(suggestProductSlug(value));
    }
  }

  function handleGenerate() {
    setErrorMessage("");

    const name = productName.trim();
    if (!name) {
      setCommands([]);
      setErrorMessage("ใส่ชื่อสินค้าก่อน");
      return;
    }
    const slug = (productSlug.trim() || suggestProductSlug(name)).toLowerCase();
    if (presenterMode === "openClose" && !presenterName.trim()) {
      setCommands([]);
      setErrorMessage("โหมดเปิด+ปิด ต้องใส่ชื่อพรีเซนเตอร์ (จะให้ Codex สร้างใหม่ก็ตั้งชื่อมาเลย)");
      return;
    }

    saveProjectStyle(page, style);
    setCommands([
      {
        title: `วิธีใช้: คัดลอกคำสั่งนี้ไปวางใน Codex แล้ว "แนบรูปสินค้าจริง 1–5 รูป" ไปกับข้อความได้เลย (Codex จะเซฟลงโฟลเดอร์ products/${slug}/ ให้เอง) — หรือจะวางไฟล์ในโฟลเดอร์นั้นเองก่อนก็ได้`,
        text: buildReviewEpisodeCommand({
          page,
          platform,
          aspectRatio,
          productName: name,
          productSlug: slug,
          presenterMode,
          presenterName: presenterName.trim(),
          sellingPoints: sellingPoints.trim(),
          nextDay,
          imageStyle: style,
        }),
      },
    ]);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel content-modal"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="modal-header">
          <div>
            <p className="modal-kicker">🛍️ Review Studio</p>
            <h2>สร้างรีวิวที่ {nextDay}: {page.shortName}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close review studio">
            ✕
          </button>
        </div>

        <label className="field">
          <span>1. ชื่อสินค้า</span>
          <input
            type="text"
            value={productName}
            onChange={(event) => handleProductNameChange(event.target.value)}
            placeholder="เช่น ถังเก็บข้าวสารมินิมอล 10 กก."
          />
        </label>

        <label className="field">
          <span>ชื่อโฟลเดอร์สินค้า (product-slug ภาษาอังกฤษ) — แนบรูปไปกับคำสั่งใน Codex ได้เลย เดี๋ยว Codex เซฟลง products/&lt;slug&gt;/ ให้เอง (หรือวางไฟล์เองก็ได้)</span>
          <input
            type="text"
            value={productSlug}
            onChange={(event) => {
              setSlugTouched(true);
              setProductSlug(event.target.value);
            }}
            placeholder="rice-dispenser"
          />
        </label>

        <PlatformSelect
          label="2. แพลตฟอร์ม (กำหนดความยาว + จำนวนช็อต)"
          value={platform}
          onChange={setPlatform}
          helper={`${platformInfo.seconds} วินาที = ${shotCount} ช็อต (เปิดตัวสินค้า → จุดขายทีละข้อ → ปิด lifestyle)`}
        />

        <div className="field">
          <span className="field-label">3. สัดส่วนวิดีโอ (aspect ratio)</span>
          <div className="choice-chips">
            {Object.entries(DRAMA_ASPECT_RATIOS).map(([key, option]) => (
              <button
                key={key}
                className={`choice-chip compact ${aspectRatio === key ? "active" : ""}`}
                type="button"
                onClick={() => setAspectRatio(key)}
              >
                {key} {option.label}
                <span>{option.detail}</span>
              </button>
            ))}
          </div>
        </div>

        <StyleSelect value={style} onChange={setStyle} />

        <div className="field">
          <span className="field-label">4. พรีเซนเตอร์</span>
          <div className="choice-chips">
            {REVIEW_PRESENTER_OPTIONS.map((option) => (
              <button
                key={option.key}
                className={`choice-chip ${presenterMode === option.key ? "active" : ""}`}
                type="button"
                onClick={() => setPresenterMode(option.key)}
              >
                {option.label}
                <span>{option.detail}</span>
              </button>
            ))}
          </div>
          {presenterMode === "openClose" ? (
            <label className="field">
              <span>ชื่อพรีเซนเตอร์ (ต้องมีใน characters.md ของเพจ — ถ้ายังไม่มี Codex จะสร้างให้ตามชื่อนี้)</span>
              <input
                type="text"
                value={presenterName}
                onChange={(event) => setPresenterName(event.target.value)}
                placeholder="เช่น มินท์"
              />
            </label>
          ) : null}
        </div>

        <label className="field">
          <span>5. จุดขาย/ข้อมูลสินค้า (optional — ราคา สเปก จุดที่อยากเน้น ถ้าเว้นว่าง Codex วิเคราะห์จากรูปอย่างเดียว)</span>
          <textarea
            rows={3}
            value={sellingPoints}
            onChange={(event) => setSellingPoints(event.target.value)}
            placeholder="เช่น ความจุ 10 กก. ฝาสูญญากาศกันมอด ราคา 590 บาท เน้นความมินิมอลเข้ากับครัวโทนขาว"
          />
        </label>

        {errorMessage ? <p className="message error">{errorMessage}</p> : null}

        <div className="modal-actions">
          <button className="button subtle" type="button" onClick={onClose}>
            ปิด
          </button>
          <button className="button primary" type="button" onClick={handleGenerate}>
            สร้างคำสั่ง Codex
          </button>
        </div>

        {commands.map((entry) => (
          <div className="command-box" key={entry.title}>
            <div className="command-box-header">
              <strong>{entry.title}</strong>
              <CopyButton text={entry.text} label="คัดลอกคำสั่ง" className="primary" />
            </div>
            <textarea className="command-text" value={entry.text} readOnly rows={14} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DramaStudioModal({ page, onClose }) {
  const [mode, setMode] = useState("episode");
  const [workflow, setWorkflow] = useState("single");
  const [platform, setPlatform] = useState(
    DRAMA_PLATFORM_OPTIONS[page.platform] ? page.platform : "flow-omni-8s"
  );
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [genre, setGenre] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [sceneCount, setSceneCount] = useState(8);
  const [intensityIndex, setIntensityIndex] = useState(3);
  const [style, setStyle] = useState(page.imageStyle || "");
  const [commands, setCommands] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  const nextDay = Math.max(0, ...page.days.map((day) => day.day)) + 1;
  const beats = dramaBeats(sceneCount);

  function handleGenerate() {
    setErrorMessage("");
    saveProjectStyle(page, style);

    if (mode === "ideas") {
      setCommands([
        {
          title: "คำสั่งพร้อมใช้ — เปิด Codex ในโฟลเดอร์โปรเจกต์แล้ววางได้เลย",
          text: buildDramaIdeasCommand({ page, genre }),
        },
      ]);
      return;
    }

    const topicLine = customTopic.trim()
      ? `${customTopic.trim()}${genre ? ` (แนว: ${genre})` : ""}`
      : genre
        ? `ให้ Codex คิดเรื่องใหม่ที่ไม่ซ้ำเดิม แนว "${genre}"`
        : "";

    if (!topicLine) {
      setCommands([]);
      setErrorMessage("เลือกธีมเรื่อง หรือพิมพ์หัวข้อเองอย่างน้อย 1 อย่างก่อน");
      return;
    }

    const coverCommand = {
      title: `เผื่อใช้ทีหลัง: คำสั่งสร้างปกเรื่องที่ ${nextDay} อย่างเดียว (คำสั่งหลัก gen ปกให้อยู่แล้ว — ใช้อันนี้ตอนอยาก gen ปกใหม่)`,
      text: buildDramaCoverCommand({ page, dayNumber: nextDay, title: "", imageStyle: style }),
    };

    if (workflow === "twoStep") {
      setCommands([
        {
          title: `จังหวะที่ 1 — เสนอเรื่องย่อ + ตัวละคร (ได้ไฟล์ day${nextDay}-pitch.md มาตรวจก่อน)`,
          text: buildDramaPitchCommand({ page, topicLine, sceneCount, intensityIndex, nextDay }),
        },
        {
          title: `จังหวะที่ 2 — เขียนบทเต็ม (รันหลังอ่าน/แก้ day${nextDay}-pitch.md จนพอใจแล้วเท่านั้น)`,
          text: buildDramaScenesFromPitchCommand({ page, platform, aspectRatio, sceneCount, intensityIndex, nextDay, imageStyle: style }),
        },
        coverCommand,
      ]);
      return;
    }

    setCommands([
      {
        title: "คำสั่งพร้อมใช้ — เปิด Codex ในโฟลเดอร์โปรเจกต์แล้ววางได้เลย",
        text: buildDramaEpisodeCommand({ page, platform, aspectRatio, topicLine, sceneCount, intensityIndex, nextDay, imageStyle: style }),
      },
      coverCommand,
    ]);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel content-modal"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="modal-header">
          <div>
            <p className="modal-kicker">🎬 Drama Studio</p>
            <h2>สร้างเรื่องใหม่: {page.shortName}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close drama studio">
            ✕
          </button>
        </div>

        <div className="field">
          <span className="field-label">โหมด</span>
          <div className="choice-chips">
            <button
              className={`choice-chip ${mode === "episode" ? "active" : ""}`}
              type="button"
              onClick={() => setMode("episode")}
            >
              สร้างเรื่องใหม่
              <span>ได้บทครบทุกฉาก + ตัวละคร + สตอรี่บอร์ด prompt</span>
            </button>
            <button
              className={`choice-chip ${mode === "ideas" ? "active" : ""}`}
              type="button"
              onClick={() => setMode("ideas")}
            >
              สุ่ม 30 เรื่องเข้าคลัง
              <span>เก็บไอเดียไว้ใน story-ideas.md</span>
            </button>
          </div>
        </div>

        {mode === "episode" ? (
          <div className="field">
            <span className="field-label">ขั้นตอนการทำงาน</span>
            <div className="choice-chips">
              <button
                className={`choice-chip ${workflow === "single" ? "active" : ""}`}
                type="button"
                onClick={() => setWorkflow("single")}
              >
                รวดเดียวจบ
                <span>คำสั่งเดียว ได้บทครบทุกฉากทันที</span>
              </button>
              <button
                className={`choice-chip ${workflow === "twoStep" ? "active" : ""}`}
                type="button"
                onClick={() => setWorkflow("twoStep")}
              >
                2 จังหวะ (เสนอเรื่องก่อน)
                <span>ตรวจเรื่องย่อ + ตัวละครก่อน ค่อยเขียนบทเต็ม</span>
              </button>
            </div>
          </div>
        ) : null}

        {mode === "episode" ? (
          <PlatformSelect label="1. แพลตฟอร์ม" value={platform} onChange={setPlatform} />
        ) : null}

        {mode === "episode" ? (
          <div className="field">
            <span className="field-label">2. สัดส่วนวิดีโอ (aspect ratio)</span>
            <div className="choice-chips">
              {Object.entries(DRAMA_ASPECT_RATIOS).map(([key, option]) => (
                <button
                  key={key}
                  className={`choice-chip compact ${aspectRatio === key ? "active" : ""}`}
                  type="button"
                  onClick={() => setAspectRatio(key)}
                >
                  {key} {option.label}
                  <span>{option.detail}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {mode !== "ideas" ? <StyleSelect value={style} onChange={setStyle} /> : null}

        <div className="field">
          <span className="field-label">
            {mode === "episode"
              ? "3. ธีมเรื่อง — เลือกเพื่อเริ่มเร็ว หรือพิมพ์เองด้านล่าง (เว้นว่าง = ให้ Codex คิด)"
              : "ธีมเรื่อง (ไม่เลือก = คละแนว)"}
          </span>
          <div className="genre-chips">
            {DRAMA_GENRES.map((entry) => (
              <button
                key={entry}
                className={`genre-chip ${genre === entry ? "active" : ""}`}
                type="button"
                onClick={() => setGenre((current) => (current === entry ? "" : entry))}
              >
                {entry}
              </button>
            ))}
          </div>
        </div>

        {mode === "episode" ? (
          <>
            <label className="field">
              <span>หัวข้อกำหนดเอง (พิมพ์เรื่องที่อยากได้เอง — เว้นว่างเพื่อให้ Codex คิดจากธีมที่เลือก)</span>
              <input
                type="text"
                value={customTopic}
                onChange={(event) => setCustomTopic(event.target.value)}
                placeholder="เช่น แม่บ้านถูกใส่ร้ายว่าขโมยแหวน แต่เจ้าของตัวจริงเห็นทุกอย่าง"
              />
            </label>

            <div className="field">
              <span className="field-label">4. จำนวนฉาก</span>
              <div className="choice-chips">
                {DRAMA_SCENE_COUNTS.map((count) => (
                  <button
                    key={count}
                    className={`choice-chip compact ${sceneCount === count ? "active" : ""}`}
                    type="button"
                    onClick={() => setSceneCount(count)}
                  >
                    {count} ฉาก
                    <span>~{count * DRAMA_PLATFORM_OPTIONS[platform].seconds} วินาที</span>
                  </button>
                ))}
              </div>
              <ol className="beat-list">
                {beats.map((beat, index) => (
                  <li key={`${sceneCount}-${index}`}>{beat}</li>
                ))}
              </ol>
            </div>

            <div className="field">
              <span className="field-label">5. ระดับความแรงดราม่า</span>
              <div className="choice-chips">
                {DRAMA_INTENSITY_LEVELS.map((label, index) => (
                  <button
                    key={label}
                    className={`choice-chip compact ${intensityIndex === index ? "active" : ""}`}
                    type="button"
                    onClick={() => setIntensityIndex(index)}
                  >
                    ระดับ {index + 1}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {errorMessage ? <p className="message error">{errorMessage}</p> : null}

        <div className="modal-actions">
          <button className="button subtle" type="button" onClick={onClose}>
            ปิด
          </button>
          <button className="button primary" type="button" onClick={handleGenerate}>
            สร้างคำสั่ง Codex
          </button>
        </div>

        {commands.map((entry) => (
          <div className="command-box" key={entry.title}>
            <div className="command-box-header">
              <strong>{entry.title}</strong>
              <CopyButton text={entry.text} label="คัดลอกคำสั่ง" className="primary" />
            </div>
            <textarea
              className="command-text"
              value={entry.text}
              readOnly
              rows={commands.length > 1 ? 10 : 14}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export {
  ReviewStudioModal,
  DramaStudioModal,
};
