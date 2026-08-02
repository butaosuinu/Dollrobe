import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { levels } from "./classes.mjs";
import {
  parseNameStatus,
  parseNumstat,
  parsePatchLines,
  readGitDiff,
} from "./diff.mjs";
import { evaluate, requiresEvaluationContents, signals } from "./evaluate.mjs";

const runGit = (cwd, args) => {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
};

const runGitWithInput = (cwd, args, input) => {
  const result = spawnSync("git", args, { cwd, encoding: null, input });
  assert.equal(result.status, 0, result.stderr?.toString("utf8"));
  return result.stdout;
};

test("name-status の追加・削除・rename を読む", () => {
  assert.deepEqual(
    parseNameStatus(
      "A\0new.ts\0D\0old.ts\0R091\0before name.ts\0after name.ts\0",
    ),
    [
      {
        status: "A",
        oldPath: "",
        path: "new.ts",
        added: 0,
        deleted: 0,
      },
      {
        status: "D",
        oldPath: "",
        path: "old.ts",
        added: 0,
        deleted: 0,
      },
      {
        status: "R",
        oldPath: "before name.ts",
        path: "after name.ts",
        added: 0,
        deleted: 0,
      },
    ],
  );
});

test("numstat の通常・tab 入り path・rename・binary を読む", () => {
  const actual = parseNumstat(
    "12\t3\tsrc/file.ts\0" +
      "4\t5\tsrc/foo\tbar.ts\0" +
      "-\t-\tpublic/image.png\0" +
      "1\t2\t\0old.ts\0new.ts\0",
  );
  assert.deepEqual(actual.get("src/file.ts"), { added: 12, deleted: 3 });
  assert.deepEqual(actual.get("src/foo\tbar.ts"), { added: 4, deleted: 5 });
  assert.deepEqual(actual.get("public/image.png"), {
    added: -1,
    deleted: -1,
  });
  assert.deepEqual(actual.get("new.ts"), { added: 1, deleted: 2 });
});

test("unified diff の hunk 本文だけを追加・削除行として読む", () => {
  const actual = parsePatchLines(
    [
      "diff --git a/file.ts b/file.ts",
      "--- a/file.ts",
      "+++ b/file.ts",
      "@@ -1 +1 @@",
      "-old line",
      "+new line",
      "@@ -5,0 +6 @@",
      "+++ content beginning with plus",
      "",
    ].join("\n"),
  );
  assert.deepEqual(actual, {
    added: ["new line", "++ content beginning with plus"],
    removed: ["old line"],
  });
});

test("diff 属性で無効化されたテキストも本文を読む", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-diff-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);
  writeFileSync(join(cwd, ".gitattributes"), "package.json -diff\n");
  writeFileSync(
    join(cwd, "package.json"),
    '{\n  "scripts": {\n    "test": "node --test"\n  }\n}\n',
  );
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(join(cwd, "package.json"), '{\n  "scripts": {}\n}\n');

  const actual = readGitDiff({ base: "HEAD", cwd });
  assert.equal(
    actual.removedLines
      .get("package.json")
      ?.includes('    "test": "node --test"'),
    true,
  );
  assert.equal(
    actual.addedLines.get("package.json")?.includes('  "scripts": {}'),
    true,
  );
  const report = evaluate(actual);
  assert.equal(report.level, levels.critical);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.qualityGate),
    true,
  );
});

test("JSON escape された品質 script key の上書きは critical", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-package-json-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);
  writeFileSync(
    join(cwd, "package.json"),
    '{\n  "scripts": {\n    "test": "node --test"\n  }\n}\n',
  );
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(
    join(cwd, "package.json"),
    '{\n  "scripts": {\n    "test": "node --test",\n    "\\u0074est": "echo disabled"\n  }\n}\n',
  );

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: requiresEvaluationContents,
  });
  assert.match(actual.afterContents.get("package.json") ?? "", /\\u0074est/);
  const report = evaluate(actual);
  assert.equal(report.level, levels.critical);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.qualityGate),
    true,
  );
});

test("pathspec magic で始まるファイルも literal path として読む", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-literal-path-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);
  runGit(cwd, ["commit", "--quiet", "--allow-empty", "-m", "initial"]);

  const path = ":(exclude)*.test.mjs";
  const skippedTest = 'test.skip("later", () => {});';
  writeFileSync(join(cwd, path), `${skippedTest}\n`);
  runGit(cwd, ["--literal-pathspecs", "add", path]);
  runGit(cwd, ["commit", "--quiet", "-m", "add magic path"]);

  const actual = readGitDiff({ base: "HEAD^", cwd });
  assert.equal(actual.addedLines.get(path)?.includes(skippedTest), true);
  const report = evaluate(actual);
  assert.equal(report.level, levels.critical);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDisabled),
    true,
  );
});

