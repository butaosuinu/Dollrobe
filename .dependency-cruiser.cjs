/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "循環依存の禁止。type-only の循環も許可しない",
      from: {},
      to: { circular: true },
    },
    {
      name: "workers-to-src-shared-only",
      severity: "error",
      comment:
        "workers から src へは共有モジュール (types / constants / confidence / generateLabel) のみ。tsconfig.workers.json の include と一致させる",
      from: { path: "^workers/" },
      to: {
        path: "^src/",
        pathNot: [
          "^src/types/",
          "^src/lib/constants\\.ts$",
          "^src/lib/confidence\\.ts$",
          "^src/lib/generateLabel\\.ts$",
        ],
      },
    },
    {
      name: "src-to-workers-router-only",
      severity: "error",
      comment:
        "src から workers へは AppRouter の型取得のための trpc/router.ts のみ許可",
      from: { path: "^src/" },
      to: { path: "^workers/", pathNot: ["^workers/src/trpc/router\\.ts$"] },
    },
    {
      name: "src-to-workers-type-only",
      severity: "error",
      comment:
        "trpc/router.ts への参照は import type に限定 (値の import 禁止)",
      from: { path: "^src/" },
      to: {
        path: "^workers/src/trpc/router\\.ts$",
        dependencyTypesNot: ["type-only"],
      },
    },
    {
      name: "workers-repo-db-no-upward",
      severity: "error",
      comment:
        "repositories / db は下位層。上位層 (services / trpc / routes / mcp / queues / scheduled) への逆流禁止。テストは層をまたぐ検証を許可",
      from: {
        path: "^workers/src/(repositories|db)/",
        pathNot: ["\\.test\\.ts$"],
      },
      to: {
        path: "^workers/src/(services|trpc|routes|mcp|queues|scheduled)/",
      },
    },
    {
      name: "workers-services-no-upward",
      severity: "error",
      comment:
        "services から配信層 (trpc / routes / mcp / queues / scheduled) への逆流禁止",
      from: { path: "^workers/src/services/", pathNot: ["\\.test\\.ts$"] },
      to: { path: "^workers/src/(trpc|routes|mcp|queues|scheduled)/" },
    },
    {
      name: "workers-lib-no-upward",
      severity: "error",
      comment:
        "lib は層をまたぐ共通ユーティリティ。repositories / services / 配信層への依存禁止 (lib 経由で上位層のレイヤールールを迂回させない)",
      from: { path: "^workers/src/lib/", pathNot: ["\\.test\\.ts$"] },
      to: {
        path: "^workers/src/(repositories|services|trpc|routes|mcp|queues|scheduled)/",
      },
    },
    {
      name: "workers-trpc-no-direct-data-access",
      severity: "error",
      comment:
        "trpc からのデータアクセスは services 経由。db は DI 用の client.ts のみ例外",
      from: { path: "^workers/src/trpc/", pathNot: ["\\.test\\.ts$"] },
      to: {
        path: "^workers/src/(repositories|db)/",
        pathNot: ["^workers/src/db/client\\.ts$"],
      },
    },
    {
      name: "src-components-no-app",
      severity: "error",
      comment: "components は app (ルーティング層) に依存しない",
      from: { path: "^src/components/" },
      to: { path: "^src/app/" },
    },
    {
      name: "src-lib-stores-no-ui",
      severity: "error",
      comment: "lib / stores は UI 層 (components / app) に依存しない",
      from: { path: "^src/(lib|stores)/", pathNot: ["\\.test\\.(ts|tsx)$"] },
      to: { path: "^src/(components|app)/" },
    },
    {
      name: "dexie-only-from-stores",
      severity: "error",
      comment:
        "IndexedDB スキーマ (dexie.ts) へのアクセスは stores / テスト基盤経由に限定",
      from: {
        path: "^src/",
        pathNot: ["^src/(stores|test)/", "^src/lib/db/", "\\.test\\.(ts|tsx)$"],
      },
      to: { path: "^src/lib/db/dexie\\.ts$" },
    },
    {
      name: "no-test-infra-from-production",
      severity: "error",
      comment: "本体コードからテスト基盤 (test ディレクトリ) への import 禁止",
      from: {
        path: "^(src|workers)/",
        pathNot: [
          "\\.test\\.(ts|tsx)$",
          "^src/test/",
          "^workers/src/test/",
          "^workers/test/",
        ],
      },
      to: { path: "^(src/test|workers/src/test|workers/test)/" },
    },
    {
      name: "e2e-scripts-types-only",
      severity: "error",
      comment: "e2e / scripts から本体への依存は src/types のみ許可",
      from: { path: "^(e2e|scripts)/" },
      to: { path: "^(src|workers)/", pathNot: ["^src/types/"] },
    },
    {
      name: "no-new-barrel-imports",
      severity: "error",
      comment:
        "バレルファイル禁止規約の機械化 (近似)。既存の実体 index 3 ファイル以外の index への import を禁止。正当な新規エントリポイントは pathNot に追記して許可する",
      from: {},
      to: {
        path: [
          "^(src|workers|e2e|scripts)/index\\.(ts|tsx)$",
          "^(src|workers|e2e|scripts)/.*/index\\.(ts|tsx)$",
        ],
        pathNot: [
          "^src/types/index\\.ts$",
          "^workers/src/index\\.ts$",
          "^workers/src/trpc/index\\.ts$",
        ],
      },
    },
    {
      name: "no-orphans",
      severity: "error",
      comment:
        "どこからも参照されず、何も import しないファイルの禁止。エントリポイント・規約ファイルは除外",
      from: {
        orphan: true,
        pathNot: [
          "\\.test\\.(ts|tsx)$",
          "^src/test/",
          "^workers/src/test/",
          "^workers/test/",
          "^src/app/(page|layout|loading|error|global-error|not-found|template|default|route|icon|apple-icon|opengraph-image|twitter-image|manifest|robots|sitemap)\\.(ts|tsx)$",
          "^src/app/.+/(page|layout|loading|error|global-error|not-found|template|default|route|icon|apple-icon|opengraph-image|twitter-image|manifest|robots|sitemap)\\.(ts|tsx)$",
          "^src/app/sw\\.ts$",
          "^src/instrumentation\\.ts$",
          "^src/lib/image/extract-colors\\.worker\\.ts$",
          "^src/lib/stubs/",
          "^e2e/",
          "^scripts/",
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: ["^src/locales/", "\\.d\\.ts$"] },
    tsConfig: { fileName: "tsconfig.app.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
  },
};
