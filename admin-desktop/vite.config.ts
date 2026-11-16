import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  build: { outDir: "dist/renderer" },
  test: { environment: "jsdom", include: ["src/**/*.test.ts?(x)"] },
});
