import assert from "node:assert/strict";
import test from "node:test";
import { classes, levels } from "./classes.mjs";
import { evaluate, requiresEvaluationContents, signals } from "./evaluate.mjs";

const change = ({
  path,
  status = "M",
  oldPath = "",
  oldMode = "100644",
  newMode = "100644",
  added = 1,
  deleted = 1,
}) => ({
  path,
  status,
  oldPath,
  oldMode,
  newMode,
  added,
  deleted,
});

const diff = ({
  files,
  addedLines = {},
  removedLines = {},
  beforeContents = {},
  afterContents = {},
  unreadablePaths = [],
}) => ({
  files,
  addedLines: new Map(Object.entries(addedLines)),
  removedLines: new Map(Object.entries(removedLines)),
  beforeContents: new Map(Object.entries(beforeContents)),
  afterContents: new Map(Object.entries(afterContents)),
  unreadablePaths: new Set(unreadablePaths),
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
  assert.equal(report.files[0].class, classes.unknown);
  assert.equal(hasSignal(report, signals.unclassified), true);
});

test("同率 high でも未分類の rename 元を優先する", () => {
  const report = evaluate(
    diff({
      files: [
        change({
          path: "workers/src/auth.ts",
          oldPath: "mystery.toml",
          status: "R",
        }),
      ],
    }),
  );
  assert.equal(report.files[0].class, classes.unknown);
  assert.equal(report.files[0].rule, "unclassified");
});

test("test file の削除・suffix 喪失・type change は critical", () => {
  for (const file of [
    change({ path: "src/lib/auth.test.ts", status: "D" }),
    change({
      path: "src/lib/auth.ts",
      oldPath: "src/lib/auth.test.ts",
      status: "R",
    }),
    change({
      path: "src/lib/auth.test.ts",
      status: "T",
      oldMode: "100644",
      newMode: "120000",
    }),
  ]) {
    const report = evaluate(diff({ files: [file] }));
    assert.equal(report.level, levels.critical, file.path);
    assert.equal(hasSignal(report, signals.testDeleted), true, file.path);
  }
});

test("test source の変更内容は test case として解析しない", () => {
  const path = "src/lib/auth.test.ts";
  const report = evaluate(
    diff({
      files: [change({ path })],
      addedLines: {
        [path]: ['test("remaining", fn);', "const enabled = true;"],
      },
      removedLines: {
        [path]: ['test("removed", fn);', "const enabled = false;"],
      },
      beforeContents: { [path]: 'test("removed", fn);' },
      afterContents: { [path]: 'test("remaining", fn);' },
    }),
  );
  assert.equal(report.level, levels.low);
  assert.equal(hasSignal(report, signals.testDeleted), false);
  assert.equal(hasSignal(report, signals.testDisabled), false);
});

test("test support の削除・rename・type change は critical", () => {
  for (const file of [
    change({ path: "src/test/setup.ts", status: "D" }),
    change({
      path: "e2e/helpers/setup.ts",
      oldPath: "src/test/setup.ts",
      status: "R",
    }),
    change({
      path: "vitest.config.ts",
      status: "T",
      oldMode: "100644",
      newMode: "120000",
    }),
  ]) {
    const report = evaluate(diff({ files: [file] }));
    assert.equal(report.level, levels.critical, file.path);
    assert.equal(
      hasSignal(report, signals.testSupportDeleted),
      true,
      file.path,
    );
  }
});

test("test support の本文は解析しない", () => {
  const path = "src/test/setup.ts";
  const report = evaluate(
    diff({
      files: [change({ path })],
      addedLines: { [path]: ["// setup disabled"] },
      removedLines: { [path]: ["setupMocks();"] },
      beforeContents: { [path]: "setupMocks();\n" },
      afterContents: { [path]: "// setup disabled\n" },
    }),
  );
  assert.equal(report.level, levels.low);
  assert.equal(hasSignal(report, signals.testSupportDeleted), false);
});

