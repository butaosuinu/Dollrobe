import {
  classes,
  compareLevels,
  levelForClass,
  levels,
  maxLevel,
} from "./classes.mjs";
import { classifyPath, isTestFile } from "./rules.mjs";

const largeDiffLines = 800;
const largeDiffFiles = 30;

const signals = Object.freeze({
  testDeleted: "S1-test-deleted",
  testSupportDeleted: "S2-test-support-deleted",
  testDisabled: "S3-test-disabled-or-focused",
  reviewGate: "S4-review-gate-modified",
  riskTool: "S5-risk-tool-modified",
  workflowDeleted: "S6-ci-workflow-deleted",
  qualityGate: "S7-quality-gate-modified",
  migrationRewritten: "S8-migration-rewritten",
  unclassified: "S9-unclassified-path",
  invariant: "S10-invariant-hit",
  largeDiff: "S11-large-diff",
  patchUnreadable: "S12-patch-unreadable",
});

const testSupportPrefixes = [
  "e2e/fixtures/",
  "e2e/helpers/",
  "src/test/",
  "workers/src/test/",
  "workers/test/",
];

const testSupportPaths = new Set([
  "playwright.config.ts",
  "vitest.config.ts",
  "vitest.config.workers.ts",
  "vitest.workspace.ts",
]);

const reviewGatePrefixes = [".claude/scripts/", ".claude/skills/code-review/"];

const dmuxLifecycleHookNames = new Set([
  "before_pane_create",
  "pane_created",
  "worktree_created",
  "before_pane_close",
  "pane_closed",
  "before_worktree_remove",
  "worktree_removed",
  "pre_merge",
  "post_merge",
  "run_test",
  "run_dev",
]);

const riskPaths = [
  ".github/workflows/review-risk-guard.yml",
  ".github/workflows/review-risk.yml",
  "docs/review-risk.ja.md",
];

const invariantPatterns = [
  ["userId", /\buserId\b/],
  ["adminProcedure", /\badminProcedure\b/],
  ["protectedProcedure", /\bprotectedProcedure\b/],
  ["resolveAuthenticatedUserId", /\bresolveAuthenticatedUserId\b/],
  ["isUserFrozen", /\bisUserFrozen\b/],
  ["syncQueue", /\bsyncQueue\b/],
  ["NEXT_PUBLIC_WORKERS_URL", /\bNEXT_PUBLIC_WORKERS_URL\b/],
  ["Cloudflare credentials", /\bCLOUDFLARE_(?:API_TOKEN|ACCOUNT_ID)\b/],
  ["better-auth settings", /\bBETTER_AUTH_(?:SECRET|URL)\b/],
  ["remote migration", /(?:migrations apply|--remote)/],
  ["Playwright forbidOnly", /\bforbidOnly\b/],
];

