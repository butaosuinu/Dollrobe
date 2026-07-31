import { classes } from "./classes.mjs";

const rule = (id, reviewClass, note) =>
  Object.freeze({ id, class: reviewClass, note });

const exactRules = new Map([
  [
    ".dependency-cruiser.cjs",
    rule(
      "dependency-cruiser-config",
      classes.high,
      "依存アーキテクチャ境界の品質ゲート",
    ),
  ],
  [
    ".dev.vars.example",
    rule("env-template", classes.high, "ローカル secret・binding 設定の雛形"),
  ],
  [".gitignore", rule("repo-config", classes.medium, "追跡対象の境界")],
  [".mcp.json", rule("mcp-config", classes.high, "MCP server の実行設定")],
  [".oxfmtrc.json", rule("repo-config", classes.medium, "formatter 設定")],
  [
    ".prettierignore",
    rule("repo-config", classes.medium, "formatter 除外設定"),
  ],
  ["AGENTS.md", rule("agent-guide", classes.medium, "エージェント作業規約")],
  ["CLAUDE.md", rule("agent-guide", classes.medium, "エージェント作業規約")],
  ["README.md", rule("readme", classes.none, "一般利用文書")],
  [
    "drizzle.config.ts",
    rule("drizzle-config", classes.high, "D1 schema・migration 生成設定"),
  ],
  ["eslint.config.js", rule("lint-config", classes.medium, "静的検査設定")],
  [
    "lingui-macro-loader.cjs",
    rule("lingui-config", classes.medium, "i18n build 設定"),
  ],
  [
    "lingui.config.ts",
    rule("lingui-config", classes.medium, "i18n catalog 設定"),
  ],
  [
    "next.config.ts",
    rule(
      "web-build-config",
      classes.high,
      "Next.js build・security header 設定",
    ),
  ],
  [
    "open-next.config.ts",
    rule("web-build-config", classes.high, "Cloudflare Web build 設定"),
  ],
  [
    "package.json",
    rule("dependency-manifest", classes.high, "依存・実行 script・品質ゲート"),
  ],
  ["plan.md", rule("docs-general", classes.none, "計画文書")],
  [
    "playwright.config.ts",
    rule("e2e-config", classes.medium, "E2E 実行・forbidOnly 設定"),
  ],
  [
    "pnpm-lock.yaml",
    rule("dependency-lock", classes.high, "依存サプライチェーン lock"),
  ],
  [
    "postcss.config.mjs",
    rule("css-build-config", classes.medium, "CSS build 設定"),
  ],
  [
    "sentry.client.config.ts",
    rule("sentry-config", classes.high, "client observability 設定"),
  ],
  [
    "sentry.edge.config.ts",
    rule("sentry-config", classes.high, "edge observability 設定"),
  ],
  [
    "sentry.server.config.ts",
    rule("sentry-config", classes.high, "server observability 設定"),
  ],
  ["tsconfig.app.json", rule("tsconfig", classes.medium, "app 型検査境界")],
  ["tsconfig.e2e.json", rule("tsconfig", classes.medium, "E2E 型検査境界")],
  ["tsconfig.json", rule("tsconfig", classes.medium, "TypeScript 共通設定")],
  [
    "tsconfig.sw.json",
    rule("tsconfig", classes.medium, "service worker 型検査境界"),
  ],
  [
    "tsconfig.worker.json",
    rule("tsconfig", classes.medium, "image worker 型検査境界"),
  ],
  [
    "tsconfig.workers-test.json",
    rule("tsconfig", classes.medium, "Workers test 型検査境界"),
  ],
  [
    "tsconfig.workers.json",
    rule("tsconfig", classes.medium, "Workers 型検査境界"),
  ],
  [
    "vitest.config.ts",
    rule("test-config", classes.medium, "frontend test・coverage 設定"),
  ],
  [
    "vitest.config.workers.ts",
    rule("test-config", classes.medium, "Workers test 設定"),
  ],
  [
    "vitest.workspace.ts",
    rule("test-config", classes.medium, "Vitest workspace・binding 設定"),
  ],
  [
    "wrangler.jsonc",
    rule(
      "cloudflare-config",
      classes.high,
      "API Worker・D1/R2/KV/Queue binding",
    ),
  ],
  [
    "wrangler.web.jsonc",
    rule("cloudflare-config", classes.high, "Web Worker deploy 設定"),
  ],
  [
    "public/opencv.js",
    rule("opencv-runtime", classes.high, "配布する外部 runtime"),
  ],
  [
    "public/opencv_js.wasm",
    rule("opencv-runtime", classes.high, "配布する外部 runtime"),
  ],
  [
    "src/app/serwist-provider.tsx",
    rule("service-worker", classes.high, "service worker 登録境界"),
  ],
  [
    "src/app/layout.tsx",
    rule("root-layout", classes.high, "全 route の認証・offline composition"),
  ],
  [
    "src/app/sw.ts",
    rule("service-worker", classes.high, "offline cache・同期境界"),
  ],
  [
    "src/hooks/useOnlineSync.ts",
    rule("client-sync", classes.high, "online 復帰時の同期起動"),
  ],
  [
    "src/instrumentation.ts",
    rule("sentry-config", classes.high, "Next.js observability 初期化"),
  ],
  [
    "src/lib/auth.ts",
    rule("client-auth", classes.high, "認証・account・API key client"),
  ],
  [
    "src/lib/trpc.ts",
    rule("client-api", classes.high, "tRPC transport・認証境界"),
  ],
  [
    "src/lib/workersUrl.ts",
    rule("client-api", classes.high, "Workers endpoint 解決"),
  ],
  [
    "workers/src/auth.ts",
    rule("worker-auth", classes.high, "better-auth・frozen user 境界"),
  ],
  [
    "workers/src/index.ts",
    rule("worker-entry", classes.high, "Worker composition root"),
  ],
  [
    "workers/src/lib/auth-resolver.ts",
    rule("worker-auth-boundary", classes.high, "session・API key 認証解決"),
  ],
  [
    "workers/src/lib/api-key-permissions.ts",
    rule("worker-auth-boundary", classes.high, "API key scope 認可境界"),
  ],
  [
    "workers/src/lib/api-key-create.ts",
    rule("worker-auth-boundary", classes.high, "API key 発行ポリシー境界"),
  ],
  [
    "workers/src/lib/user-status.ts",
    rule("worker-auth-boundary", classes.high, "frozen user 判定"),
  ],
  [
    "workers/src/services/admin-service.ts",
    rule("admin-service", classes.high, "admin 認可・監査操作"),
  ],
  [
    "workers/src/services/scan-service.ts",
    rule("scan-service", classes.high, "収納 scan・確認履歴・信頼度更新"),
  ],
  [
    "workers/src/services/sync-service.ts",
    rule("sync-service", classes.high, "offline pull/push・queue 処理順序"),
  ],
]);

