import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error type error without @types/node package
import process from "node:process";
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    proxy: {
      "/api/saavn": {
        target: "https://www.jiosaavn.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/saavn/, "/api.php"),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://www.jiosaavn.com/"
        }
      }
    }
  },
  preview: {
    port: 4173,
    proxy: {
      "/api/saavn": {
        target: "https://www.jiosaavn.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/saavn/, "/api.php"),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://www.jiosaavn.com/"
        }
      }
    }
  }
}));
