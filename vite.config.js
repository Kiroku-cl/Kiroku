import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "static/dist",
    emptyOutDir: true,
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      input: {
        app: "static/js/app/index.js",
        admin: "static/js/admin/index.js"
      },
      output: {
        entryFileNames: "[name].min.js",
        chunkFileNames: "[name].min.js",
        assetFileNames: "[name][extname]"
      }
    }
  }
});
