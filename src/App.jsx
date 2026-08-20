import { useState, useEffect } from "react";
import {
  apiRequest,
} from "./api.js";
import {
  AddPostModal,
  BriefEditorModal,
  ContentModal,
  SceneModal,
  ScheduleModal,
  SettingsModal,
} from "./components.jsx";
import {
  PAGES,
  getProjectFromUrl,
  getSlugFromUrl,
  getStoryFromUrl,
} from "./content.js";
import { FORMAT_LABELS, getFormat, isStoryPage, storyLabels } from "./formats.js";
import {
  DEFAULT_SETTINGS,
  SETTINGS_BY_PAGE_KEY,
  STATUS_BY_PAGE_KEY,
  fetchCalendar,
  fetchFbSettings,
  formatScheduledLabel,
  loadSettingsByPage,
  loadStatusesByPage,
  normalizeSettings,
  publishPostToFacebook,
  resolvePageFromToken,
  resolvePostPermalink,
  saveCalendar,
  saveFbSettings,
  schedulePostToFacebook,
  toUnixSeconds,
} from "./facebook.js";
import {
  DramaStudioModal,
  ReviewStudioModal,
} from "./studios.jsx";
import {
  Dashboard,
  PageView,
  StoryDetailSection,
  StoryOverviewSection,
} from "./views.jsx";

// studio modal ต่อ format (dispatch แบบ data-driven ไม่ใช่ if format===)
const STUDIO_MODALS = {
  drama: DramaStudioModal,
  review: ReviewStudioModal,
};

