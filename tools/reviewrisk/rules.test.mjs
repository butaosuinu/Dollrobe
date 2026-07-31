import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { classes } from "./classes.mjs";
import { allRuleIds, classifyPath } from "./rules.mjs";

test("Dollrobe の重要境界を分類する", () => {
  const cases = [
    ["README.md", classes.none, "readme"],
    ["src/app/page.tsx", classes.application, "app-ui"],
    ["src/app/layout.tsx", classes.high, "root-layout"],
    ["src/app/admin/users/page.tsx", classes.medium, "admin-ui"],
    ["src/lib/db/dexie.ts", classes.high, "client-db"],
    ["src/lib/stubs/fs-stub.cjs", classes.medium, "client-stub"],
    ["public/lp/photos/hero-bg.webp", classes.none, "marketing-asset"],
    ["public/lp/app.js", classes.application, "public-asset"],
    ["public/lp/index.html", classes.application, "public-asset"],
    ["public/lp/image.svg", classes.application, "public-asset"],
    ["src/stores/syncAtoms.ts", classes.high, "client-store"],
    [
      "workers/src/repositories/garment-repository.ts",
      classes.high,
      "worker-repository",
    ],
    [
      "workers/src/services/garment-service.ts",
      classes.medium,
      "worker-service",
    ],
    ["workers/src/trpc/routers/garment.ts", classes.high, "worker-trpc"],
    ["workers/migrations/0016_cd_smoke_test.sql", classes.high, "migration"],
    [".github/workflows/ci.yml", classes.high, "github-workflow"],
  ];
  for (const [path, expectedClass, expectedRule] of cases) {
    const actual = classifyPath(path);
    assert.equal(actual?.class, expectedClass, path);
    assert.equal(actual?.id, expectedRule, path);
  }
});

test("test file は機密 prefix 配下でも A に分類する", () => {
  const actual = classifyPath("workers/src/trpc/routers/admin.test.ts");
  assert.equal(actual?.class, classes.application);
  assert.equal(actual?.id, "test-file");
});

test("API key の permission・create 境界は H に分類する", () => {
  for (const path of [
    "workers/src/lib/api-key-permissions.ts",
    "workers/src/lib/api-key-create.ts",
  ]) {
    const actual = classifyPath(path);
    assert.equal(actual?.class, classes.high, path);
    assert.equal(actual?.id, "worker-auth-boundary", path);
  }
});

test("未知の top-level path は分類しない", () => {
  assert.equal(classifyPath("new-security-config.toml"), undefined);
});

test("tracked と作業中の未追跡ファイルを全て分類する", () => {
  const result = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const paths = result.stdout.split("\0").filter(Boolean);
  const unclassified = paths.filter((path) => classifyPath(path) === undefined);
  assert.deepEqual(unclassified, []);
});

test("正典文書に全 rule ID が載っている", async () => {
  const document = await readFile("docs/review-risk.ja.md", "utf8");
  const missing = allRuleIds().filter((id) => !document.includes(`\`${id}\``));
  assert.deepEqual(missing, []);
});