test("test file の追加行に disable・focus marker があれば critical", () => {
  const lines = [
    'test.skip("later", fn);',
    'test?.only("focused", fn);',
    'test["todo"]("later", fn);',
    'test.fixme("later", fn);',
    'test.skipIf(condition)("later", fn);',
    'test.runIf(condition)("focused", fn);',
    'xit("later", fn);',
    'fdescribe("focused", fn);',
    'test("later", { skip: true }, fn);',
    'test("later", { "only": condition }, fn);',
    'skip("later", fn);',
  ];
  for (const line of lines) {
    const path = "src/lib/new.test.ts";
    const report = evaluate(
      diff({
        files: [change({ path, status: "A" })],
        addedLines: { [path]: [line] },
      }),
    );
    assert.equal(report.level, levels.critical, line);
    assert.equal(hasSignal(report, signals.testDisabled), true, line);
  }
});

test("comment-only line の marker は無視する", () => {
  const path = "src/lib/new.test.ts";
  for (const line of [
    '// test.skip("later", fn);',
    '/* test.only("later", fn); */',
    '* test.todo("later", fn);',
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path })],
        addedLines: { [path]: [line] },
      }),
    );
    assert.equal(hasSignal(report, signals.testDisabled), false, line);
  }
});

test("option の skip false は disable marker として扱わない", () => {
  const path = "src/lib/new.test.ts";
  const report = evaluate(
    diff({
      files: [change({ path })],
      addedLines: { [path]: ['test("enabled", { skip: false }, fn);'] },
    }),
  );
  assert.equal(report.level, levels.low);
  assert.equal(hasSignal(report, signals.testDisabled), false);
});

test("alias・scope・条件式の意味は追跡しない", () => {
  const path = "src/lib/new.test.ts";
  const report = evaluate(
    diff({
      files: [change({ path })],
      addedLines: {
        [path]: [
          'import { test as check } from "vitest";',
          "const disabled = true;",
          'check("later", fn);',
        ],
      },
      removedLines: { [path]: ["const disabled = false;"] },
    }),
  );
  assert.equal(report.level, levels.low);
  assert.equal(hasSignal(report, signals.testDisabled), false);
});

test("review gate と review-risk 自身の変更は critical", () => {
  for (const file of [
    change({ path: ".claude/settings.json" }),
    change({ path: ".claude/scripts/check.sh" }),
    change({ path: ".claude/skills/code-review/SKILL.md" }),
    change({ path: ".dmux-hooks/run_test" }),
    change({ path: "tools/reviewrisk/rules.mjs" }),
    change({ path: "docs/review-risk.ja.md" }),
  ]) {
    const report = evaluate(diff({ files: [file] }));
    assert.equal(report.level, levels.critical, file.path);
    assert.equal(
      hasSignal(report, signals.reviewGate) ||
        hasSignal(report, signals.riskTool),
      true,
      file.path,
    );
  }
});

test("通常の dmux hook は review gate として扱わない", () => {
  const report = evaluate(
    diff({ files: [change({ path: ".dmux-hooks/README.md" })] }),
  );
  assert.equal(report.level, levels.none);
  assert.equal(hasSignal(report, signals.reviewGate), false);
});

test("workflow の削除・対象外移動・拡張子変更・type change は critical", () => {
  for (const file of [
    change({ path: ".github/workflows/ci.yml", status: "D" }),
    change({
      path: ".github/workflows/disabled/ci.yml",
      oldPath: ".github/workflows/ci.yml",
      status: "R",
    }),
    change({
      path: ".github/workflows/ci.yaml",
      oldPath: ".github/workflows/ci.yml",
      status: "R",
    }),
    change({
      path: ".github/workflows/ci.yml",
      status: "T",
      oldMode: "100644",
      newMode: "120000",
    }),
  ]) {
    const report = evaluate(diff({ files: [file] }));
    assert.equal(report.level, levels.critical, file.path);
    assert.equal(hasSignal(report, signals.workflowDeleted), true, file.path);
  }
});

test("workflow の YAML 本文は解析しない", () => {
  const path = ".github/workflows/ci.yml";
  const report = evaluate(
    diff({
      files: [change({ path })],
      addedLines: { [path]: ["# disabled"] },
      removedLines: { [path]: ["jobs:"] },
      beforeContents: { [path]: "on: push\njobs:\n" },
      afterContents: { [path]: "# disabled\n" },
    }),
  );
  assert.equal(report.level, levels.high);
  assert.equal(hasSignal(report, signals.workflowDeleted), false);
});

