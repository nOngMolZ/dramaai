import { useState, useEffect } from "react";
import {
  SLUG_INPUT_PATTERN,
  UPLOAD_IMAGE_TYPES,
  apiRequest,
  uploadAssetFile,
} from "./api.js";
import {
  buildSceneVideoPack,
  charactersDocModules,
  getCharacterImage,
  getShotImagePath,
  parseCharacters,
  parseDramaScene,
} from "./content.js";
import { shotGenFor, storyLabels } from "./formats.js";

function SettingsModal({
  isOpen,
  page,
  draftSettings,
  isSaving,
  errorMessage,
  onChange,
  onClose,
  onSave,
}) {
  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="modal-header">
          <div>
            <p className="modal-kicker">Facebook Graph API</p>
            <h2>ตั้งค่าการเชื่อมเพจ: {page?.shortName || page?.name || ""}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close settings">
            ✕
          </button>
        </div>

        <p className="modal-copy">
          การตั้งค่านี้ใช้กับเพจ <strong>{page?.name}</strong> เท่านั้น แต่ละเพจเก็บ token
          แยกกัน ใส่ Page Access Token เพื่อโพสต์จากหน้า viewer นี้ได้โดยตรง ถ้าไม่ใส่ Page ID
          ระบบจะลองอ่านจาก token ให้เอง
        </p>

        <section className="guide-panel">
          <div className="guide-panel-header">
            <div>
              <p className="modal-kicker">Guide</p>
              <h3>คู่มือสร้าง Facebook Page Access Token</h3>
            </div>
            <button
              className="button subtle"
              type="button"
              onClick={() => setShowGuide((current) => !current)}
            >
              {showGuide ? "ซ่อนคู่มือ" : "แสดงคู่มือ"}
            </button>
          </div>

          {showGuide ? (
            <div className="guide-panel-body">
              <ol className="guide-list">
                <li>เข้า `Meta for Developers` แล้วเปิด `Graph API Explorer`</li>
                <li>เลือก App ของคุณจาก dropdown ด้านบน</li>
                <li>กด `Get Token` แล้วเลือก `Get User Access Token`</li>
                <li>
                  เลือกสิทธิ์ที่จำเป็นอย่างน้อย:
                  `pages_manage_posts`, `pages_show_list`, `pages_read_engagement`
                </li>
                <li>ล็อกอิน Facebook ด้วยบัญชีที่เป็น admin ของเพจ</li>
                <li>ใช้ user token ที่ได้ เรียกดูเพจที่คุณดูแล หรือเลือก page token ใน Explorer</li>
                <li>คัดลอก `Page Access Token` ของเพจที่ต้องการ แล้วนำมาแปะในช่องด้านล่าง</li>
                <li>ถ้าระบบหา `Page ID` ไม่ได้ ให้คัดลอก Page ID มาใส่เอง</li>
              </ol>

              <p className="helper-copy">
                หมายเหตุ: สิทธิ์ที่ต้องใช้จริงอาจต่างกันเล็กน้อยตามประเภทแอปหรือ Business setup
                ของบัญชีคุณ แต่สำหรับการโพสต์เพจ ปกติจะเริ่มจาก `pages_manage_posts`
                และสิทธิ์สำหรับมองเห็นเพจที่ตัวเองดูแล
              </p>

              <div className="guide-links">
                <a
                  className="button"
                  href="https://developers.facebook.com/tools/explorer/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Graph API Explorer
                </a>
                <a
                  className="button"
                  href="https://developers.facebook.com/docs/facebook-login/guides/access-tokens/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Access Token Docs
                </a>
              </div>
            </div>
          ) : null}
        </section>

        <label className="field">
          <span>Facebook API Version</span>
          <input
            type="text"
            value={draftSettings.apiVersion}
            onChange={(event) => onChange("apiVersion", event.target.value)}
            placeholder="v23.0"
          />
        </label>

        <label className="field">
          <span>Facebook Page Access Token</span>
          <div className="token-field">
            <textarea
              rows="5"
              value={draftSettings.accessToken}
              onChange={(event) => onChange("accessToken", event.target.value)}
              placeholder="EAAG..."
              className={showToken ? "" : "masked-token"}
            />
            <button
              className="button subtle token-toggle"
              type="button"
              onClick={() => setShowToken((current) => !current)}
            >
              {showToken ? "ซ่อน Token" : "แสดง Token"}
            </button>
          </div>
        </label>

        <label className="field">
          <span>Facebook Page ID (optional if token can resolve it)</span>
          <input
            type="text"
            value={draftSettings.pageId}
            onChange={(event) => onChange("pageId", event.target.value)}
            placeholder="1234567890"
          />
        </label>

        <label className="field">
          <span>Facebook Page Name (optional)</span>
          <input
            type="text"
            value={draftSettings.pageName}
            onChange={(event) => onChange("pageName", event.target.value)}
            placeholder="My Facebook Page"
          />
        </label>

        {errorMessage ? <p className="message error">{errorMessage}</p> : null}

        <div className="modal-actions">
          <button className="button subtle" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="button" onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScheduleModal({
  isOpen,
  post,
  scheduledAt,
  isScheduling,
  errorMessage,
  onChange,
  onClose,
  onConfirm,
}) {
  if (!isOpen || !post) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="modal-header">
          <div>
            <p className="modal-kicker">Schedule Facebook Post</p>
            <h2>ตั้งเวลาเผยแพร่โพสต์</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close schedule modal">
            ✕
          </button>
        </div>

        <p className="modal-copy">
          ระบบจะส่งโพสต์ไปที่ Facebook Page ทันที แต่ตั้งค่าให้เผยแพร่ภายหลังสำหรับ
          <strong> {post.title}</strong>
        </p>

        <label className="field">
          <span>วันและเวลาเผยแพร่</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>

        <p className="helper-copy">
          แนะนำให้ตั้งเวลาอย่างน้อยประมาณ 10 นาทีล่วงหน้า เพื่อเลี่ยง error เรื่อง
          `scheduled_publish_time`
        </p>

        {errorMessage ? <p className="message error">{errorMessage}</p> : null}

        <div className="modal-actions">
          <button className="button subtle" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button publish" type="button" onClick={onConfirm} disabled={isScheduling}>
            {isScheduling ? "Scheduling..." : "ยืนยันการตั้งเวลา"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContentModal({ post, publishState, onClose, onPublish, onSchedule, onEditBrief }) {
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  useEffect(() => {
    setIsImageZoomed(false);
  }, [post]);

  if (!post) {
    return null;
  }

  const postPublishState = publishState?.[post.id];
  const isPublished = postPublishState?.persistedState === "published";

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
            <p className="modal-kicker">{post.id}</p>
            <h2>{post.title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close content modal">
            ✕
          </button>
        </div>

        <div className="content-modal-grid">
          <div className="content-modal-media">
            {post.imageHref ? (
              <img
                src={post.imageHref}
                alt={post.title}
                className="zoomable"
                onClick={() => setIsImageZoomed(true)}
              />
            ) : (
              <div className="post-placeholder">
                ยังไม่มีภาพ
                <code>
                  pages/{post.pageSlug}/projects/{post.projectSlug}/generated_posts/day{post.day}/day{post.day}-content-{post.contentNumber}.png
                </code>
              </div>
            )}
          </div>

          <div className="content-modal-body">
            <span className="post-type">{post.type}</span>
            <p className="post-summary">{post.summary || "No summary available."}</p>
            <p className="post-caption">
              {post.caption || "ยังไม่มี Caption + Hashtags ในไฟล์นี้"}
            </p>

            {postPublishState ? (
              <p className={`message ${postPublishState.type}`}>{postPublishState.message}</p>
            ) : null}

            <div className="post-actions">
              <button className="button primary" type="button" onClick={() => onEditBrief(post)}>
                แก้ไข Brief
              </button>
              {post.imageHref ? (
                <button className="button" type="button" onClick={() => setIsImageZoomed(true)}>
                  ดูภาพเต็ม
                </button>
              ) : null}
              {!isPublished ? (
                <>
                  <button
                    className="button publish"
                    type="button"
                    onClick={() => onPublish(post)}
                    disabled={postPublishState?.type === "loading"}
                  >
                    {postPublishState?.type === "loading" ? "Posting..." : "โพสต์"}
                  </button>
                  <button
                    className="button subtle"
                    type="button"
                    onClick={() => onSchedule(post)}
                    disabled={postPublishState?.type === "loading"}
                  >
                    ตั้งเวลาโพสต์
                  </button>
                </>
              ) : null}
              {postPublishState?.type === "success" && postPublishState?.link ? (
                <a className="button" href={postPublishState.link} target="_blank" rel="noreferrer">
                  เปิดโพสต์
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {isImageZoomed && post.imageHref ? (
          <div
            className="lightbox-backdrop"
            onClick={(event) => {
              event.stopPropagation();
              setIsImageZoomed(false);
            }}
          >
            <img src={post.imageHref} alt={post.title} />
            <button
              className="icon-button lightbox-close"
              type="button"
              aria-label="Close image preview"
            >
              ✕
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}


function AssetPicker({ label, hint, multiple, statusLabel, hasFile, onFiles }) {
  const [isOver, setIsOver] = useState(false);

  function acceptFiles(fileList) {
    const files = [...fileList].filter((file) => UPLOAD_IMAGE_TYPES.includes(file.type));
    if (!files.length) {
      return;
    }
    onFiles(multiple ? files : [files[0]]);
  }

  return (
    <label
      className={`asset-picker ${isOver ? "drop-active" : ""} ${hasFile ? "has-file" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsOver(false);
        acceptFiles(event.dataTransfer?.files || []);
      }}
    >
      <strong>{label}</strong>
      <span>{statusLabel || hint}</span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple={multiple}
        onChange={(event) => {
          acceptFiles(event.target.files || []);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function PageFormModal({ mode, page, pages, onClose }) {
  const isCreate = mode === "create";
  const [draft, setDraft] = useState(() =>
    isCreate
      ? { name: "", slug: "", shortName: "", description: "" }
      : {
          name: page.name,
          slug: page.slug,
          shortName: page.shortName,
          description: page.description,
        }
  );
  const [slugTouched, setSlugTouched] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // เพจ (แบรนด์) ไม่มี format แล้ว — เลือก format ตอนสร้างโปรเจกต์ ป้าย asset ใช้คำกลาง
  const isDrama = false;
  const [pendingAssets, setPendingAssets] = useState({
    logo: null,
    "character-sheet": null,
    "style-reference": [],
    "cover-reference": [],
  });
  const [uploadedKinds, setUploadedKinds] = useState([]);

  async function handleAssetFiles(kind, files) {
    if (isCreate) {
      setPendingAssets((current) =>
        kind === "style-reference" || kind === "cover-reference"
          ? { ...current, [kind]: [...current[kind], ...files] }
          : { ...current, [kind]: files[0] }
      );
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    try {
      for (const file of files) {
        await uploadAssetFile(page.slug, kind, file);
      }
      setUploadedKinds((current) => [...current, kind]);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsBusy(false);
    }
  }

  function handleClose() {
    if (uploadedKinds.length) {
      window.location.reload();
      return;
    }
    onClose();
  }

  function suggestSlug(name) {
    const ascii = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return ascii || `page-${pages.length + 1}`;
  }

  function handleNameChange(value) {
    setDraft((current) => ({
      ...current,
      name: value,
      slug: isCreate && !slugTouched ? suggestSlug(value) : current.slug,
    }));
  }

  async function handleSubmit() {
    const name = draft.name.trim();
    if (!name) {
      setErrorMessage("กรุณาใส่ชื่อเพจก่อน");
      return;
    }

    if (isCreate && !SLUG_INPUT_PATTERN.test(draft.slug.trim())) {
      setErrorMessage("slug ต้องเป็นตัวอักษร a-z, 0-9 หรือ - และขึ้นต้นด้วยตัวอักษรหรือตัวเลข");
      return;
    }

    setIsBusy(true);
    setErrorMessage("");

    try {
      if (isCreate) {
        const slug = draft.slug.trim();
        await apiRequest("/api/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            slug,
            shortName: draft.shortName.trim(),
            description: draft.description.trim(),
          }),
        });

        const queuedUploads = [
          ...(pendingAssets.logo ? [["logo", pendingAssets.logo]] : []),
          ...(pendingAssets["character-sheet"]
            ? [["character-sheet", pendingAssets["character-sheet"]]]
            : []),
          ...pendingAssets["style-reference"].map((file) => ["style-reference", file]),
          ...pendingAssets["cover-reference"].map((file) => ["cover-reference", file]),
        ];
        for (const [kind, file] of queuedUploads) {
          await uploadAssetFile(slug, kind, file);
        }

        window.location.href = `/?page=${slug}`;
      } else {
        await apiRequest(`/api/pages/${page.slug}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            shortName: draft.shortName.trim() || name,
            description: draft.description.trim(),
          }),
        });
        window.location.reload();
      }
    } catch (error) {
      setErrorMessage(error.message);
      setIsBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-panel"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="modal-header">
          <div>
            <p className="modal-kicker">Page Manager</p>
            <h2>{isCreate ? "สร้างเพจใหม่" : `แก้ไขเพจ: ${page.name}`}</h2>
          </div>
          <button className="icon-button" type="button" onClick={handleClose} aria-label="Close page form">
            ✕
          </button>
        </div>

        {isCreate ? (
          <p className="modal-hint">
            สร้าง “เพจ” (แบรนด์) — ตั้งชื่อ/โลโก้/สไตล์ ใช้ร่วมทุกงาน · เลือกประเภทงาน
            (อินโฟ/ละคร/รีวิว) ตอนเพิ่มโปรเจกต์ในเพจ
          </p>
        ) : null}

        <label className="field">
          <span>ชื่อเพจ</span>
          <input
            type="text"
            value={draft.name}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="เช่น คริปโตแมวส้ม"
          />
        </label>

        {isCreate ? (
          <label className="field">
            <span>Slug (ชื่อโฟลเดอร์ ภาษาอังกฤษ)</span>
            <input
              type="text"
              value={draft.slug}
              onChange={(event) => {
                setSlugTouched(true);
                setDraft((current) => ({ ...current, slug: event.target.value }));
              }}
              placeholder="crypto-cat"
            />
          </label>
        ) : null}

        <label className="field">
          <span>ชื่อสั้น (แสดงบนแท็บ, optional)</span>
          <input
            type="text"
            value={draft.shortName}
            onChange={(event) =>
              setDraft((current) => ({ ...current, shortName: event.target.value }))
            }
            placeholder={draft.name || "ชื่อสั้น"}
          />
        </label>

        <label className="field">
          <span>คำอธิบายเพจ (optional)</span>
          <input
            type="text"
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="แนวคอนเทนต์ของเพจนี้"
          />
        </label>

        <section className="asset-section">
          <p className="modal-kicker">Brand Assets — ลากรูปมาวาง หรือคลิกเพื่อเลือกไฟล์</p>

          <AssetPicker
            label="โลโก้เพจ (logo)"
            hint={
              isDrama
                ? "ใช้บนการ์ดแดชบอร์ด และปั๊มมุมคลิปตอนตัดต่อ"
                : "ใช้บนการ์ดแดชบอร์ดและเป็น branding ในภาพโพสต์"
            }
            hasFile={isCreate ? Boolean(pendingAssets.logo) : Boolean(page?.logoHref)}
            statusLabel={
              isCreate
                ? pendingAssets.logo
                  ? `รออัพโหลด: ${pendingAssets.logo.name}`
                  : ""
                : uploadedKinds.includes("logo")
                  ? "อัพโหลดแล้ว ✓"
                  : page?.logoHref
                    ? "มีแล้ว — วางไฟล์ใหม่เพื่อแทนที่"
                    : ""
            }
            onFiles={(files) => handleAssetFiles("logo", files)}
          />

          <AssetPicker
            label={
              isDrama
                ? "แม่แบบภาพต้นแบบตัวละคร (Portrait Style Guide)"
                : "Character Sheet (มาสคอต/ตัวละครประจำเพจ)"
            }
            hint={
              isDrama
                ? "ภาพ portrait 9:16 ตัวอย่าง 1 ใบ ล็อกระยะ/แสงสตูดิโอ/ฉากหลัง — แนบทุกครั้งที่ gen ภาพต้นแบบตัวละครใหม่ ให้ทุกตัวเหมือนถ่ายสตูดิโอเดียวกัน"
                : "ช่วยให้หน้าตาตัวละครคงที่ทุกโพสต์ (ถ้ามี)"
            }
            hasFile={
              isCreate
                ? Boolean(pendingAssets["character-sheet"])
                : Boolean(page?.characterSheetHref)
            }
            statusLabel={
              isCreate
                ? pendingAssets["character-sheet"]
                  ? `รออัพโหลด: ${pendingAssets["character-sheet"].name}`
                  : ""
                : uploadedKinds.includes("character-sheet")
                  ? "อัพโหลดแล้ว ✓"
                  : page?.characterSheetHref
                    ? "มีแล้ว — วางไฟล์ใหม่เพื่อแทนที่"
                    : ""
            }
            onFiles={(files) => handleAssetFiles("character-sheet", files)}
          />

          <AssetPicker
            label={
              isDrama
                ? "โทนหนัง / Film Tone Refs (เลือกได้หลายไฟล์)"
                : "Style References (เลือกได้หลายไฟล์)"
            }
            hint={
              isDrama
                ? "ภาพตัวอย่างโทนสี/แสงแบบหนังของเพจ — แนบตอน gen ภาพช็อตทุกภาพ (layout ชีทเป็นหน้าที่ของ compose-sheet ไม่ต้องมีภาพตัวอย่างชีท)"
                : "ภาพตัวอย่างสไตล์ของเพจ ให้ AI ใช้อ้างอิงตอนสร้างภาพ"
            }
            multiple
            hasFile={
              isCreate ? pendingAssets["style-reference"].length > 0 : (page?.styleRefCount || 0) > 0
            }
            statusLabel={
              isCreate
                ? pendingAssets["style-reference"].length
                  ? `รออัพโหลด ${pendingAssets["style-reference"].length} ไฟล์`
                  : ""
                : uploadedKinds.includes("style-reference")
                  ? "อัพโหลดแล้ว ✓ — วางเพิ่มได้อีก"
                  : page?.styleRefCount
                    ? `มีแล้ว ${page.styleRefCount} ไฟล์ — วางเพิ่มได้`
                    : ""
            }
            onFiles={(files) => handleAssetFiles("style-reference", files)}
          />

          <AssetPicker
            label="โปสเตอร์ตัวอย่าง (Cover References, เลือกได้หลายไฟล์)"
            hint="ตัวอย่างโปสเตอร์หนัง/ละครที่ชอบ — ใช้ตอน gen ภาพปกเรื่องของโปรเจกต์ละคร (ดู layout/โทน ไม่ลอกเนื้อหา)"
            multiple
            hasFile={
              isCreate
                ? pendingAssets["cover-reference"].length > 0
                : (page?.coverRefCount || 0) > 0
            }
            statusLabel={
              isCreate
                ? pendingAssets["cover-reference"].length
                  ? `รออัพโหลด ${pendingAssets["cover-reference"].length} ไฟล์`
                  : ""
                : uploadedKinds.includes("cover-reference")
                  ? "อัพโหลดแล้ว ✓ — วางเพิ่มได้อีก"
                  : page?.coverRefCount
                    ? `มีแล้ว ${page.coverRefCount} ไฟล์ — วางเพิ่มได้`
                    : ""
            }
            onFiles={(files) => handleAssetFiles("cover-reference", files)}
          />
        </section>

        {errorMessage ? <p className="message error">{errorMessage}</p> : null}

        <div className="modal-actions">
          <button className="button subtle" type="button" onClick={handleClose}>
            {uploadedKinds.length ? "ปิด (รีเฟรชหน้า)" : "Cancel"}
          </button>
          <button className="button primary" type="button" onClick={handleSubmit} disabled={isBusy}>
            {isBusy ? (isCreate ? "กำลังสร้าง..." : "กำลังบันทึก...") : isCreate ? "สร้างเพจ" : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDeletedAt(deletedAt) {
  if (!deletedAt) {
    return "ไม่ทราบเวลา";
  }
  const date = new Date(deletedAt);
  if (Number.isNaN(date.getTime())) {
    return "ไม่ทราบเวลา";
  }
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TrashModal({ onClose }) {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyFolder, setBusyFolder] = useState("");
  const [confirmFolder, setConfirmFolder] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadEntries() {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const data = await apiRequest("/api/trash");
      setEntries(data.entries || []);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, []);

  async function handleRestore(entry) {
    setBusyFolder(entry.folder);
    setConfirmFolder(null);
    setErrorMessage("");
    try {
      await apiRequest(`/api/trash/${entry.folder}/restore`, { method: "POST" });
      window.location.reload();
    } catch (error) {
      setErrorMessage(error.message);
      setBusyFolder("");
    }
  }

  async function handlePurge(entry) {
    if (confirmFolder !== entry.folder) {
      setConfirmFolder(entry.folder);
      setErrorMessage("");
      return;
    }

    setBusyFolder(entry.folder);
    setErrorMessage("");
    try {
      await apiRequest(`/api/trash/${entry.folder}`, { method: "DELETE" });
      setConfirmFolder(null);
      setBusyFolder("");
      await loadEntries();
    } catch (error) {
      setErrorMessage(error.message);
      setBusyFolder("");
      setConfirmFolder(null);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="modal-header">
          <div>
            <p className="modal-kicker">_trash/</p>
            <h2>ถังขยะ</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close trash">
            ✕
          </button>
        </div>

        <p className="modal-copy">
          เพจที่ลบจะถูกย้ายมาเก็บไว้ที่นี่ กู้คืนกลับไปที่ <code>pages/</code> ได้ตลอด
          ส่วน <strong>ลบถาวร</strong> จะลบไฟล์ทิ้งจริง กู้คืนไม่ได้อีก
        </p>

        {isLoading ? <p className="message loading">กำลังโหลดรายการ...</p> : null}

        {!isLoading && !entries.length ? (
          <p className="helper-copy">ถังขยะว่าง — ยังไม่มีเพจที่ถูกลบ</p>
        ) : null}

        <div className="trash-list">
          {entries.map((entry) => (
            <div className="trash-row" key={entry.folder}>
              <div className="trash-info">
                <strong>{entry.name}</strong>
                <span>
                  {entry.slug} • ลบเมื่อ {formatDeletedAt(entry.deletedAt)}
                </span>
              </div>
              <div className="trash-actions">
                <button
                  className="button subtle"
                  type="button"
                  onClick={() => handleRestore(entry)}
                  disabled={busyFolder === entry.folder}
                >
                  {busyFolder === entry.folder ? "กำลังกู้คืน..." : "กู้คืน"}
                </button>
                <button
                  className={`button ${confirmFolder === entry.folder ? "danger" : "subtle"}`}
                  type="button"
                  onClick={() => handlePurge(entry)}
                  disabled={busyFolder === entry.folder}
                >
                  {confirmFolder === entry.folder ? "ยืนยันลบถาวร?" : "ลบถาวร"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {errorMessage ? <p className="message error">{errorMessage}</p> : null}

        <div className="modal-actions">
          <button className="button subtle" type="button" onClick={onClose}>
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

function localDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

// รวมโพสต์ที่ตั้งเวลา/โพสต์แล้วจากทุกเพจ จัดกลุ่มตามวันที่ (key = YYYY-MM-DD เวลาท้องถิ่น)
function buildCalendarEvents(pages, statusesByPage) {
  const events = {};

  for (const page of pages) {
    // สถานะซ้อนตามโปรเจกต์: { [projectSlug]: { [postId]: status } }
    const byProject = statusesByPage[page.slug] || {};

    for (const [projectSlug, statuses] of Object.entries(byProject)) {
      const project = page.projects.find((p) => p.projectSlug === projectSlug);
      const projectPosts = project ? project.days.flatMap((day) => day.posts) : [];

      for (const [postId, status] of Object.entries(statuses)) {
        let dateKey = null;
        let timeLabel = "";

        if (status.state === "scheduled" && status.scheduledAt) {
          // scheduledAt เป็นค่า datetime-local เช่น 2026-07-04T10:30
          dateKey = status.scheduledAt.slice(0, 10);
          timeLabel = status.scheduledAt.slice(11, 16);
        } else if (status.state === "published" && status.updatedAt) {
          const publishedDate = new Date(status.updatedAt);
          if (!Number.isNaN(publishedDate.getTime())) {
            dateKey = localDateKey(publishedDate);
            timeLabel = `${String(publishedDate.getHours()).padStart(2, "0")}:${String(
              publishedDate.getMinutes()
            ).padStart(2, "0")}`;
          }
        }

        if (!dateKey) {
          continue;
        }

        const post = projectPosts.find((entry) => entry.id === postId);
        if (!events[dateKey]) {
          events[dateKey] = [];
        }
        events[dateKey].push({
          pageSlug: page.slug,
          pageName: page.shortName,
          state: status.state,
          timeLabel,
          title: post?.title || postId,
        });
      }
    }
  }

  for (const key of Object.keys(events)) {
    events[key].sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
  }

  return events;
}

const CALENDAR_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function CalendarPanel({ pages, statusesByPage, onOpenPage }) {
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const events = buildCalendarEvents(pages, statusesByPage);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = localDateKey(new Date());

  const monthLabel = viewDate.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  const scheduledTotal = Object.values(events)
    .flat()
    .filter((event) => event.state === "scheduled").length;

  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  function shiftMonth(offset) {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  return (
    <section className="calendar-panel">
      <div className="calendar-header">
        <div>
          <p className="modal-kicker">Content Calendar</p>
          <h2>ปฏิทินโพสต์ทุกเพจ</h2>
          <p className="calendar-meta">
            {scheduledTotal
              ? `มีโพสต์ตั้งเวลาไว้ ${scheduledTotal} โพสต์`
              : "ยังไม่มีโพสต์ตั้งเวลา — กด “ตั้งเวลาโพสต์” ในหน้าเพจ แล้วโพสต์จะแสดงบนปฏิทินนี้"}
          </p>
        </div>
        <div className="calendar-nav">
          <button className="button subtle" type="button" onClick={() => shiftMonth(-1)}>
            ← เดือนก่อน
          </button>
          <strong className="calendar-month">{monthLabel}</strong>
          <button className="button subtle" type="button" onClick={() => shiftMonth(1)}>
            เดือนถัดไป →
          </button>
        </div>
      </div>

      <div className="calendar-weekdays">
        {CALENDAR_WEEKDAYS.map((label) => (
          <div className="calendar-weekday" key={label}>
            {label}
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((dayNumber, index) => {
          if (!dayNumber) {
            return <div className="calendar-cell blank" key={`blank-${index}`} />;
          }

          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
          const dayEvents = events[dateKey] || [];

          return (
            <div className={`calendar-cell ${dateKey === todayKey ? "today" : ""}`} key={dateKey}>
              <span className="calendar-date">{dayNumber}</span>
              {dayEvents.map((event, eventIndex) => (
                <button
                  className={`calendar-event ${event.state}`}
                  type="button"
                  key={`${dateKey}-${eventIndex}`}
                  onClick={() => onOpenPage(event.pageSlug)}
                  title={`${event.pageName} • ${event.title}`}
                >
                  <span className="calendar-event-meta">
                    {event.timeLabel ? `${event.timeLabel} • ` : ""}
                    {event.pageName}
                  </span>
                  {event.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div className="calendar-legend">
        <span>
          <span className="legend-dot scheduled" /> ตั้งเวลาแล้ว
        </span>
        <span>
          <span className="legend-dot published" /> โพสต์แล้ว
        </span>
      </div>
    </section>
  );
}


function CopyButton({ text, label, className }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("คัดลอกอัตโนมัติไม่ได้ — คัดลอกจากช่องนี้แทน", text);
    }
  }

  return (
    <button
      className={`button ${copied ? "publish" : className || "subtle"}`}
      type="button"
      onClick={handleCopy}
      disabled={!text}
    >
      {copied ? "คัดลอกแล้ว ✓" : label}
    </button>
  );
}

// คัดลอก "ตัวภาพ" เข้า clipboard (image/png) — เอาไปวางใน Flow/Grok/แชทต่อได้เลย
// ภาพที่ไม่ใช่ png (jpg/webp จากการลากวาง) แปลงผ่าน canvas ก่อน เพราะ ClipboardItem รับ png เท่านั้น
function CopyImageButton({ imageHref, label, className }) {
  const [state, setState] = useState("idle");

  async function handleCopy() {
    try {
      const response = await fetch(imageHref);
      let blob = await response.blob();
      if (blob.type !== "image/png") {
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext("2d").drawImage(bitmap, 0, 0);
        blob = await new Promise((resolve, reject) =>
          canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("แปลงภาพไม่ได้"))), "image/png"),
        );
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setState("copied");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 2500);
  }

  return (
    <button
      className={`button ${state === "copied" ? "publish" : className || "subtle"}`}
      type="button"
      onClick={handleCopy}
      disabled={!imageHref}
      title="คัดลอกตัวภาพเข้า clipboard — วางใน Flow/Grok ได้เลย"
    >
      {state === "copied" ? "คัดลอกภาพแล้ว ✓" : state === "error" ? "คัดลอกไม่สำเร็จ — ลองใหม่" : label}
    </button>
  );
}

// ดาวน์โหลดไฟล์ภาพลงเครื่อง — fileName ส่งมาแบบไม่ต้องมีนามสกุล เดี๋ยวเติมให้ตามชนิดไฟล์จริง
const IMAGE_EXT_BY_TYPE = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function DownloadImageButton({ imageHref, fileName, label, className }) {
  const [state, setState] = useState("idle");

  async function handleDownload() {
    try {
      const response = await fetch(imageHref);
      if (!response.ok) {
        throw new Error("โหลดภาพไม่ได้");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName
        ? `${fileName}${IMAGE_EXT_BY_TYPE[blob.type] || ".png"}`
        : decodeURIComponent(imageHref.split("?")[0].split("/").pop() || "image.png");
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setState("done");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 2500);
  }

  return (
    <button
      className={`button ${state === "done" ? "publish" : className || "subtle"}`}
      type="button"
      onClick={handleDownload}
      disabled={!imageHref}
      title="บันทึกไฟล์ภาพลงเครื่อง"
    >
      {state === "done" ? "ดาวน์โหลดแล้ว ✓" : state === "error" ? "ดาวน์โหลดไม่สำเร็จ — ลองใหม่" : label}
    </button>
  );
}

// map ตัวละคร → เรื่อง (Day) ที่ปรากฏ โดยสแกนหัวข้อ "ตัวละครในฉาก" ของทุกไฟล์ฉาก
function buildCharacterUsage(page, characters) {
  const usage = new Map(characters.map((character) => [character.name, new Set()]));

  for (const dayEntry of page.days) {
    for (const post of dayEntry.posts) {
      const sceneCharacters = parseDramaScene(post.markdown || "").characters;
      for (const rawLine of sceneCharacters) {
        const cleanLine = rawLine.replace(/\([^)]*\)/g, "").trim();
        if (!cleanLine) {
          continue;
        }
        for (const character of characters) {
          if (cleanLine.includes(character.name) || character.name.includes(cleanLine)) {
            usage.get(character.name).add(dayEntry.day);
          }
        }
      }
    }
  }

  return usage;
}

// จัดกลุ่มการ์ดตามเรื่อง — ตัวละครข้ามเรื่องอยู่กลุ่มของเรื่องแรกที่ปรากฏ (มีป้ายบอกเรื่องอื่นบนการ์ด)
function groupCharactersByStory(page, characters) {
  const usage = buildCharacterUsage(page, characters);
  const indexed = characters.map((character, index) => ({
    character,
    index,
    days: [...usage.get(character.name)].sort((a, b) => a - b),
  }));

  const groups = [];
  const assigned = new Set();

  for (const dayEntry of [...page.days].sort((a, b) => a.day - b.day)) {
    const members = indexed.filter(
      (entry) => entry.days.includes(dayEntry.day) && !assigned.has(entry.character.name)
    );
    if (members.length) {
      members.forEach((entry) => assigned.add(entry.character.name));
      groups.push({ label: `${storyLabels(page).unitAt} ${dayEntry.day}`, members });
    }
  }

  const leftovers = indexed.filter((entry) => !assigned.has(entry.character.name));
  if (leftovers.length) {
    groups.push({ label: "ยังไม่ถูกใช้ในฉากไหน", members: leftovers });
  }

  return groups;
}

function CharacterPanel({ page, storyDay = null, embedded = false }) {
  const [busyIndex, setBusyIndex] = useState(-1);
  const [errorMessage, setErrorMessage] = useState("");
  const labels = storyLabels(page);

  const markdown = charactersDocModules[`../pages/${page.slug}/projects/${page.projectSlug}/characters/characters.md`] || "";
  const characters = parseCharacters(markdown);

  let groups;
  let visibleCount;
  if (storyDay) {
    const usage = buildCharacterUsage(page, characters);
    const members = characters
      .map((character, index) => ({
        character,
        index,
        days: [...usage.get(character.name)].sort((a, b) => a - b),
      }))
      .filter((entry) => entry.days.includes(storyDay));
    groups = members.length ? [{ label: "", members }] : [];
    visibleCount = members.length;
  } else {
    groups = groupCharactersByStory(page, characters);
    visibleCount = characters.length;
  }

  async function handleImageDrop(character, index, event) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file || !UPLOAD_IMAGE_TYPES.includes(file.type)) {
      return;
    }

    const { baseName } = getCharacterImage(page.pageSlug, page.projectSlug, character, index);
    setBusyIndex(index);
    setErrorMessage("");
    try {
      await apiRequest(`/api/pages/${page.pageSlug}/projects/${page.projectSlug}/character-images/${baseName}`, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      window.location.reload();
    } catch (error) {
      setErrorMessage(error.message);
      setBusyIndex(-1);
    }
  }

  const emptyCopy = !characters.length ? (
    <p className="helper-copy">
      ยังไม่มี{labels.castWord} — กด "{labels.studioButton}" สร้างตอนแรก แล้ว Codex จะเขียน{labels.castWord}ลง{" "}
      <code>characters/characters.md</code> ให้เอง
    </p>
  ) : storyDay && !visibleCount ? (
    <p className="helper-copy">ยังไม่พบ{labels.castWord}ที่ระบุไว้ใน{labels.sceneWord}ของ{labels.unitAt.replace("ที่", "")}นี้</p>
  ) : null;

  const body = (
    <>
      {errorMessage ? <p className="message error">{errorMessage}</p> : null}
      {emptyCopy}

      {groups.map((group) => (
        <div className="character-group" key={group.label || "story"}>
          {group.label ? (
            <h3 className="character-group-title">
              {group.label} <span>({group.members.length} {labels.castWord})</span>
            </h3>
          ) : null}
          <div className="character-grid">
            {group.members.map(({ character, index, days }) => {
              const { href } = getCharacterImage(page.pageSlug, page.projectSlug, character, index);
              return (
                <article className="character-card" key={character.name}>
                  <div
                    className="character-photo"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleImageDrop(character, index, event)}
                  >
                    {href ? (
                      <img src={href} alt={character.name} />
                    ) : (
                      <div className="character-photo-placeholder">
                        {busyIndex === index ? "กำลังอัพโหลด..." : "ลากภาพต้นแบบมาวาง"}
                      </div>
                    )}
                  </div>
                  <div className="character-body">
                    <h3>{character.name}</h3>
                    {days.length > 1 ? (
                      <p className="character-usage">ใช้ใน{labels.unitAt} {days.join(", ")}</p>
                    ) : null}
                    {character.fields["เพศ/อายุ"] ? (
                      <p className="character-meta">{character.fields["เพศ/อายุ"]}</p>
                    ) : null}
                    {character.fields["จุดจำ"] ? (
                      <p className="character-mark">📍 {character.fields["จุดจำ"]}</p>
                    ) : null}
                    <div className="post-actions">
                      <CopyButton
                        text={character.fields["คำสั่งสร้างภาพต้นแบบ"] || ""}
                        label="คัดลอกคำสั่งภาพต้นแบบ"
                        className="primary"
                      />
                      <CopyButton
                        text={character.fields["ย่อหน้าบรรยายมาตรฐาน"] || ""}
                        label="คัดลอกย่อหน้าบรรยาย"
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );

  if (embedded) {
    return <div className="character-panel-embedded">{body}</div>;
  }

  return (
    <section className="character-panel">
      <div className="character-panel-header">
        <div>
          <p className="day-kicker">Character Lock</p>
          <h2>
            {storyDay ? labels.castInStory : labels.castMain}
            {visibleCount ? ` (${visibleCount})` : ""}
          </h2>
        </div>
        {visibleCount ? (
          <span className="helper-copy">
            gen ภาพต้นแบบด้วย "คัดลอกคำสั่งภาพต้นแบบ" แล้วลากรูปมาวางบนการ์ด — ใช้แนบตอน gen ทุก shot
          </span>
        ) : null}
      </div>
      {body}
    </section>
  );
}

// หน้ารวมเรื่องของเพจละคร — การ์ดละเรื่อง กดเข้าไปดูตัวละคร+ฉากของเรื่องนั้น

function SceneModal({ post, page, onClose, onEditBrief }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSheetZoomed, setIsSheetZoomed] = useState(false);

  if (!post) {
    return null;
  }

  const labels = storyLabels(page);
  const scene = parseDramaScene(post.markdown || "");

  // ภาพ shot ที่เจนไว้แล้ว (มีไฟล์จริง) — เอามาทำปุ่มคัดลอกภาพแยกทีละช็อต เรียงใต้ปุ่มหลัก
  const shotImages = scene.shotList
    .map((shot) => shot.shotNumber)
    .filter((shotNumber, index, list) => shotNumber && list.indexOf(shotNumber) === index)
    .map((shotNumber) => ({
      shotNumber,
      href: getShotImagePath(post.pageSlug, post.projectSlug, post.day, post.contentNumber, shotNumber),
    }))
    .filter((shot) => shot.href);

  async function handleStoryboardDrop(event) {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file || !UPLOAD_IMAGE_TYPES.includes(file.type)) {
      return;
    }

    setIsUploading(true);
    setUploadError("");
    try {
      await apiRequest(`/api/pages/${post.pageSlug}/projects/${post.projectSlug}/images/${post.day}/${post.contentNumber}`, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      window.location.reload();
    } catch (error) {
      setUploadError(error.message);
      setIsUploading(false);
    }
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
            <p className="modal-kicker">
              เรื่องที่ {post.day} • ฉากที่ {post.contentNumber}
            </p>
            <h2>{scene.beat || post.title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close scene">
            ✕
          </button>
        </div>

        {scene.summary ? <p className="modal-copy">{scene.summary}</p> : null}
        {scene.characters.length ? (
          <p className="scene-characters">{labels.castWord}: {scene.characters.join(" • ")}</p>
        ) : null}

        {uploadError ? <p className="message error">{uploadError}</p> : null}

        <div className="scene-layout">
          <div className="scene-board">
            <div
              className={`storyboard-frame ${isDragOver ? "drop-active" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleStoryboardDrop}
            >
              {post.imageHref ? (
                <img
                  src={post.imageHref}
                  alt={`สตอรี่บอร์ดฉากที่ ${post.contentNumber}`}
                  className="storyboard-zoomable"
                  title="คลิกเพื่อดูภาพเต็ม"
                  onClick={() => setIsSheetZoomed(true)}
                />
              ) : (
                <div className="shot-frame-placeholder">
                  {isUploading
                    ? "กำลังอัพโหลด..."
                    : "ยังไม่มีชีทสตอรี่บอร์ด — คัดลอกคำสั่งให้ Codex gen ภาพช็อต แล้วสคริปต์ compose-sheet จะประกอบชีทให้ (ตัวหนังสือไทยพิมพ์ด้วยฟอนต์จริง)"}
                </div>
              )}
            </div>
            {post.imageHref ? (
              <CopyImageButton
                imageHref={post.imageHref}
                label="คัดลอกภาพสตอรี่บอร์ด"
                className="primary"
              />
            ) : null}
            <CopyButton
              text={shotGenFor(page)?.(post) || ""}
              label="คัดลอกคำสั่ง gen ภาพช็อต (Codex)"
              className={post.imageHref ? undefined : "primary"}
            />
            {shotImages.length ? (
              <div className="shot-image-copy-stack">
                {shotImages.map(({ shotNumber, href }) => (
                  <CopyImageButton
                    key={shotNumber}
                    imageHref={href}
                    label={`คัดลอกภาพ Shot ${shotNumber}`}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="scene-detail">
            {scene.shotList.length ? (
              <div className="shot-list">
                {scene.shotList.map((shot, index) => {
                  const shotNumber = shot.shotNumber || index + 1;
                  const shotDialogue = scene.dialogueByShot[shotNumber] || [];
                  return (
                    <div className="shot-list-row" key={`${shot.shotNumber}-${index}`}>
                      <span className="shot-list-number">Shot {shotNumber}</span>
                      <div>
                        {shot.meta ? <span className="shot-list-meta">{shot.meta}</span> : null}
                        <p>{shot.action || shot.description}</p>
                        {shot.detail ? (
                          <p className="shot-field"><b>รายละเอียดภาพ:</b> {shot.detail}</p>
                        ) : null}
                        {shot.emotion ? (
                          <p className="shot-field"><b>อารมณ์:</b> {shot.emotion}</p>
                        ) : null}
                        {shot.keyObject ? (
                          <p className="shot-field"><b>วัตถุสำคัญ:</b> {shot.keyObject}</p>
                        ) : null}
                        {shotDialogue.map((line, lineIndex) => (
                          <p className="shot-dialogue-inline" key={lineIndex}>
                            💬 {line}
                          </p>
                        ))}
                        {(scene.soundByShot[shotNumber] || []).map((line, lineIndex) => (
                          <p className="shot-dialogue-inline" key={`sound-${lineIndex}`}>
                            🔊 {line}
                          </p>
                        ))}
                        {(scene.overlayByShot[shotNumber] || []).map((line, lineIndex) => (
                          <p className="shot-dialogue-inline" key={`overlay-${lineIndex}`}>
                            📝 Overlay: {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="helper-copy">
                ไฟล์ฉากนี้ยังไม่มีหัวข้อ `## Shot List` ตาม format — กด "แก้ไขไฟล์ฉาก" เพื่อเติม
                หรือสั่ง Codex เขียนใหม่
              </p>
            )}

            {scene.dialogueRest.length ? (
              <p className="shot-dialogue">💬 {scene.dialogueRest.join(" ")}</p>
            ) : null}
            {scene.sound ? <p className="shot-sound">🔊 {scene.sound}</p> : null}

            {scene.videoPrompt ? (
              <details className="shot-prompt">
                <summary>คำสั่งสร้างวิดีโอ (ทั้งฉาก)</summary>
                <p>{scene.videoPrompt}</p>
              </details>
            ) : null}
            {scene.storyboardPrompt ? (
              <details className="shot-prompt">
                <summary>คำสั่งสร้างภาพช็อต (ราย shot)</summary>
                <p>{scene.storyboardPrompt}</p>
              </details>
            ) : null}
          </div>
        </div>

        <div className="modal-actions">
          <button className="button subtle" type="button" onClick={() => onEditBrief(post)}>
            แก้ไขไฟล์ฉาก
          </button>
          <CopyButton
            text={buildSceneVideoPack(scene)}
            label="คัดลอกชุดวิดีโอ (วางใน Grok/Flow)"
            className="publish"
          />
        </div>

        {isSheetZoomed && post.imageHref ? (
          <div
            className="lightbox-backdrop"
            onClick={(event) => {
              event.stopPropagation();
              setIsSheetZoomed(false);
            }}
          >
            <img src={post.imageHref} alt={`สตอรี่บอร์ดฉากที่ ${post.contentNumber}`} />
            <button
              className="icon-button lightbox-close"
              type="button"
              aria-label="Close storyboard preview"
            >
              ✕
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AddPostModal({ page, defaultDay, onClose }) {
  const [day, setDay] = useState(String(defaultDay || 1));
  const [titlesText, setTitlesText] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit() {
    const dayNumber = Number(day);
    if (!Number.isInteger(dayNumber) || dayNumber < 1) {
      setErrorMessage("Day ต้องเป็นตัวเลขตั้งแต่ 1 ขึ้นไป");
      return;
    }

    const titles = titlesText
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/^-+\s*/, ""))
      .filter(Boolean);
    if (!titles.length) {
      setErrorMessage("ใส่หัวข้อโพสต์อย่างน้อย 1 หัวข้อก่อน");
      return;
    }

    setIsBusy(true);
    setErrorMessage("");

    try {
      for (const title of titles) {
        await apiRequest(`/api/pages/${page.pageSlug}/projects/${page.projectSlug}/briefs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day: dayNumber, title }),
        });
      }
      window.location.reload();
    } catch (error) {
      setErrorMessage(error.message);
      setIsBusy(false);
    }
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
            <p className="modal-kicker">Content Queue</p>
            <h2>เพิ่มหัวข้อเข้าคิว: {page.shortName}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close add post">
            ✕
          </button>
        </div>

        <p className="modal-copy">
          หัวข้อจะถูกเพิ่มลง <code>content-topics.md</code> เป็นคิวงาน จากนั้นค่อยสั่ง Codex
          ในโฟลเดอร์โปรเจกต์ให้เขียน brief เต็มและสร้างภาพจากหัวข้อพวกนี้
        </p>

        <div className="field-row">
          <label className="field field-day">
            <span>Day</span>
            <input
              type="number"
              min="1"
              value={day}
              onChange={(event) => setDay(event.target.value)}
            />
          </label>

          <label className="field field-grow">
            <span>หัวข้อโพสต์ (บรรทัดละ 1 หัวข้อ เพิ่มได้หลายหัวข้อ)</span>
            <textarea
              rows="5"
              value={titlesText}
              onChange={(event) => setTitlesText(event.target.value)}
              placeholder={"ซื้อปุ๊บ ขึ้นดอยปั๊บ\nรู้จักหุ้น NVDA ใน 1 นาที"}
              autoFocus
            />
          </label>
        </div>

        {errorMessage ? <p className="message error">{errorMessage}</p> : null}

        <div className="modal-actions">
          <button className="button subtle" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="button" onClick={handleSubmit} disabled={isBusy}>
            {isBusy ? "กำลังเพิ่ม..." : "เพิ่มเข้าคิว"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BriefEditorModal({ post, onClose }) {
  const [markdown, setMarkdown] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const briefApiUrl = `/api/pages/${post.pageSlug}/projects/${post.projectSlug}/briefs/${post.day}/${post.contentNumber}`;

  useEffect(() => {
    let cancelled = false;
    apiRequest(briefApiUrl)
      .then((data) => {
        if (!cancelled) {
          setMarkdown(data.markdown || "");
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        if ((error.message || "").includes("ไม่พบไฟล์")) {
          // หัวข้อที่อยู่ในคิวยังไม่มีไฟล์ brief — เปิดเทมเพลตให้กรอก กดบันทึกเพื่อสร้างไฟล์
          setMarkdown(
            `# Day ${post.day} Content ${post.contentNumber}\n\n## Content Type\n\n\n## Title\n${post.title}\n\n## Objective\n\n\n## Key Message\n\n\n## Image Prompt\n\n\n## Caption + Hashtags\n\n`
          );
        } else {
          setErrorMessage(error.message);
        }
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [briefApiUrl]);

  async function handleSave() {
    if (!markdown.trim()) {
      setErrorMessage("เนื้อหา brief ห้ามว่าง");
      return;
    }

    setIsBusy(true);
    setErrorMessage("");

    try {
      await apiRequest(briefApiUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      window.location.reload();
    } catch (error) {
      setErrorMessage(error.message);
      setIsBusy(false);
    }
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
            <p className="modal-kicker">{post.id}</p>
            <h2>แก้ไข Brief</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close brief editor">
            ✕
          </button>
        </div>

        <p className="modal-copy">
          แก้ไฟล์ <code>pages/{post.pageSlug}/projects/{post.projectSlug}/content_planner/day{post.day}-content-{post.contentNumber}.md</code>{" "}
          ได้โดยตรง ถ้าเปลี่ยนหัวข้อใน <code>## Title</code> ระบบจะอัพเดท{" "}
          <code>content-topics.md</code> ให้ด้วย
        </p>

        {isLoading ? (
          <p className="message loading">กำลังโหลด brief...</p>
        ) : (
          <textarea
            className="brief-editor"
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            spellCheck="false"
          />
        )}

        {errorMessage ? <p className="message error">{errorMessage}</p> : null}

        <div className="modal-actions">
          <button className="button subtle" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button primary"
            type="button"
            onClick={handleSave}
            disabled={isBusy || isLoading}
          >
            {isBusy ? "กำลังบันทึก..." : "บันทึก Brief"}
          </button>
        </div>
      </div>
    </div>
  );
}

export {
  SettingsModal,
  ScheduleModal,
  ContentModal,
  AssetPicker,
  PageFormModal,
  formatDeletedAt,
  TrashModal,
  localDateKey,
  buildCalendarEvents,
  CALENDAR_WEEKDAYS,
  CalendarPanel,
  CopyButton,
  CopyImageButton,
  DownloadImageButton,
  buildCharacterUsage,
  groupCharactersByStory,
  CharacterPanel,
  SceneModal,
  AddPostModal,
  BriefEditorModal,
};