test("tab を含む path の行数で大規模 diff を判定する", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-tab-path-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);
  runGit(cwd, ["commit", "--quiet", "--allow-empty", "-m", "initial"]);

  const path = "src/lib/foo\tbar.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  const lines = Array.from(
    { length: 801 },
    (_, index) => `export const value${String(index)} = ${String(index)};`,
  );
  writeFileSync(join(cwd, path), `${lines.join("\n")}\n`);
  runGit(cwd, ["--literal-pathspecs", "add", path]);
  runGit(cwd, ["commit", "--quiet", "-m", "add tab path"]);

  const actual = readGitDiff({ base: "HEAD^", cwd });
  assert.equal(
    actual.files.find((file) => file.path === path)?.added,
    lines.length,
  );
  const report = evaluate(actual);
  assert.equal(report.level, levels.high);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.largeDiff),
    true,
  );
});

test("非 UTF-8 path でも blob OID から patch 本文を読む", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-byte-path-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);
  runGit(cwd, ["commit", "--quiet", "--allow-empty", "-m", "initial"]);

  const path = "src/lib/%FF.test.ts";
  const rawPath = Buffer.concat([
    Buffer.from("src/lib/"),
    Buffer.from([0xff]),
    Buffer.from(".test.ts"),
  ]);
  const skippedTest = 'test.skip("later", () => {});';
  const blobOid = runGitWithInput(
    cwd,
    ["hash-object", "-w", "--stdin"],
    Buffer.from(`${skippedTest}\n`),
  )
    .toString("ascii")
    .trim();
  const indexEntry = Buffer.concat([
    Buffer.from(`100644 ${blobOid}\t`),
    rawPath,
    Buffer.from([0]),
  ]);
  runGitWithInput(cwd, ["update-index", "-z", "--index-info"], indexEntry);
  runGit(cwd, ["commit", "--quiet", "-m", "add byte path"]);
  runGitWithInput(
    cwd,
    ["update-index", "--skip-worktree", "-z", "--stdin"],
    Buffer.concat([rawPath, Buffer.from([0])]),
  );

  const actual = readGitDiff({ base: "HEAD^", cwd });
  assert.equal(actual.addedLines.get(path)?.includes(skippedTest), true);
  const report = evaluate(actual);
  assert.equal(report.level, levels.critical);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDisabled),
    true,
  );
});

test("UTF-8 の %XX path と非 UTF-8 byte path を一意に読む", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-distinct-byte-path-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);
  runGit(cwd, ["commit", "--quiet", "--allow-empty", "-m", "initial"]);

  const utf8Path = Buffer.from("src/lib/%FF.test.ts");
  const bytePath = Buffer.concat([
    Buffer.from("src/lib/"),
    Buffer.from([0xff]),
    Buffer.from(".test.ts"),
  ]);
  const skippedTest = 'test.skip("later", () => {});';
  const enabledTest = 'test("enabled", () => {});';
  const skippedOid = runGitWithInput(
    cwd,
    ["hash-object", "-w", "--stdin"],
    Buffer.from(`${skippedTest}\n`),
  )
    .toString("ascii")
    .trim();
  const enabledOid = runGitWithInput(
    cwd,
    ["hash-object", "-w", "--stdin"],
    Buffer.from(`${enabledTest}\n`),
  )
    .toString("ascii")
    .trim();
  const indexEntries = Buffer.concat([
    Buffer.from(`100644 ${skippedOid}\t`),
    utf8Path,
    Buffer.from([0]),
    Buffer.from(`100644 ${enabledOid}\t`),
    bytePath,
    Buffer.from([0]),
  ]);
  runGitWithInput(cwd, ["update-index", "-z", "--index-info"], indexEntries);
  runGit(cwd, ["commit", "--quiet", "-m", "add distinct byte paths"]);
  runGitWithInput(
    cwd,
    ["update-index", "--skip-worktree", "-z", "--stdin"],
    Buffer.concat([utf8Path, Buffer.from([0]), bytePath, Buffer.from([0])]),
  );

  const actual = readGitDiff({ base: "HEAD^", cwd });
  assert.equal(
    actual.addedLines.get("src/lib/%25FF.test.ts")?.includes(skippedTest),
    true,
  );
  assert.equal(
    actual.addedLines.get("src/lib/%FF.test.ts")?.includes(enabledTest),
    true,
  );
  const report = evaluate(actual);
  assert.equal(report.level, levels.critical);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDisabled),
    true,
  );
});

