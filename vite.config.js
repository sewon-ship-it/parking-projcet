import { defineConfig } from "vite";
import { resolve } from "path";
import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from "fs";

// src 폴더를 public/src로 복사하는 헬퍼
function copySrcToPublic() {
  const srcPath = resolve(__dirname, "src");
  const publicSrcPath = resolve(__dirname, "public/src");
  
  if (!existsSync(srcPath)) return;
  
  if (!existsSync(publicSrcPath)) {
    mkdirSync(publicSrcPath, { recursive: true });
  }
  
  const files = readdirSync(srcPath);
  for (const file of files) {
    const srcFile = resolve(srcPath, file);
    const destFile = resolve(publicSrcPath, file);
    const stat = statSync(srcFile);
    if (stat.isFile() && file.endsWith(".js")) {
      copyFileSync(srcFile, destFile);
    }
  }
}

// Vite 설정: public/index.html을 진입점으로 사용
export default defineConfig({
  root: "public",
  plugins: [
    {
      name: "copy-src",
      buildStart() {
        copySrcToPublic();
      },
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url.startsWith("/src/")) {
            copySrcToPublic(); // 개발 중 변경 시 동기화
          }
          next();
        });
      }
    }
  ],
  server: {
    proxy: {
      "/config": {
        target: `http://localhost:${process.env.PORT || 8080}`,
        changeOrigin: true
      },
      "/api": {
        target: `http://localhost:${process.env.PORT || 8080}`,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "../dist",
    rollupOptions: {
      input: resolve(__dirname, "public/index.html")
    }
  }
});