function App() {
  const [activeSlug, setActiveSlug] = useState(getSlugFromUrl);
  const [activeProjectSlug, setActiveProjectSlug] = useState(getProjectFromUrl);
  const [activeStory, setActiveStory] = useState(getStoryFromUrl);
  const [settingsByPage, setSettingsByPage] = useState(loadSettingsByPage);
  const [statusesByPage, setStatusesByPage] = useState(loadStatusesByPage);
  const [publishStateByPage, setPublishStateByPage] = useState({});
  const [draftSettings, setDraftSettings] = useState(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [dragOverPostId, setDragOverPostId] = useState(null);
  const [addPostDay, setAddPostDay] = useState(null);
  const [editingBriefPost, setEditingBriefPost] = useState(null);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [scheduleModalState, setScheduleModalState] = useState({
    isOpen: false,
    post: null,
    scheduledAt: "",
    errorMessage: "",
    isScheduling: false,
  });

  // 3 ชั้น: brandPage (เพจ/แบรนด์) → activeProject (โปรเจกต์) → พื้นที่ทำงาน
  // activeProject มี shape เดียวกับ page เดิม จึงตั้ง activePage = activeProject ให้ view เดิมใช้ได้
  const brandPage = PAGES.find((page) => page.slug === activeSlug) || null;
  const activeProject =
    brandPage && activeProjectSlug
      ? brandPage.projects.find((pr) => pr.projectSlug === activeProjectSlug) || null
      : null;
  const activePage = activeProject;
  const StudioModal = activePage ? STUDIO_MODALS[getFormat(activePage.type).studioKey] : null;
  const activeStoryEntry =
    isStoryPage(activeProject) && activeStory
      ? activeProject.days.find((day) => day.day === activeStory) || null
      : null;
  // FB settings / publish status เป็นระดับเพจ (แบรนด์) — ใช้ร่วมทุกโปรเจกต์
  const settings = normalizeSettings(brandPage ? settingsByPage[brandPage.slug] : null);
  const contentStatuses =
    (brandPage && activeProjectSlug && statusesByPage[brandPage.slug]?.[activeProjectSlug]) || {};
  const publishState = (brandPage && publishStateByPage[brandPage.slug]) || {};

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_BY_PAGE_KEY, JSON.stringify(settingsByPage));
  }, [settingsByPage]);

  useEffect(() => {
    window.localStorage.setItem(STATUS_BY_PAGE_KEY, JSON.stringify(statusesByPage));
  }, [statusesByPage]);

  useEffect(() => {
    function handlePopState() {
      setActiveSlug(getSlugFromUrl());
      setActiveProjectSlug(getProjectFromUrl());
      setActiveStory(getStoryFromUrl());
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // โหลด FB settings + สถานะจากไฟล์ (canonical) ทับ localStorage ตอน mount
  // ถ้าไฟล์ว่างแต่ localStorage มีข้อมูล → push ขึ้นไฟล์ (migrate ครั้งแรก)
  // ทุกอย่าง fail เงียบ → API ล่มก็ยังใช้ localStorage ต่อได้ (ไม่ regression)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fileSettings = {};
      const fileStatuses = {};
      await Promise.all(
        PAGES.map(async (page) => {
          const [s, c] = await Promise.all([
            fetchFbSettings(page.slug),
            fetchCalendar(page.slug),
          ]);
          if (s && s.accessToken) fileSettings[page.slug] = s;
          if (c && Object.keys(c).length) fileStatuses[page.slug] = c;
        })
      );
      if (cancelled) return;

      if (Object.keys(fileSettings).length) {
        setSettingsByPage((prev) => ({ ...prev, ...fileSettings }));
      }
      if (Object.keys(fileStatuses).length) {
        setStatusesByPage((prev) => ({ ...prev, ...fileStatuses }));
      }

      // migrate: เพจที่ไฟล์ว่างแต่ localStorage มีข้อมูล → เขียนขึ้นไฟล์
      for (const page of PAGES) {
        if (!fileSettings[page.slug] && settingsByPage[page.slug]?.accessToken) {
          saveFbSettings(page.slug, settingsByPage[page.slug]);
        }
        if (!fileStatuses[page.slug] && statusesByPage[page.slug]) {
          saveCalendar(page.slug, statusesByPage[page.slug]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // รันครั้งเดียวตอน mount (ใช้ค่า localStorage เริ่มต้นเป็น baseline สำหรับ migrate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isConfigured = Boolean(settings.accessToken && settings.pageId);

  function resetPageView() {
    setSelectedPost(null);
    setIsSettingsOpen(false);
    setSettingsError("");
    setAddPostDay(null);
    setEditingBriefPost(null);
    setIsStudioOpen(false);
    setScheduleModalState({
      isOpen: false,
      post: null,
      scheduledAt: "",
      errorMessage: "",
      isScheduling: false,
    });
  }

  // เปิดหน้าเพจ (รายการโปรเจกต์) — ไม่เจาะจงโปรเจกต์
  function openPage(slug) {
    window.history.pushState({}, "", `/?page=${slug}`);
    setActiveSlug(slug);
    setActiveProjectSlug(null);
    setActiveStory(null);
    resetPageView();
  }

  // เปิดพื้นที่ทำงานของโปรเจกต์
  function openProject(projectSlug, pageSlug = activeSlug) {
    window.history.pushState({}, "", `/?page=${pageSlug}&project=${projectSlug}`);
    setActiveSlug(pageSlug);
    setActiveProjectSlug(projectSlug);
    setActiveStory(null);
    resetPageView();
  }

  // สลับโปรเจกต์พี่น้องในเพจเดียวกัน (แท็บบนสุดในพื้นที่ทำงาน)
  function switchProject(projectSlug) {
    if (projectSlug === activeProjectSlug) {
      return;
    }
    openProject(projectSlug);
  }

  function goToDashboard() {
    window.history.pushState({}, "", "/");
    setActiveSlug(null);
    setActiveProjectSlug(null);
    setActiveStory(null);
    resetPageView();
  }

  // กลับไปหน้าเพจ (รายการโปรเจกต์) จากพื้นที่ทำงาน
  function backToPage() {
    window.history.pushState({}, "", `/?page=${activeSlug}`);
    setActiveProjectSlug(null);
    setActiveStory(null);
    resetPageView();
  }

  function openStory(dayNumber) {
    window.history.pushState(
      {},
      "",
      `/?page=${activeSlug}&project=${activeProjectSlug}&story=${dayNumber}`
    );
    setActiveStory(dayNumber);
    resetPageView();
  }

  function closeStory() {
    window.history.pushState({}, "", `/?page=${activeSlug}&project=${activeProjectSlug}`);
    setActiveStory(null);
    resetPageView();
  }

  function setPostPublishState(pageSlug, postId, value) {
    setPublishStateByPage((current) => ({
      ...current,
      [pageSlug]: {
        ...(current[pageSlug] || {}),
        [postId]: value,
      },
    }));
  }

  // สถานะซ้อนตามโปรเจกต์: statusesByPage[pageSlug][projectSlug][postId]
  function setPostStatus(pageSlug, projectSlug, postId, value) {
    setStatusesByPage((current) => {
      const page = current[pageSlug] || {};
      const project = page[projectSlug] || {};
      const nextPage = {
        ...page,
        [projectSlug]: {
          ...project,
          [postId]: { ...(project[postId] || {}), ...value },
        },
      };
      saveCalendar(pageSlug, nextPage); // sync ลง calendar.json (fire-and-forget)
      return { ...current, [pageSlug]: nextPage };
    });
  }

  function openSettings() {
    setDraftSettings(settings);
    setSettingsError("");
    setIsSettingsOpen(true);
  }

  async function handleImageDrop(post, event) {
    event.preventDefault();
    event.stopPropagation();
    setDragOverPostId(null);

    const file = event.dataTransfer?.files?.[0];
    if (!file) {
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setPostPublishState(post.pageSlug, post.id, {
        type: "error",
        message: "รองรับเฉพาะไฟล์ PNG, JPG หรือ WEBP",
      });
      return;
    }

    setPostPublishState(post.pageSlug, post.id, {
      type: "loading",
      message: "กำลังอัพโหลดภาพ...",
    });

    try {
      await apiRequest(`/api/pages/${post.pageSlug}/projects/${post.projectSlug}/images/${post.day}/${post.contentNumber}`, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      window.location.reload();
    } catch (error) {
      setPostPublishState(post.pageSlug, post.id, {
        type: "error",
        message: error.message || "อัพโหลดภาพไม่สำเร็จ",
      });
    }
  }

  function handleDraftChange(field, value) {
    setDraftSettings((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSaveSettings() {
    if (!brandPage) {
      return;
    }

    const trimmedSettings = {
      apiVersion: draftSettings.apiVersion.trim() || "v23.0",
      pageId: draftSettings.pageId.trim(),
      pageName: draftSettings.pageName.trim(),
      accessToken: draftSettings.accessToken.trim(),
    };

    if (!trimmedSettings.accessToken) {
      setSettingsError("กรุณาใส่ Facebook Page Access Token ก่อน");
      return;
    }

    setIsSavingSettings(true);
    setSettingsError("");

    try {
      let resolved = {
        pageId: trimmedSettings.pageId,
        pageName: trimmedSettings.pageName,
      };

      if (!trimmedSettings.pageId) {
        resolved = await resolvePageFromToken({
          accessToken: trimmedSettings.accessToken,
          apiVersion: trimmedSettings.apiVersion,
        });
      }

      const nextSettings = {
        ...trimmedSettings,
        pageId: resolved.pageId,
        pageName: trimmedSettings.pageName || resolved.pageName,
      };

      if (!nextSettings.pageId) {
        throw new Error("ไม่สามารถหา Page ID จาก token นี้ได้ กรุณาระบุเอง");
      }

      setSettingsByPage((current) => ({
        ...current,
        [brandPage.slug]: nextSettings,
      }));
      saveFbSettings(brandPage.slug, nextSettings); // เก็บลง page.config.local.json
      setDraftSettings(nextSettings);
      setIsSettingsOpen(false);
    } catch (error) {
      setSettingsError(error.message || "บันทึกการตั้งค่าไม่สำเร็จ");
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handlePublish(post) {
    const pageSlug = post.pageSlug;
    const pageSettings = normalizeSettings(settingsByPage[pageSlug]);

    if (!pageSettings.accessToken || !pageSettings.pageId) {
      setDraftSettings(pageSettings);
      setSettingsError("กรุณาตั้งค่า Facebook Page Access Token และ Page ID ก่อนโพสต์");
      setIsSettingsOpen(true);
      return;
    }

    setPostPublishState(pageSlug, post.id, {
      type: "loading",
      message: "กำลังโพสต์ไปยัง Facebook Page...",
    });

    try {
      const result = await publishPostToFacebook({ settings: pageSettings, post });
      const referenceId = result.post_id || result.id || "unknown";
      const permalinkUrl = await resolvePostPermalink({
        settings: pageSettings,
        objectId: result.post_id || result.id,
      });

      setPostPublishState(pageSlug, post.id, {
        type: "success",
        message: `โพสต์สำเร็จแล้ว (id: ${referenceId})`,
        link: permalinkUrl,
        persistedState: "published",
      });
      setPostStatus(pageSlug, post.projectSlug, post.id, {
        state: "published",
        label: "โพสต์แล้ว",
        updatedAt: new Date().toISOString(),
        postId: referenceId,
        link: permalinkUrl,
      });
    } catch (error) {
      const message = error.message || "โพสต์ไม่สำเร็จ";
      setPostPublishState(pageSlug, post.id, {
        type: "error",
        message,
      });
      setPostStatus(pageSlug, post.projectSlug, post.id, {
        state: "error",
        label: "ผิดพลาดล่าสุด",
        updatedAt: new Date().toISOString(),
        errorMessage: message,
      });
    }
  }

  function openScheduleModal(post) {
    const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
    const local = new Date(tenMinutesLater.getTime() - tenMinutesLater.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setScheduleModalState({
      isOpen: true,
      post,
      scheduledAt: local,
      errorMessage: "",
      isScheduling: false,
    });
  }

  function closeScheduleModal() {
    setScheduleModalState((current) => ({
      ...current,
      isOpen: false,
      errorMessage: "",
      isScheduling: false,
    }));
  }

  async function handleConfirmSchedule() {
    const { post, scheduledAt } = scheduleModalState;

    if (!post) {
      return;
    }

    const pageSlug = post.pageSlug;
    const pageSettings = normalizeSettings(settingsByPage[pageSlug]);

    if (!pageSettings.accessToken || !pageSettings.pageId) {
      setDraftSettings(pageSettings);
      setSettingsError("กรุณาตั้งค่า Facebook Page Access Token และ Page ID ก่อนโพสต์");
      setIsSettingsOpen(true);
      return;
    }

    if (!scheduledAt) {
      setScheduleModalState((current) => ({
        ...current,
        errorMessage: "กรุณาเลือกวันเวลาเผยแพร่",
      }));
      return;
    }

    const scheduledPublishTime = toUnixSeconds(scheduledAt);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const minFutureSeconds = nowSeconds + 10 * 60; // FB: อย่างน้อย ~10 นาที
    const maxFutureSeconds = nowSeconds + 75 * 24 * 60 * 60; // FB: ไกลสุด ~75 วัน

    if (Number.isNaN(scheduledPublishTime) || scheduledPublishTime < minFutureSeconds) {
      setScheduleModalState((current) => ({
        ...current,
        errorMessage: "กรุณาตั้งเวลาให้ห่างจากเวลาปัจจุบันอย่างน้อยประมาณ 10 นาที",
      }));
      return;
    }

    if (scheduledPublishTime > maxFutureSeconds) {
      setScheduleModalState((current) => ({
        ...current,
        errorMessage: "Facebook ตั้งเวลาโพสต์ล่วงหน้าได้ไม่เกิน ~75 วัน — เลือกวันที่ใกล้กว่านี้",
      }));
      return;
    }

    setScheduleModalState((current) => ({
      ...current,
      isScheduling: true,
      errorMessage: "",
    }));

    setPostPublishState(pageSlug, post.id, {
      type: "loading",
      message: "กำลังส่งคำสั่งตั้งเวลาโพสต์ไปยัง Facebook Page...",
    });

    try {
      const result = await schedulePostToFacebook({
        settings: pageSettings,
        post,
        scheduledPublishTime,
      });
      const referenceId = result.post_id || result.id || "unknown";
      const permalinkUrl = await resolvePostPermalink({
        settings: pageSettings,
        objectId: result.post_id || result.id,
      });

      setPostPublishState(pageSlug, post.id, {
        type: "success",
        message: `ตั้งเวลาโพสต์สำเร็จแล้ว (id: ${referenceId})`,
        link: permalinkUrl,
        persistedState: "scheduled",
      });
      setPostStatus(pageSlug, post.projectSlug, post.id, {
        state: "scheduled",
        label: `ตั้งเวลาแล้ว${formatScheduledLabel(scheduledAt) ? ` • ${formatScheduledLabel(scheduledAt)}` : ""}`,
        updatedAt: new Date().toISOString(),
        scheduledAt,
        postId: referenceId,
        link: permalinkUrl,
      });

      setScheduleModalState((current) => ({
        ...current,
        isOpen: false,
        isScheduling: false,
        errorMessage: "",
      }));
    } catch (error) {
      const message = error.message || "ตั้งเวลาโพสต์ไม่สำเร็จ";

      setPostPublishState(pageSlug, post.id, {
        type: "error",
        message,
      });

      setScheduleModalState((current) => ({
        ...current,
        isScheduling: false,
        errorMessage: message,
      }));
      setPostStatus(pageSlug, post.projectSlug, post.id, {
        state: "error",
        label: "ผิดพลาดล่าสุด",
        updatedAt: new Date().toISOString(),
        errorMessage: message,
      });
    }
  }

  // ไม่ได้เลือกเพจ → แดชบอร์ดรวมเพจ
  if (!brandPage) {
    return (
      <Dashboard
        pages={PAGES}
        settingsByPage={settingsByPage}
        statusesByPage={statusesByPage}
        onOpenPage={openPage}
      />
    );
  }

  // เลือกเพจแล้วแต่ยังไม่เลือกโปรเจกต์ → หน้ารายการโปรเจกต์ของเพจ
  if (!activeProject) {
    return (
      <>
        <PageView
          page={brandPage}
          settings={settings}
          onOpenProject={(projectSlug) => openProject(projectSlug, brandPage.slug)}
          onBack={goToDashboard}
          onOpenSettings={openSettings}
        />
        <SettingsModal
          isOpen={isSettingsOpen}
          page={brandPage}
          draftSettings={draftSettings}
          isSaving={isSavingSettings}
          errorMessage={settingsError}
          onChange={handleDraftChange}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveSettings}
        />
      </>
    );
  }

  return (
    <>
      <main className="app-shell">
        <nav className="page-switcher">
          <button type="button" className="page-tab home" onClick={goToDashboard}>
            <span className="page-tab-name">⌂ แดชบอร์ด</span>
            <span className="page-tab-meta">{PAGES.length} เพจ</span>
          </button>
          <button type="button" className="page-tab home" onClick={backToPage}>
            <span className="page-tab-name">← {brandPage.shortName}</span>
            <span className="page-tab-meta">{brandPage.projects.length} โปรเจกต์</span>
          </button>
          {brandPage.projects.map((project) => (
            <button
              key={project.projectSlug}
              type="button"
              className={`page-tab ${project.projectSlug === activeProject.projectSlug ? "active" : ""}`}
              onClick={() => switchProject(project.projectSlug)}
            >
              <span className="page-tab-name">{project.name}</span>
              <span className="page-tab-meta">
                {FORMAT_LABELS[project.format] || project.format} · {project.totalImages}/
                {project.totalPosts}
              </span>
            </button>
          ))}
        </nav>

        <section className="hero">
          <div className="hero-panel">
            <span className="eyebrow">Facebook Auto Content</span>
            <div className="hero-topbar">
              <div>
                <h1>{activePage.name}</h1>
                <p className="hero-copy">
                  {activePage.description ||
                    "React viewer สำหรับดูโพสต์รายวัน ภาพ และ brief ในที่เดียว"}{" "}
                  กดปุ่ม “+ เพิ่มหัวข้อ” เพื่อเข้าคิวหัวข้อโพสต์ แล้วสั่ง Codex
                  เขียน brief และสร้างภาพจากคิวนั้นได้เลย
                </p>
              </div>

              <div className="hero-actions">
                {isStoryPage(activePage) ? (
                  <button className="button primary" type="button" onClick={() => setIsStudioOpen(true)}>
                    {storyLabels(activePage).studioButton}
                  </button>
                ) : null}
                <button
                  className={`button ${isStoryPage(activePage) ? "subtle" : "primary"}`}
                  type="button"
                  onClick={() => setAddPostDay(Math.max(1, ...activePage.days.map((day) => day.day)))}
                >
                  + เพิ่มหัวข้อ
                </button>
              </div>
            </div>

            <div className={`connection-banner ${isConfigured ? "connected" : "disconnected"}`}>
              <strong>
                {isConfigured
                  ? `Facebook พร้อมใช้งาน (${brandPage.shortName})`
                  : `Facebook ยังไม่พร้อมใช้งาน (${brandPage.shortName})`}
              </strong>
              <span>
                {isConfigured
                  ? `Page: ${settings.pageName || settings.pageId} | API ${settings.apiVersion}`
                  : "ตั้งค่า Page Access Token ที่หน้าเพจ (ปุ่ม ⚙️ Facebook Settings) — ใช้ร่วมทุกโปรเจกต์"}
              </span>
            </div>
          </div>

          <aside className="stats-panel">
            <div className="stat-card">
              <div className="stat-label">Days</div>
              <div className="stat-value">{activePage.days.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Planned Posts</div>
              <div className="stat-value">{activePage.totalPosts}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Images Ready</div>
              <div className="stat-value">{activePage.totalImages}</div>
            </div>
          </aside>
        </section>

        {isStoryPage(activePage) ? (
          activeStoryEntry ? (
            <StoryDetailSection
              page={activePage}
              dayEntry={activeStoryEntry}
              onBack={closeStory}
              onSelectPost={setSelectedPost}
            />
          ) : (
            <StoryOverviewSection
              page={activePage}
              onOpenStory={openStory}
              onOpenStudio={() => setIsStudioOpen(true)}
            />
          )
        ) : (
        <section className="days-stack">
          {activePage.days.length === 0 ? (
            <article className="day-panel">
              <p className="hero-copy">
                เพจนี้ยังไม่มีคอนเทนต์ กดปุ่ม “+ เพิ่มหัวข้อ” ด้านบน หรือปุ่ม “+ เพิ่ม Day” ด้านล่าง เพื่อเข้าคิวหัวข้อแรกได้เลย
              </p>
            </article>
          ) : null}

          {activePage.days.map((day) => {
            const readyCount = day.posts.filter((post) => post.imageHref).length;

            return (
              <article className="day-panel" key={day.day}>
                <div className="day-header">
                  <div>
                    <p className="day-kicker">Daily Batch</p>
                    <h2>Day {day.day}</h2>
                  </div>
                  <div className="day-header-actions">
                    <button
                      className="button subtle"
                      type="button"
                      onClick={() => setAddPostDay(day.day)}
                    >
                      + เพิ่มหัวข้อ
                    </button>
                    <div className="day-badge">
                      {readyCount}/{day.posts.length} images ready
                    </div>
                  </div>
                </div>

                <div className="posts-grid">
                  {day.posts.map((post) => {
                    const postPublishState = publishState[post.id];
                    const postStatus = contentStatuses[post.id];
                    const isPublished = postStatus?.state === "published";

                    return (
                      <article className="post-card" key={`${post.day}-${post.contentNumber}`}>
                        <button
                          className={`post-media compact-media-button ${
                            dragOverPostId === post.id ? "drop-active" : ""
                          }`}
                          type="button"
                          onClick={() => setSelectedPost(post)}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragOverPostId(post.id);
                          }}
                          onDragLeave={() =>
                            setDragOverPostId((current) => (current === post.id ? null : current))
                          }
                          onDrop={(event) => handleImageDrop(post, event)}
                        >
                          {post.imageHref ? (
                            <img src={post.imageHref} alt={post.title} />
                          ) : (
                            <div className="post-placeholder">
                              ยังไม่มีภาพ — ลากรูปมาวางที่นี่ได้เลย
                              <code>
                                pages/{post.pageSlug}/projects/{post.projectSlug}/generated_posts/day{post.day}/day{post.day}
                                -content-{post.contentNumber}.png
                              </code>
                            </div>
                          )}
                          {dragOverPostId === post.id ? (
                            <div className="drop-overlay">วางรูปเพื่ออัพโหลด</div>
                          ) : null}
                        </button>

                        <div className="post-body">
                          <div className="post-topline">
                            <p className="post-key">{post.id}</p>
                            <span className={`status-pill ${postStatus?.state || "draft"}`}>
                              {postStatus?.label || "ยังไม่โพสต์"}
                            </span>
                          </div>
                          <h3>{post.title}</h3>

                          {postPublishState ? (
                            <p className={`message ${postPublishState.type}`}>{postPublishState.message}</p>
                          ) : null}

                          <div className="post-actions">
                            <button className="button primary" type="button" onClick={() => setSelectedPost(post)}>
                              ดูคอนเทนต์
                            </button>
                            {!isPublished ? (
                              <>
                                <button
                                  className="button publish"
                                  type="button"
                                  onClick={() => handlePublish(post)}
                                  disabled={postPublishState?.type === "loading"}
                                >
                                  {postPublishState?.type === "loading" ? "Posting..." : "โพสต์"}
                                </button>
                                <button
                                  className="button subtle"
                                  type="button"
                                  onClick={() => openScheduleModal(post)}
                                  disabled={postPublishState?.type === "loading"}
                                >
                                  ตั้งเวลาโพสต์
                                </button>
                              </>
                            ) : null}
                            {postPublishState?.type === "success" && postPublishState?.link ? (
                              <a
                                className="button"
                                href={postPublishState.link}
                                target="_blank"
                                rel="noreferrer"
                              >
                                เปิดโพสต์
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </article>
            );
          })}

          <button
            className="day-add-button"
            type="button"
            onClick={() =>
              setAddPostDay(Math.max(0, ...activePage.days.map((day) => day.day)) + 1)
            }
          >
            + เพิ่ม Day {Math.max(0, ...activePage.days.map((day) => day.day)) + 1}
            <span>เพิ่มหัวข้อของวันใหม่เข้าคิว</span>
          </button>
        </section>
        )}
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        page={brandPage}
        draftSettings={draftSettings}
        isSaving={isSavingSettings}
        errorMessage={settingsError}
        onChange={handleDraftChange}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <ScheduleModal
        isOpen={scheduleModalState.isOpen}
        post={scheduleModalState.post}
        scheduledAt={scheduleModalState.scheduledAt}
        isScheduling={scheduleModalState.isScheduling}
        errorMessage={scheduleModalState.errorMessage}
        onChange={(value) =>
          setScheduleModalState((current) => ({
            ...current,
            scheduledAt: value,
            errorMessage: "",
          }))
        }
        onClose={closeScheduleModal}
        onConfirm={handleConfirmSchedule}
      />

      {isStoryPage(activePage) ? (
        <SceneModal
          post={selectedPost}
          page={activePage}
          onClose={() => setSelectedPost(null)}
          onEditBrief={(post) => {
            setSelectedPost(null);
            setEditingBriefPost(post);
          }}
        />
      ) : (
        <ContentModal
          post={selectedPost}
          publishState={
            selectedPost
              ? {
                  [selectedPost.id]: {
                    ...(publishState[selectedPost.id] || {}),
                    persistedState: contentStatuses[selectedPost.id]?.state,
                  },
                }
              : publishState
          }
          onClose={() => setSelectedPost(null)}
          onPublish={handlePublish}
          onSchedule={openScheduleModal}
          onEditBrief={(post) => {
            setSelectedPost(null);
            setEditingBriefPost(post);
          }}
        />
      )}

      {addPostDay ? (
        <AddPostModal page={activePage} defaultDay={addPostDay} onClose={() => setAddPostDay(null)} />
      ) : null}

      {editingBriefPost ? (
        <BriefEditorModal post={editingBriefPost} onClose={() => setEditingBriefPost(null)} />
      ) : null}

      {isStudioOpen && StudioModal ? (
        <StudioModal page={activePage} onClose={() => setIsStudioOpen(false)} />
      ) : null}
    </>
  );
}

export default App;