test("working tree の % path は実 path から本文を読む", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-percent-path-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const gitPath = "src/lib/%FF.test.ts";
  const reportPath = "src/lib/%25FF.test.ts";
  const skippedTest = 'test.skip("later", () => {});';
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(join(cwd, gitPath), 'test("enabled", () => {});\n');
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(join(cwd, gitPath), `${skippedTest}\n`);

  const actual = readGitDiff({ base: "HEAD", cwd });
  assert.equal(actual.addedLines.get(reportPath)?.includes(skippedTest), true);
  const report = evaluate(actual);
  assert.equal(report.level, levels.critical);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDisabled),
    true,
  );
});

test("staged rename 後の unstaged edit を working tree から読む", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-worktree-rename-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const oldPath = "src/lib/before.test.ts";
  const path = "src/lib/after.test.ts";
  const skippedTest = 'test.skip("later", () => {});';
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(join(cwd, oldPath), 'test("enabled", () => {});\n');
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  runGit(cwd, ["mv", oldPath, path]);
  writeFileSync(join(cwd, path), `${skippedTest}\n`);

  const actual = readGitDiff({ base: "HEAD", cwd });
  assert.equal(actual.addedLines.get(path)?.includes(skippedTest), true);
  const report = evaluate(actual);
  assert.equal(report.level, levels.critical);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDisabled),
    true,
  );
});

test("条件式だけの変更は test source として解析しない", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-condition-only-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "src/lib/condition.test.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(
    join(cwd, path),
    'const disabled = false;\ntest.skipIf(disabled)("later", fn);\n',
  );
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(
    join(cwd, path),
    'const disabled = true;\ntest.skipIf(disabled)("later", fn);\n',
  );

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: requiresEvaluationContents,
  });
  assert.equal(actual.beforeContents.has(path), false);
  assert.equal(actual.afterContents.has(path), false);
  const report = evaluate(actual);
  assert.equal(report.level, levels.low);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDisabled),
    false,
  );
});

test("test file の regular file から symlink への type change は critical", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-test-type-change-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "src/lib/removed.test.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(join(cwd, path), 'test("enabled", () => {});\n');
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  rmSync(join(cwd, path));
  symlinkSync("missing-target", join(cwd, path));

  const actual = readGitDiff({ base: "HEAD", cwd });
  const changedFile = actual.files.find((file) => file.path === path);
  assert.equal(changedFile?.status, "T");
  assert.equal(changedFile?.oldMode, "100644");
  assert.equal(changedFile?.newMode, "120000");
  const report = evaluate(actual);
  assert.equal(report.level, levels.critical);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDeleted),
    true,
  );
});

test("test support の本文は評価文脈として読まない", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-empty-test-support-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "src/test/setup.ts";
  mkdirSync(join(cwd, "src/test"), { recursive: true });
  writeFileSync(join(cwd, path), "installTestHarness();\n");
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(join(cwd, path), "// disabled\n");

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: requiresEvaluationContents,
  });
  assert.equal(actual.beforeContents.has(path), false);
  assert.equal(actual.afterContents.has(path), false);
  const report = evaluate(actual);
  assert.equal(report.level, levels.low);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testSupportDeleted),
    false,
  );
});

test("workflow の YAML 本文は評価文脈として読まない", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-empty-workflow-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = ".github/workflows/ci.yml";
  mkdirSync(join(cwd, ".github/workflows"), { recursive: true });
  writeFileSync(
    join(cwd, path),
    "on: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n",
  );
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(join(cwd, path), "# disabled temporarily\n");

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: requiresEvaluationContents,
  });
  assert.equal(actual.beforeContents.has(path), false);
  assert.equal(actual.afterContents.has(path), false);
  const report = evaluate(actual);
  assert.equal(report.level, levels.high);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.workflowDeleted),
    false,
  );
});

test("test file の通常行削除は test case として解析しない", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-test-deletion-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "e2e/settings.spec.ts";
  mkdirSync(join(cwd, "e2e"), { recursive: true });
  writeFileSync(
    join(cwd, path),
    'test("removed", fn);\ntest("remaining", fn);\n',
  );
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(join(cwd, path), 'test("remaining", fn);\n');

  const actual = readGitDiff({ base: "HEAD", cwd });
  const report = evaluate(actual);
  assert.equal(report.level, levels.low);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDeleted),
    false,
  );
});

test("patch 読み取り上限の超過は fail-closed で critical", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-large-patch-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);
  runGit(cwd, ["commit", "--quiet", "--allow-empty", "-m", "initial"]);

  const path = "src/lib/large.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(join(cwd, path), `${"x".repeat(4096)}\n`);
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "add large patch"]);

  const actual = readGitDiff({
    base: "HEAD^",
    cwd,
    maxPatchBytes: 1024,
  });
  assert.equal(actual.unreadablePaths.has(path), true);
  const report = evaluate(actual);
  assert.equal(report.level, levels.critical);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.patchUnreadable),
    true,
  );
});
