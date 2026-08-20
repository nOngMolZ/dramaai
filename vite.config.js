import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createPagesApi } from "./server/pages-api.mjs";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// แดชบอร์ดจัดการเพจใช้ API นี้ ซึ่งมีเฉพาะตอนรัน npm run dev (local เท่านั้น)
// ถ้าจะ deploy จริง ให้เอา createPagesApi ไปเสียบกับ Express/connect แล้วเสิร์ฟ dist/
function pagesApiPlugin() {
  return {
    name: "pages-api",
    configureServer(server) {
      server.middlewares.use("/api", createPagesApi(rootDir));
    },
  };
}

export default defineConfig({
  plugins: [react(), pagesApiPlugin()],
});
