import { PAGES } from "./content.js";
import { apiRequest } from "./api.js";

const SETTINGS_BY_PAGE_KEY = "facebook-page-settings-by-page";
const STATUS_BY_PAGE_KEY = "content-publish-status-by-page";
const LEGACY_SETTINGS_KEY = "facebook-page-settings";
const LEGACY_STATUS_KEY = "content-publish-status";
const LEGACY_PAGE_SLUG = "mekastock";

const DEFAULT_SETTINGS = {
  apiVersion: "v23.0",
  pageId: "",
  pageName: "",
  accessToken: "",
};

function readJsonFromStorage(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function pickLegacyTargetSlug() {
  if (PAGES.some((page) => page.slug === LEGACY_PAGE_SLUG)) {
    return LEGACY_PAGE_SLUG;
  }
  return PAGES[0]?.slug || null;
}

function normalizeSettings(rawSettings) {
  return {
    apiVersion: rawSettings?.apiVersion || "v23.0",
    pageId: rawSettings?.pageId || "",
    pageName: rawSettings?.pageName || "",
    accessToken: rawSettings?.accessToken || "",
  };
}

function loadSettingsByPage() {
  if (typeof window === "undefined") {
    return {};
  }

  const saved = readJsonFromStorage(SETTINGS_BY_PAGE_KEY);
  if (saved && typeof saved === "object") {
    return saved;
  }

  const legacy = readJsonFromStorage(LEGACY_SETTINGS_KEY);
  const targetSlug = pickLegacyTargetSlug();
  if (legacy && targetSlug) {
    return { [targetSlug]: normalizeSettings(legacy) };
  }

  return {};
}

// สถานะเก็บแบบซ้อนตามโปรเจกต์: { [pageSlug]: { [projectSlug]: { [postId]: status } } }
// โครงเก่า flat ({ [pageSlug]: { [postId]: status } }) ให้ห่อไว้ใต้โปรเจกต์ "main"
function isFlatPageStatuses(pageValue) {
  if (!pageValue || typeof pageValue !== "object") return false;
  // ถ้า key เป็นรูปแบบ postId (dayN-content-M) = โครงเก่า flat
  return Object.keys(pageValue).some((k) => /^day\d+-content-\d+$/.test(k));
}

function migrateStatusShape(byPage) {
  const out = {};
  for (const [pageSlug, pageValue] of Object.entries(byPage || {})) {
    out[pageSlug] = isFlatPageStatuses(pageValue) ? { main: pageValue } : pageValue;
  }
  return out;
}

function loadStatusesByPage() {
  if (typeof window === "undefined") {
    return {};
  }

  const saved = readJsonFromStorage(STATUS_BY_PAGE_KEY);
  if (saved && typeof saved === "object") {
    return migrateStatusShape(saved);
  }

  const legacy = readJsonFromStorage(LEGACY_STATUS_KEY);
  const targetSlug = pickLegacyTargetSlug();
  if (legacy && targetSlug) {
    return { [targetSlug]: { main: legacy } };
  }

  return {};
}

// ---- File persistence (page.config.local.json + calendar.json) ----
// ทุกฟังก์ชัน fail แบบเงียบ → ถ้า API ล่ม (เช่นตอน build prod) แอปยังใช้ localStorage ต่อได้

export async function fetchFbSettings(slug) {
  try {
    const res = await apiRequest(`/api/pages/${slug}/fb-settings`);
    return res.data || null;
  } catch {
    return null;
  }
}

export async function saveFbSettings(slug, settings) {
  try {
    await apiRequest(`/api/pages/${slug}/fb-settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: settings }),
    });
  } catch {
    // localStorage ยังเก็บไว้แล้ว — ข้ามได้
  }
}

export async function fetchCalendar(slug) {
  try {
    const res = await apiRequest(`/api/pages/${slug}/calendar`);
    return res.data && typeof res.data === "object" ? res.data : {};
  } catch {
    return {};
  }
}

export async function saveCalendar(slug, pageStatuses) {
  try {
    await apiRequest(`/api/pages/${slug}/calendar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: pageStatuses }),
    });
  } catch {
    // localStorage ยังเก็บไว้แล้ว — ข้ามได้
  }
}