const testDisablePatterns = [
  /\.(?:skip|skipIf|only|todo|fixme|runIf)\b/,
  /\[\s*["'](?:skip|skipIf|only|todo|fixme|runIf)["']\s*\]/,
  /\b(?:xit|xtest|xdescribe|fit|ftest|fdescribe)\b/,
  /(?:\b(?:skip|only|todo|fixme)|["'](?:skip|only|todo|fixme)["'])\s*:(?!\s*false\b)\s*/,
  /\b(?:skip|todo|only)\s*(?:<[^>]*>\s*)?\(/,
];

const qualityGatePattern =
  /"(?:scripts|test(?::[^"]+)?|build(?::[^"]+)?|typecheck|lint|depcruise|format:check|i18n:check|precheck(?::[^"]+)?|review-risk)"\s*:/;
const qualityScriptNamePattern =
  /^(?:test(?::.+)?|build(?::.+)?|typecheck|lint|depcruise|format:check|i18n:check|precheck(?::.+)?|review-risk)$/;

const touches = (file, pathOrPrefix) =>
  file.path.startsWith(pathOrPrefix) ||
  (file.oldPath !== "" && file.oldPath.startsWith(pathOrPrefix));

const isDmuxLifecycleHook = (path) => {
  const prefix = ".dmux-hooks/";
  if (!path.startsWith(prefix)) {
    return false;
  }
  const name = path.slice(prefix.length);
  return !name.includes("/") && dmuxLifecycleHookNames.has(name);
};

const touchesDmuxLifecycleHook = (file) =>
  isDmuxLifecycleHook(file.path) || isDmuxLifecycleHook(file.oldPath);

const isWorkflowFile = (path) => {
  const prefix = ".github/workflows/";
  if (!path.startsWith(prefix)) {
    return false;
  }
  const remainder = path.slice(prefix.length);
  return (
    !remainder.includes("/") &&
    (remainder.endsWith(".yml") || remainder.endsWith(".yaml"))
  );
};

const workflowExtension = (path) =>
  path.endsWith(".yaml") ? ".yaml" : path.endsWith(".yml") ? ".yml" : "";

const changesWorkflowExtension = (file) =>
  file.status === "R" &&
  isWorkflowFile(file.oldPath) &&
  isWorkflowFile(file.path) &&
  workflowExtension(file.oldPath) !== workflowExtension(file.path);

const rewritesExistingMigration = (file) => {
  const prefix = "workers/migrations/";
  if (file.status === "R") {
    return file.oldPath.startsWith(prefix);
  }
  return file.status !== "A" && file.path.startsWith(prefix);
};

const reason = (signal, level, file, detail) => ({
  signal,
  level,
  file,
  detail,
});

const regularFileModes = new Set(["100644", "100755"]);

const replacesRegularFileType = (file) =>
  file.status === "T" &&
  regularFileModes.has(file.oldMode) &&
  !regularFileModes.has(file.newMode);

const isDeletedOrMovedOut = (file, predicate) =>
  (file.status === "D" && predicate(file.path)) ||
  (file.status === "R" && predicate(file.oldPath) && !predicate(file.path)) ||
  (replacesRegularFileType(file) && predicate(file.path));

const removesOrRenamesProtectedPath = (file, predicate) =>
  (file.status === "D" && predicate(file.path)) ||
  (file.status === "R" && predicate(file.oldPath)) ||
  (replacesRegularFileType(file) && predicate(file.path));

const pathMatchesPrefix = (path, prefixes) =>
  prefixes.some((prefix) => path.startsWith(prefix));

const isTestSupportPath = (path) =>
  testSupportPaths.has(path) || pathMatchesPrefix(path, testSupportPrefixes);

export const requiresEvaluationContents = (path) => path === "package.json";

const changedLines = (diff, path) => [
  ...(diff.addedLines.get(path) ?? []),
  ...(diff.removedLines.get(path) ?? []),
];

const unclassifiedRule = (note = "未分類（rules.mjs に要追記）") => ({
  id: "unclassified",
  class: classes.unknown,
  note,
});

const isCommentOnlyLine = (line) => {
  const trimmed = line.trimStart();
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("*/")
  );
};

const addedTestDisableLine = (diff, path) =>
  (diff.addedLines.get(path) ?? []).find(
    (line) =>
      !isCommentOnlyLine(line) &&
      testDisablePatterns.some((pattern) => pattern.test(line)),
  );

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parsePackageJson = (source) => {
  try {
    const parsed = JSON.parse(source);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const packageQualityGateChanged = (diff) => {
  const afterSource = diff.afterContents?.get("package.json");
  if (afterSource === undefined) {
    return changedLines(diff, "package.json").some((line) =>
      qualityGatePattern.test(line),
    );
  }

  const beforeSource = diff.beforeContents?.get("package.json") ?? "";
  const before = parsePackageJson(beforeSource);
  const after = parsePackageJson(afterSource);
  if (before === undefined || after === undefined) {
    return true;
  }

  const beforeHasScripts = Object.hasOwn(before, "scripts");
  const afterHasScripts = Object.hasOwn(after, "scripts");
  if (beforeHasScripts !== afterHasScripts) {
    return true;
  }
  if (!beforeHasScripts) {
    return false;
  }
  if (!isRecord(before.scripts) || !isRecord(after.scripts)) {
    return true;
  }

  const names = new Set([
    ...Object.keys(before.scripts),
    ...Object.keys(after.scripts),
  ]);
  for (const name of names) {
    if (!qualityScriptNamePattern.test(name)) {
      continue;
    }
    if (
      !Object.hasOwn(before.scripts, name) ||
      !Object.hasOwn(after.scripts, name) ||
      JSON.stringify(before.scripts[name]) !==
        JSON.stringify(after.scripts[name])
    ) {
      return true;
    }
  }
  return false;
};

const criticalReasons = (diff) => {
  const reasons = [];
  for (const path of [...(diff.unreadablePaths ?? [])].sort()) {
    reasons.push(
      reason(
        signals.patchUnreadable,
        levels.critical,
        path,
        "patch 本文または判定文脈が読み取り上限を超過・解析不能（fail-closed）",
      ),
    );
  }

  for (const file of diff.files) {
    if (isDeletedOrMovedOut(file, isTestFile)) {
      reasons.push(
        reason(
          signals.testDeleted,
          levels.critical,
          file.path,
          file.status === "D"
            ? "テストファイルを削除"
            : file.status === "R"
              ? "rename でテスト形状を喪失"
              : "type change でテストファイル実体を喪失",
        ),
      );
    }

    const losesTestSupport = removesOrRenamesProtectedPath(
      file,
      isTestSupportPath,
    );
    if (losesTestSupport) {
      reasons.push(
        reason(
          signals.testSupportDeleted,
          levels.critical,
          file.path,
          "test fixture・helper・harness を削除・移動・type change",
        ),
      );
    }

    if (
      file.path === ".claude/settings.json" ||
      file.oldPath === ".claude/settings.json" ||
      touchesDmuxLifecycleHook(file) ||
      reviewGatePrefixes.some((prefix) => touches(file, prefix))
    ) {
      reasons.push(
        reason(
          signals.reviewGate,
          levels.critical,
          file.path,
          "自動品質ゲートまたは code review 手順を変更",
        ),
      );
    }

    if (
      touches(file, "tools/reviewrisk/") ||
      riskPaths.includes(file.path) ||
      riskPaths.includes(file.oldPath)
    ) {
      reasons.push(
        reason(
          signals.riskTool,
          levels.critical,
          file.path,
          "review-risk の判定器・正典・workflow 自身を変更",
        ),
      );
    }

    if (
      isDeletedOrMovedOut(file, isWorkflowFile) ||
      changesWorkflowExtension(file)
    ) {
      reasons.push(
        reason(
          signals.workflowDeleted,
          levels.critical,
          file.path,
          "GitHub Actions workflow を削除・rename・type change で無効化",
        ),
      );
    }

    if (rewritesExistingMigration(file)) {
      reasons.push(
        reason(
          signals.migrationRewritten,
          levels.critical,
          file.path,
          "forward-only の既存 D1 migration を変更・削除・rename",
        ),
      );
    }
  }

  for (const path of [...diff.addedLines.keys()].sort()) {
    if (!isTestFile(path)) {
      continue;
    }
    const matchedLine = addedTestDisableLine(diff, path);
    if (matchedLine !== undefined) {
      reasons.push(
        reason(
          signals.testDisabled,
          levels.critical,
          path,
          `test 無効化・focus marker を追加: ${matchedLine.trim()}`,
        ),
      );
    }
  }

  const packageManifestRemoved = diff.files.some((file) =>
    isDeletedOrMovedOut(file, (path) => path === "package.json"),
  );
  if (packageManifestRemoved || packageQualityGateChanged(diff)) {
    reasons.push(
      reason(
        signals.qualityGate,
        levels.critical,
        "package.json",
        packageManifestRemoved
          ? "package.json を削除・対象外へ移動・type change"
          : "scripts container または品質 script を変更",
      ),
    );
  }

  return reasons;
};

const invariantReasons = (diff) => {
  const paths = new Set([
    ...diff.addedLines.keys(),
    ...diff.removedLines.keys(),
  ]);
  const reasons = [];
  for (const path of [...paths].sort()) {
    if (path.endsWith(".md")) {
      continue;
    }
    const lines = changedLines(diff, path);
    for (const [name, pattern] of invariantPatterns) {
      if (lines.some((line) => pattern.test(line))) {
        reasons.push(
          reason(
            signals.invariant,
            levels.high,
            path,
            `ドメイン・運用不変条件 ${name} に接触`,
          ),
        );
      }
    }
  }
  return reasons;
};

const nonNegative = (value) => (value < 0 ? 0 : value);

const sortReasons = (reasons) =>
  reasons.sort((left, right) => {
    const levelComparison = compareLevels(right.level, left.level);
    if (levelComparison !== 0) {
      return levelComparison;
    }
    return (
      left.signal.localeCompare(right.signal) ||
      left.file.localeCompare(right.file)
    );
  });

export const evaluate = (diff) => {
  let level = levels.none;
  const classByPath = new Map();
  const files = diff.files
    .map((file) => {
      let matchedRule = classifyPath(file.path) ?? unclassifiedRule();
      if (file.status === "R" && file.oldPath !== "") {
        const oldRule =
          classifyPath(file.oldPath) ??
          unclassifiedRule(`未分類 rename 元 ${file.oldPath}`);
        const levelComparison = compareLevels(
          levelForClass(oldRule.class),
          levelForClass(matchedRule.class),
        );
        if (
          levelComparison > 0 ||
          (levelComparison === 0 &&
            oldRule.class === classes.unknown &&
            matchedRule.class !== classes.unknown)
        ) {
          matchedRule = {
            ...oldRule,
            note:
              oldRule.id === "unclassified"
                ? oldRule.note
                : `${oldRule.note}（rename 元 ${file.oldPath} 由来）`,
          };
        }
      }
      const fileLevel = levelForClass(matchedRule.class);
      level = maxLevel(level, fileLevel);
      classByPath.set(file.path, matchedRule.class);
      return {
        path: file.path,
        status: file.status,
        class: matchedRule.class,
        level: fileLevel,
        rule: matchedRule.id,
        note: matchedRule.note,
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));

  const reasons = [];
  for (const file of files) {
    if (file.class === classes.unknown) {
      level = maxLevel(level, levels.high);
      reasons.push(
        reason(
          signals.unclassified,
          levels.high,
          file.path,
          "未分類パス（rename 元を含む。fail-closed で high）",
        ),
      );
    }
  }

  const invariant = invariantReasons(diff);
  if (invariant.length > 0) {
    level = maxLevel(level, levels.high);
    reasons.push(...invariant);
  }

  let nonNoneFiles = 0;
  let nonNoneLines = 0;
  for (const file of diff.files) {
    if (classByPath.get(file.path) === classes.none) {
      continue;
    }
    nonNoneFiles += 1;
    nonNoneLines += nonNegative(file.added) + nonNegative(file.deleted);
  }
  if (
    (nonNoneLines > largeDiffLines || nonNoneFiles > largeDiffFiles) &&
    (level === levels.low || level === levels.medium)
  ) {
    const bumped = level === levels.low ? levels.medium : levels.high;
    level = bumped;
    reasons.push(
      reason(
        signals.largeDiff,
        bumped,
        "",
        `大規模 diff: 非 NONE ${String(nonNoneFiles)} ファイル / ${String(nonNoneLines)} 行`,
      ),
    );
  }

  const critical = criticalReasons(diff);
  if (critical.length > 0) {
    level = levels.critical;
    reasons.push(...critical);
  }

  const stats = diff.files.reduce(
    (result, file) => ({
      files: result.files + 1,
      added: result.added + nonNegative(file.added),
      deleted: result.deleted + nonNegative(file.deleted),
    }),
    { files: 0, added: 0, deleted: 0 },
  );

  return { level, files, reasons: sortReasons(reasons), stats };
};

export { signals };
