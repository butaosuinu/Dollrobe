import { defineConfig } from "vitest/config";
import path from "node:path";
import type { Plugin } from "vitest/config";
import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";

const linguiMacroPlugin = (): Plugin => {
  const macroPattern = /@lingui\/(core|react)\/macro/;

  return {
    name: "lingui-macro-transform",
    enforce: "pre",
    async transform(code, id) {
      if (!/\.[jt]sx?$/.test(id)) return undefined;
      if (id.includes("node_modules")) return undefined;
      if (!macroPattern.test(code)) return undefined;

      const babel = await import("@babel/core");
      const isTSX = id.endsWith(".tsx");

      const result = await babel.transformAsync(code, {
        filename: id,
        plugins: ["@lingui/babel-plugin-lingui-macro"],
        presets: [["@babel/preset-typescript", { isTSX, allExtensions: true }]],
        sourceMaps: true,
      });

      if (result === null) return undefined;

      return {
        code: result.code ?? code,
        map: result.map,
      };
    },
  };
};

const alias = {
  "@": path.resolve(import.meta.dirname, "./src"),
  "@shared/lib": path.resolve(import.meta.dirname, "./src/lib"),
  "@shared": path.resolve(import.meta.dirname, "./src/types"),
};

export default defineConfig({
  test: {
    coverage: {
      provider: "istanbul",
      reporter: ["text", "html", "json-summary"],
      reportOnFailure: true,
      include: ["src/**/*.{ts,tsx}", "workers/src/**/*.ts"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/test/**",
        "**/*.config.{ts,js,mjs,cjs}",
        "src/types/**",
        "src/locales/**",
        "src/app/**/layout.tsx",
        "src/app/**/loading.tsx",
        "src/app/**/error.tsx",
        "src/app/**/not-found.tsx",
        "src/app/sw.ts",
        "src/lib/image/extract-colors*.ts",
        "src/lib/image/opencv-loader.ts",
        "workers/src/types.ts",
        "workers/src/db/schema.ts",
        "e2e/**",
        "scripts/**",
        "**/.next/**",
        "**/node_modules/**",
      ],
    },
    projects: [
      {
        plugins: [linguiMacroPlugin()],
        esbuild: {
          jsx: "automatic",
        },
        resolve: {
          alias,
        },
        test: {
          name: "frontend",
          globals: true,
          environment: "happy-dom",
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
          css: true,
        },
      },
      {
        plugins: [
          cloudflareTest(async () => {
            const migrationsPath = path.resolve(
              import.meta.dirname,
              "workers/migrations",
            );
            const migrations = await readD1Migrations(migrationsPath);
            return {
              miniflare: {
                compatibilityDate: "2026-07-29",
                d1Databases: ["DB"],
                kvNamespaces: ["KV"],
                r2Buckets: ["BUCKET"],
                queueProducers: { QUEUE: "test-queue" },
                bindings: {
                  TEST_MIGRATIONS: migrations,
                  R2_PUBLIC_URL: "https://test.example.com",
                  BETTER_AUTH_SECRET: "test-secret",
                  BETTER_AUTH_URL: "http://localhost:8787",
                  TWITTER_CLIENT_ID: "",
                  TWITTER_CLIENT_SECRET: "",
                  GOOGLE_CLIENT_ID: "",
                  GOOGLE_CLIENT_SECRET: "",
                  TRUSTED_ORIGINS: "http://localhost:3000",
                  ALLOWED_ORIGINS: "http://localhost:3000",
                },
              },
            };
          }),
        ],
        resolve: {
          alias,
        },
        test: {
          name: "workers",
          include: ["workers/**/*.test.ts"],
          globals: true,
          setupFiles: ["./workers/src/test/setup.ts"],
        },
      },
    ],
  },
});
