async function apiRequest(url, options = {}) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error("เรียก API ไม่ได้ — ฟีเจอร์จัดการเพจใช้ได้เฉพาะตอนรัน npm run dev");
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "คำขอไม่สำเร็จ — ฟีเจอร์จัดการเพจใช้ได้เฉพาะตอนรัน npm run dev");
  }

  return data;
}

const SLUG_INPUT_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

const UPLOAD_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

function uploadAssetFile(slug, kind, file) {
  return apiRequest(`/api/pages/${slug}/assets/${kind}`, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
}
export {
  apiRequest,
  SLUG_INPUT_PATTERN,
  UPLOAD_IMAGE_TYPES,
  uploadAssetFile,
};
