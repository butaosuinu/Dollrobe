import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    globals: true,
    environment: "node",
    include: ["workers/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@shared/lib": path.resolve(import.meta.dirname, "./src/lib"),
      "@shared": path.resolve(import.meta.dirname, "./src/types"),
    },
  },
});