const marketingAssetRule = rule(
  "marketing-asset",
  classes.none,
  "LP の静的画像",
);
const marketingAssetPattern = /^public\/lp\/.+\.(?:avif|gif|jpe?g|png|webp)$/i;
const nextRouteHandlerRule = rule(
  "next-route-handler",
  classes.high,
  "Next.js user-data HTTP boundary",
);
const nextRouteHandlerPattern = /^src\/app\/(?:.+\/)?route\.ts$/;

const prefixRules = [
  [
    ".github/workflows/",
    rule("github-workflow", classes.high, "CI/CD workflow"),
  ],
  [
    ".github/actions/",
    rule("github-action", classes.high, "repository-local Action"),
  ],
  [".github/", rule("github-rest", classes.medium, "GitHub repository 設定")],
  [
    ".claude/scripts/",
    rule("review-gate", classes.high, "自動 formatter・Stop 品質ゲート"),
  ],
  [
    ".claude/skills/code-review/",
    rule("review-gate", classes.high, "code review 手順"),
  ],
  [
    ".claude/",
    rule("agent-config", classes.medium, "Claude agent・skill 設定"),
  ],
  [
    ".dmux-hooks/",
    rule("dmux-hook", classes.high, "worktree lifecycle で実行する hook"),
  ],
  [
    "docs/cloudflare-",
    rule("ops-doc", classes.medium, "Cloudflare deploy・runbook 正典"),
  ],
  ["docs/", rule("docs-general", classes.none, "一般文書")],
  ["e2e/", rule("e2e-test", classes.application, "Playwright test・fixture")],
  ["public/", rule("public-asset", classes.application, "配布静的資産")],
  ["scripts/", rule("script", classes.high, "開発・検証用実行 script")],
  [
    "tools/reviewrisk/",
    rule("risk-tool", classes.high, "PR review risk の判定器"),
  ],
  ["src/app/admin/", rule("admin-ui", classes.medium, "admin 操作 UI")],
  ["src/app/(public)/", rule("auth-ui", classes.medium, "signin・signup UI")],
  [
    "src/app/settings/account/",
    rule("auth-ui", classes.medium, "account 管理 UI"),
  ],
  [
    "src/app/settings/api-keys/",
    rule("auth-ui", classes.medium, "API key 管理 UI"),
  ],
  [
    "src/app/serwist/",
    rule("service-worker", classes.high, "service worker route"),
  ],
  ["src/app/", rule("app-ui", classes.application, "Next.js route・表示")],
  [
    "src/components/admin/",
    rule("admin-component", classes.medium, "admin 操作 component"),
  ],
  [
    "src/components/auth/",
    rule("auth-component", classes.medium, "認証 component"),
  ],
  [
    "src/components/settings/",
    rule(
      "settings-component",
      classes.medium,
      "account・API key 設定 component",
    ),
  ],
  [
    "src/components/",
    rule("component-ui", classes.application, "表示 component"),
  ],
  [
    "src/hooks/",
    rule("client-hook", classes.medium, "browser capability・domain hook"),
  ],
  ["src/i18n/", rule("client-i18n", classes.application, "i18n 初期化")],
  ["src/locales/", rule("client-i18n", classes.application, "翻訳 catalog")],
  [
    "src/lib/db/",
    rule(
      "client-db",
      classes.high,
      "Dexie schema・migration・offline persistence",
    ),
  ],
  ["src/lib/stubs/", rule("client-stub", classes.medium, "build/test stub")],
  ["src/lib/", rule("client-lib", classes.medium, "client domain・I/O logic")],
  [
    "src/stores/",
    rule("client-store", classes.high, "Dexie・syncQueue・tRPC state mutation"),
  ],
  [
    "src/test/",
    rule("client-test-support", classes.application, "frontend test harness"),
  ],
  [
    "src/types/",
    rule("client-type", classes.medium, "frontend/Workers 共有契約"),
  ],
  [
    "workers/migrations/",
    rule("migration", classes.high, "forward-only D1 migration"),
  ],
  [
    "workers/src/test/",
    rule("worker-test-support", classes.application, "Workers test harness"),
  ],
  [
    "workers/test/",
    rule("worker-test-support", classes.application, "Workers test fixture"),
  ],
  [
    "workers/src/db/",
    rule("worker-db", classes.high, "D1 schema・validation・DB helper"),
  ],
  [
    "workers/src/lib/",
    rule("worker-lib", classes.medium, "Workers 共通 runtime logic"),
  ],
  [
    "workers/src/mcp/",
    rule("worker-mcp", classes.high, "MCP auth・scope・tool 境界"),
  ],
  [
    "workers/src/middleware/",
    rule("worker-middleware", classes.high, "HTTP 認証 middleware"),
  ],
  [
    "workers/src/repositories/",
    rule("worker-repository", classes.high, "userId scoped D1 access"),
  ],
  [
    "workers/src/routes/",
    rule("worker-route", classes.high, "非 tRPC HTTP route"),
  ],
  [
    "workers/src/trpc/",
    rule("worker-trpc", classes.high, "tRPC input・認可境界"),
  ],
  [
    "workers/src/services/",
    rule("worker-service", classes.medium, "business rule・use case"),
  ],
  [
    "workers/src/queues/",
    rule("worker-queue", classes.medium, "Queue consumer"),
  ],
  [
    "workers/src/scheduled/",
    rule("worker-scheduled", classes.medium, "cron 処理"),
  ],
  ["workers/src/", rule("worker-rest", classes.medium, "Workers runtime")],
].sort((left, right) => right[0].length - left[0].length);

export const isTestFile = (path) =>
  /\.(?:test|spec)\.(?:[cm]?[jt]sx?)$/.test(path);

export const classifyPath = (path) => {
  const exact = exactRules.get(path);
  if (exact !== undefined) {
    return exact;
  }
  if (isTestFile(path)) {
    return rule("test-file", classes.application, "自動 test");
  }
  if (marketingAssetPattern.test(path)) {
    return marketingAssetRule;
  }
  if (nextRouteHandlerPattern.test(path)) {
    return nextRouteHandlerRule;
  }
  const match = prefixRules.find(([prefix]) => path.startsWith(prefix));
  return match?.[1];
};

export const allRuleIds = () =>
  [
    ...exactRules.values(),
    marketingAssetRule,
    nextRouteHandlerRule,
    ...prefixRules.map(([, prefixRule]) => prefixRule),
    rule("test-file", classes.application, "自動 test"),
  ]
    .map(({ id }) => id)
    .filter((id, index, ids) => ids.indexOf(id) === index)
    .sort();