function formatScheduledLabel(datetimeLocalValue) {
  if (!datetimeLocalValue) {
    return "";
  }

  const date = new Date(datetimeLocalValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function resolvePageFromToken({ accessToken, apiVersion }) {
  const params = new URLSearchParams({
    fields: "id,name",
    access_token: accessToken,
  });

  const response = await fetch(`https://graph.facebook.com/${apiVersion}/me?${params.toString()}`);
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || "ไม่สามารถตรวจสอบ token กับเพจได้");
  }

  return {
    pageId: data.id || "",
    pageName: data.name || "",
  };
}

async function resolvePostPermalink({ settings, objectId }) {
  if (!objectId) {
    return "";
  }

  const params = new URLSearchParams({
    fields: "permalink_url",
    access_token: settings.accessToken,
  });

  const response = await fetch(
    `https://graph.facebook.com/${settings.apiVersion}/${objectId}?${params.toString()}`
  );
  const data = await response.json();

  if (!response.ok || data.error) {
    return "";
  }

  return data.permalink_url || "";
}

async function publishPostToFacebook({ settings, post }) {
  const graphBase = `https://graph.facebook.com/${settings.apiVersion}`;

  if (post.imageHref) {
    const imageResponse = await fetch(post.imageHref);
    if (!imageResponse.ok) {
      throw new Error("ไม่สามารถอ่านไฟล์ภาพของโพสต์นี้ได้");
    }

    const imageBlob = await imageResponse.blob();
    const extension = imageBlob.type.split("/")[1] || "png";
    const formData = new FormData();
    formData.append("access_token", settings.accessToken);
    formData.append("published", "true");
    formData.append("caption", post.caption);
    formData.append("source", imageBlob, `${post.id}.${extension}`);

    const response = await fetch(`${graphBase}/${settings.pageId}/photos`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error?.message || "โพสต์รูปไปยังเพจไม่สำเร็จ");
    }

    return data;
  }

  const body = new URLSearchParams({
    access_token: settings.accessToken,
    message: post.caption,
  });

  const response = await fetch(`${graphBase}/${settings.pageId}/feed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || "โพสต์ข้อความไปยังเพจไม่สำเร็จ");
  }

  return data;
}

function toUnixSeconds(datetimeLocalValue) {
  return Math.floor(new Date(datetimeLocalValue).getTime() / 1000);
}

async function schedulePostToFacebook({ settings, post, scheduledPublishTime }) {
  const graphBase = `https://graph.facebook.com/${settings.apiVersion}`;

  if (post.imageHref) {
    const imageResponse = await fetch(post.imageHref);
    if (!imageResponse.ok) {
      throw new Error("ไม่สามารถอ่านไฟล์ภาพของโพสต์นี้ได้");
    }

    const imageBlob = await imageResponse.blob();
    const extension = imageBlob.type.split("/")[1] || "png";
    const formData = new FormData();
    formData.append("access_token", settings.accessToken);
    formData.append("published", "false");
    formData.append("scheduled_publish_time", String(scheduledPublishTime));
    formData.append("caption", post.caption);
    formData.append("source", imageBlob, `${post.id}.${extension}`);

    const response = await fetch(`${graphBase}/${settings.pageId}/photos`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error?.message || "ตั้งเวลาโพสต์รูปไม่สำเร็จ");
    }

    return data;
  }

  const body = new URLSearchParams({
    access_token: settings.accessToken,
    message: post.caption,
    published: "false",
    scheduled_publish_time: String(scheduledPublishTime),
    unpublished_content_type: "SCHEDULED",
  });

  const response = await fetch(`${graphBase}/${settings.pageId}/feed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || "ตั้งเวลาโพสต์ข้อความไม่สำเร็จ");
  }

  return data;
}
export {
  SETTINGS_BY_PAGE_KEY,
  STATUS_BY_PAGE_KEY,
  LEGACY_SETTINGS_KEY,
  LEGACY_STATUS_KEY,
  LEGACY_PAGE_SLUG,
  DEFAULT_SETTINGS,
  readJsonFromStorage,
  pickLegacyTargetSlug,
  normalizeSettings,
  loadSettingsByPage,
  loadStatusesByPage,
  formatScheduledLabel,
  resolvePageFromToken,
  resolvePostPermalink,
  publishPostToFacebook,
  toUnixSeconds,
  schedulePostToFacebook,
};
