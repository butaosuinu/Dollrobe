import { defineWorkspace } from "vitest/config";
import {
  defineWorkersProject,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";
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
  defineWorkersProject(async () => {
    const migrationsPath = path.resolve(
      import.meta.dirname,
      "workers/migrations",
    );
    const migrations = await readD1Migrations(migrationsPath);
    return {
      test: {
        name: "workers",
        include: ["workers/**/*.test.ts"],
        globals: true,
        setupFiles: ["./workers/src/test/setup.ts"],
        poolOptions: {
          workers: {
            miniflare: {
              d1Databases: ["DB"],
              kvNamespaces: ["KV"],
              r2Buckets: ["BUCKET"],
              queueProducers: { QUEUE: "test-queue" },
              bindings: {
                TEST_MIGRATIONS: migrations,
                R2_PUBLIC_URL: "https://test.example.com",
                BETTER_AUTH_SECRET: "test-secret",
                TWITTER_CLIENT_ID: "",
                TWITTER_CLIENT_SECRET: "",
                GOOGLE_CLIENT_ID: "",
                GOOGLE_CLIENT_SECRET: "",
                TRUSTED_ORIGINS: "http://localhost:3000",
                ALLOWED_ORIGINS: "http://localhost:3000",
              },
            },
          },
        },
      },
      resolve: {
        alias: {
          "@": path.resolve(import.meta.dirname, "./src"),
          "@shared/lib": path.resolve(import.meta.dirname, "./src/lib"),
          "@shared": path.resolve(import.meta.dirname, "./src/types"),
        },
      },
    };
  }),
]);
