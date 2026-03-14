import { defineWorkspace } from "vitest/config";
import path from "node:path";

export default defineWorkspace([
  {
    extends: "./vitest.config.ts",
    test: {
      name: "frontend",
      include: ["src/**/*.test.{ts,tsx}"],
      environment: "happy-dom",
      setupFiles: ["./src/test/setup.ts"],
    },
  },
  {
    test: {
      name: "workers",
      include: ["workers/**/*.test.ts"],
      environment: "node",
      setupFiles: ["./workers/src/test/setup.ts"],
      globals: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
        "@shared/lib": path.resolve(import.meta.dirname, "./src/lib"),
        "@shared": path.resolve(import.meta.dirname, "./src/types"),
      },
    },
  },
]);
