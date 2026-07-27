import assert from "node:assert/strict";
import test from "node:test";
import { classes, levels } from "./classes.mjs";
import { evaluate, signals } from "./evaluate.mjs";

const change = ({
  path,
  status = "M",
  oldPath = "",
  added = 1,
  deleted = 1,
}) => ({ path, status, oldPath, added, deleted });

const diff = ({ files, addedLines = {}, removedLines = {} }) => ({
  files,
  addedLines: new Map(Object.entries(addedLines)),
  removedLines: new Map(Object.entries(removedLines)),
});

const hasSignal = (report, signal) =>
  report.reasons.some((item) => item.signal === signal);

test("一般文書だけなら none", () => {
  const report = evaluate(
    diff({ files: [change({ path: "README.md", status: "M" })] }),
  );
  assert.equal(report.level, levels.none);
  assert.equal(report.files[0].class, classes.none);
});

test("未知 path は fail-closed で high", () => {
  const report = evaluate(
    diff({ files: [change({ path: "unknown.toml", status: "A" })] }),
  );
  assert.equal(report.level, levels.high);
  assert.equal(report.files[0].class, classes.unknown);
  assert.equal(hasSignal(report, signals.unclassified), true);
});

test("rename は新旧 path の重い方を採用する", () => {
  const report = evaluate(
    diff({
      files: [
        change({
          path: "docs/auth-notes.md",
          oldPath: "workers/src/auth.ts",
          status: "R",
        }),
      ],
    }),
  );
  assert.equal(report.level, levels.high);
  assert.equal(report.files[0].class, classes.high);
  assert.equal(report.files[0].rule, "worker-auth");
});

test("未分類の rename 元は fail-closed で high", () => {
  const report = evaluate(
    diff({
      files: [
        change({
          path: "docs/security.md",
          oldPath: "unknown-security.toml",
          status: "R",
        }),
      ],
    }),
  );
  assert.equal(report.level, levels.high);
  assert.equal(report.files[0].class, classes.unknown);
  assert.equal(report.files[0].rule, "unclassified");
  assert.equal(hasSignal(report, signals.unclassified), true);
});

test("テスト削除・skip 追加・fixture 削除は critical", () => {
  const report = evaluate(
    diff({
      files: [
        change({ path: "src/lib/auth.test.ts", status: "D" }),
        change({ path: "src/lib/new.test.ts", status: "A" }),
        change({ path: "e2e/fixtures/auth.ts", status: "D" }),
      ],
      addedLines: {
        "src/lib/new.test.ts": ['test.skip("later", () => {});'],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testDeleted), true);
  assert.equal(hasSignal(report, signals.testDisabled), true);
  assert.equal(hasSignal(report, signals.testSupportDeleted), true);
});

test("test options の skip true は critical", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": ['test("later", { skip: true }, () => {});'],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testDisabled), true);
});

test("test options の skip string は critical", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": ['test("later", { skip: "TODO" }, () => {});'],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testDisabled), true);
});

test("複数行の test options skip は critical", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": [
          'test("later", { skip:',
          "  true }, () => {});",
        ],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testDisabled), true);
});

test("dmux lifecycle hook の変更は critical", () => {
  const report = evaluate(
    diff({
      files: [change({ path: ".dmux-hooks/worktree_created" })],
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.reviewGate), true);
});

test("test subscript の変更は critical", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "package.json" })],
      addedLines: {
        "package.json": ['"test:review-risk": "true"'],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.qualityGate), true);
});

test("workflow の yml・yaml 間 rename は critical", () => {
  const report = evaluate(
    diff({
      files: [
        change({
          path: ".github/workflows/ci.yaml",
          oldPath: ".github/workflows/ci.yml",
          status: "R",
        }),
      ],
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.workflowDeleted), true);
});

test("review-risk 自身・品質 script・既存 migration の変更は critical", () => {
  const report = evaluate(
    diff({
      files: [
        change({ path: "tools/reviewrisk/rules.mjs" }),
        change({ path: "package.json" }),
        change({ path: "workers/migrations/0001_initial.sql" }),
      ],
      addedLines: {
        "package.json": ['"test": "vitest run"'],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.riskTool), true);
  assert.equal(hasSignal(report, signals.qualityGate), true);
  assert.equal(hasSignal(report, signals.migrationRewritten), true);
});

test("認可・同期の不変条件に触れると high の理由を残す", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/domain.ts", status: "A" })],
      addedLines: {
        "src/lib/domain.ts": ["const owner = userId;", "syncQueue.push(item);"],
      },
    }),
  );
  assert.equal(report.level, levels.high);
  assert.equal(
    report.reasons.filter((item) => item.signal === signals.invariant).length,
    2,
  );
});

test("medium の大規模 diff は high に一段上げる", () => {
  const report = evaluate(
    diff({
      files: [
        change({
          path: "src/lib/confidence.ts",
          added: 801,
          deleted: 0,
        }),
      ],
    }),
  );
  assert.equal(report.level, levels.high);
  assert.equal(hasSignal(report, signals.largeDiff), true);
});

test("report の file と reason 順は決定的", () => {
  const report = evaluate(
    diff({
      files: [
        change({ path: "z-new.toml", status: "A" }),
        change({ path: "a-new.toml", status: "A" }),
      ],
    }),
  );
  assert.deepEqual(
    report.files.map(({ path }) => path),
    ["a-new.toml", "z-new.toml"],
  );
  assert.deepEqual(
    report.reasons.map(({ file }) => file),
    ["a-new.toml", "z-new.toml"],
  );
});
