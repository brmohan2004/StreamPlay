import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 1420,
    proxy: {
      "/api/saavn": {
        target: "https://www.jiosaavn.com",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/saavn/, "/api.php"),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://www.jiosaavn.com/",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9"
        },
        configure: (proxy: any) => {
          proxy.on?.('error', (err: any, _req: any, res: any) => {
            if (res && typeof res.writeHead === 'function' && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ results: [], error: err?.message || 'Proxy error' }));
            }
          });
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
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/saavn/, "/api.php"),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://www.jiosaavn.com/",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9"
        },
        configure: (proxy: any) => {
          proxy.on?.('error', (err: any, _req: any, res: any) => {
            if (res && typeof res.writeHead === 'function' && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ results: [], error: err?.message || 'Proxy error' }));
            }
          });
        }
      }
    }
  }
});