test("評価に全文が必要なのは package.json だけ", () => {
  assert.equal(requiresEvaluationContents("package.json"), true);
  assert.equal(requiresEvaluationContents("src/lib/auth.test.ts"), false);
  assert.equal(requiresEvaluationContents(".github/workflows/ci.yml"), false);
  assert.equal(requiresEvaluationContents("src/test/setup.ts"), false);
});

test("package.json の品質 script 変更は critical", () => {
  for (const name of [
    "test",
    "test:workers",
    "build",
    "build:workers",
    "typecheck",
    "lint",
    "format:check",
    "precheck",
    "precheck:full",
    "review-risk",
  ]) {
    const before = { scripts: { [name]: "command one" } };
    const after = { scripts: { [name]: "command two" } };
    const report = evaluate(
      diff({
        files: [change({ path: "package.json" })],
        beforeContents: { "package.json": JSON.stringify(before) },
        afterContents: { "package.json": JSON.stringify(after) },
      }),
    );
    assert.equal(report.level, levels.critical, name);
    assert.equal(hasSignal(report, signals.qualityGate), true, name);
  }
});

test("package.json の無関係な script 変更は class H の high", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "package.json" })],
      beforeContents: {
        "package.json": JSON.stringify({ scripts: { dev: "next dev" } }),
      },
      afterContents: {
        "package.json": JSON.stringify({
          scripts: { dev: "next dev -p 3001" },
        }),
      },
    }),
  );
  assert.equal(report.level, levels.high);
  assert.equal(hasSignal(report, signals.qualityGate), false);
});

test("scripts container の追加・削除・型変更は critical", () => {
  for (const [before, after] of [
    [{ name: "app" }, { name: "app", scripts: {} }],
    [{ scripts: {} }, {}],
    [{ scripts: {} }, { scripts: [] }],
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path: "package.json" })],
        beforeContents: { "package.json": JSON.stringify(before) },
        afterContents: { "package.json": JSON.stringify(after) },
      }),
    );
    assert.equal(report.level, levels.critical);
    assert.equal(hasSignal(report, signals.qualityGate), true);
  }
});

test("package.json の不正 JSON は fail-closed で critical", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "package.json" })],
      beforeContents: { "package.json": '{ "scripts": {} }' },
      afterContents: { "package.json": "{" },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.qualityGate), true);
});

test("package.json の削除・対象外移動・type change は critical", () => {
  for (const file of [
    change({ path: "package.json", status: "D" }),
    change({
      path: "package-old.json",
      oldPath: "package.json",
      status: "R",
    }),
    change({
      path: "package.json",
      status: "T",
      oldMode: "100644",
      newMode: "120000",
    }),
  ]) {
    const report = evaluate(diff({ files: [file] }));
    assert.equal(report.level, levels.critical, file.path);
    assert.equal(hasSignal(report, signals.qualityGate), true, file.path);
  }
});

test("変更行しかない package.json でも品質 key を検出する", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "package.json" })],
      addedLines: { "package.json": ['"test:workers": "disabled"'] },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.qualityGate), true);
});

test("既存 migration の変更・rename は critical", () => {
  for (const file of [
    change({ path: "workers/migrations/0001_initial.sql" }),
    change({ path: "workers/migrations/0001_initial.sql", status: "D" }),
    change({
      path: "scripts/archived.sql",
      oldPath: "workers/migrations/0001_initial.sql",
      status: "R",
    }),
  ]) {
    const report = evaluate(diff({ files: [file] }));
    assert.equal(report.level, levels.critical, file.path);
    assert.equal(
      hasSignal(report, signals.migrationRewritten),
      true,
      file.path,
    );
  }
});

test("新規 migration は class H の high", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "workers/migrations/0017_new.sql", status: "A" })],
    }),
  );
  assert.equal(report.level, levels.high);
  assert.equal(hasSignal(report, signals.migrationRewritten), false);
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
      files: [change({ path: "src/lib/domain.ts", added: 801, deleted: 0 })],
    }),
  );
  assert.equal(report.level, levels.high);
  assert.equal(hasSignal(report, signals.largeDiff), true);
});

test("patch または必要文脈が読めなければ fail-closed", () => {
  const path = "src/lib/domain.ts";
  const report = evaluate(
    diff({
      files: [change({ path })],
      unreadablePaths: [path],
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.patchUnreadable), true);
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
