import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  parseNameStatus,
  parseNumstat,
  parsePatchLines,
  readGitDiff,
} from "./diff.mjs";
import { evaluate, signals } from "./evaluate.mjs";
import { levels } from "./classes.mjs";
import { isTestFile } from "./rules.mjs";

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
    includeContents: (path) => path === "package.json" || isTestFile(path),
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

test("変更行外の skip key と変更後の値を合わせて判定する", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-skip-context-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "src/lib/context.test.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(
    join(cwd, path),
    'test("later", {\n  skip:\n    false,\n}, () => {});\n',
  );
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(
    join(cwd, path),
    'test("later", {\n  skip:\n    true,\n}, () => {});\n',
  );

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: isTestFile,
  });
  assert.deepEqual(actual.addedLines.get(path), ["    true,"]);
  assert.match(actual.beforeContents.get(path) ?? "", /skip:\n    false/);
  assert.match(actual.afterContents.get(path) ?? "", /skip:\n    true/);
  const report = evaluate(actual);
  assert.equal(report.level, levels.critical);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDisabled),
    true,
  );
});

test("skipIf の条件だけを false から true にした変更は critical", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-skip-if-context-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "src/lib/conditional.test.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(
    join(cwd, path),
    'test.skipIf(\n  false\n)("later", () => {});\n',
  );
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(
    join(cwd, path),
    'test.skipIf(\n  true\n)("later", () => {});\n',
  );

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: isTestFile,
  });
  assert.deepEqual(actual.addedLines.get(path), ["  true"]);
  const report = evaluate(actual);
  assert.equal(report.level, levels.critical);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDisabled),
    true,
  );
});

test("runIf の条件だけを true から false にした変更は critical", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-run-if-context-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "src/lib/run-if.test.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(join(cwd, path), 'test.runIf(true)("later", fn);\n');
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(join(cwd, path), 'test.runIf(false)("later", fn);\n');

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: isTestFile,
  });
  const report = evaluate(actual);
  assert.equal(report.level, levels.critical);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDisabled),
    true,
  );
});

test("既存の test skip の空白整形は新規無効化として扱わない", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-skip-format-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "src/lib/formatted.test.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(join(cwd, path), 'test.skip("later",()=>{});\n');
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(join(cwd, path), 'test.skip("later", () => {});\n');

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: isTestFile,
  });
  assert.match(actual.addedLines.get(path)?.[0] ?? "", /test\.skip/);
  const report = evaluate(actual);
  assert.equal(report.level, levels.low);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDisabled),
    false,
  );
});

test("skip 済み test・suite のタイトル変更は新規無効化として扱わない", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-skip-title-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "src/lib/title.test.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(
    join(cwd, path),
    'describe("old suite", () => { test.skip("old title", fn); });\n',
  );
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(
    join(cwd, path),
    'describe("new suite", () => { test.skip("new title", fn); });\n',
  );

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: isTestFile,
  });
  const report = evaluate(actual);
  assert.equal(report.level, levels.low);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDisabled),
    false,
  );
});

test("test file 内の test case 削除は critical", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-test-case-delete-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "src/lib/authorization.test.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(
    join(cwd, path),
    'test("authorization boundary", authFn);\n' +
      'test("ordinary behavior", ordinaryFn);\n',
  );
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(join(cwd, path), 'test("ordinary behavior", ordinaryFn);\n');

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: isTestFile,
  });
  const report = evaluate(actual);
  assert.equal(report.level, levels.critical);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDeleted),
    true,
  );
});

test("既存 test case の suite 間移動は削除として扱わない", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-test-case-move-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "src/lib/moved-case.test.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(join(cwd, path), 'test("same", shared);\n');
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(
    join(cwd, path),
    'describe("new suite", () => { test("same", shared); });\n',
  );

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: isTestFile,
  });
  const report = evaluate(actual);
  assert.equal(report.level, levels.low);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDeleted),
    false,
  );
});

test("test から it への同義置換は削除として扱わない", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-test-it-alias-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "src/lib/root-alias.test.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(join(cwd, path), 'test("same case", sharedFn);\n');
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(join(cwd, path), 'it("same case", sharedFn);\n');

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: isTestFile,
  });
  const report = evaluate(actual);
  assert.equal(report.level, levels.low);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDeleted),
    false,
  );
});

test("既存の skip 済み test の並び替えは新規無効化として扱わない", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-skip-move-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "src/lib/moved.test.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(
    join(cwd, path),
    'test.skip("later", skippedFn);\ntest("other", enabledFn);\n',
  );
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(
    join(cwd, path),
    'test("other", enabledFn);\ntest.skip("later", skippedFn);\n',
  );

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: isTestFile,
  });
  const report = evaluate(actual);
  assert.equal(report.level, levels.low);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDisabled),
    false,
  );
});

test("skip 済み suite の並び替えは新規無効化として扱わない", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-suite-move-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "src/lib/moved-suite.test.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(
    join(cwd, path),
    'describe("A", () => { test.skip("same", shared); });\n' +
      'describe("B", () => { test("same", shared); });\n',
  );
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(
    join(cwd, path),
    'describe("B", () => { test("same", shared); });\n' +
      'describe("A", () => { test.skip("same", shared); });\n',
  );

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: isTestFile,
  });
  const report = evaluate(actual);
  assert.equal(report.level, levels.low);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDisabled),
    false,
  );
});

test("suite 並び替え時の別 suite への skip 移動は critical", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-suite-skip-swap-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "src/lib/swapped-suite-skip.test.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(
    join(cwd, path),
    'describe("A", () => { test.skip("same", shared); });\n' +
      'describe("B", () => { test("same", shared); });\n',
  );
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(
    join(cwd, path),
    'describe("B", () => { test.skip("same", shared); });\n' +
      'describe("A", () => { test("same", shared); });\n',
  );

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: isTestFile,
  });
  const report = evaluate(actual);
  assert.equal(report.level, levels.critical);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDisabled),
    true,
  );
});

test("同じ位置に移った別 test の skip は critical", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-same-position-skip-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "src/lib/same-position.test.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(join(cwd, path), 'test.skip("A", fnA);\ntest("B", fnB);\n');
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(join(cwd, path), 'test.skip("B", fnB);\ntest("A", fnA);\n');

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: isTestFile,
  });
  const report = evaluate(actual);
  assert.equal(report.level, levels.critical);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDisabled),
    true,
  );
});

test("同名で callback が異なる test の skip 差し替えは critical", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-same-title-skip-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "src/lib/same-title.test.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(
    join(cwd, path),
    'test.skip("same", fnA);\ntest("same", fnB);\n',
  );
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(
    join(cwd, path),
    'test.skip("same", fnB);\ntest("same", fnA);\n',
  );

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: isTestFile,
  });
  const report = evaluate(actual);
  assert.equal(report.level, levels.critical);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDisabled),
    true,
  );
});

test("skip を別の test へ差し替えた変更は critical", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-skip-replaced-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "src/lib/replaced.test.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(
    join(cwd, path),
    'test.skip("old", () => {});\ntest("new", () => {});\n',
  );
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(
    join(cwd, path),
    'test("old", () => {});\ntest.skip("new", () => {});\n',
  );

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: isTestFile,
  });
  const report = evaluate(actual);
  assert.equal(report.level, levels.critical);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDisabled),
    true,
  );
});

test("同名 test の suite 間 skip 差し替えは critical", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "review-risk-same-name-skip-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));
  runGit(cwd, ["init", "--quiet"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Review Risk Test"]);

  const path = "src/lib/same-name.test.ts";
  mkdirSync(join(cwd, "src/lib"), { recursive: true });
  writeFileSync(
    join(cwd, path),
    [
      'describe("first", () => { test.skip("same", () => {}); });',
      'describe("second", () => { test("same", () => {}); });',
      "",
    ].join("\n"),
  );
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "--quiet", "-m", "initial"]);
  writeFileSync(
    join(cwd, path),
    [
      'describe("first", () => { test("same", () => {}); });',
      'describe("second", () => { test.skip("same", () => {}); });',
      "",
    ].join("\n"),
  );

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: isTestFile,
  });
  const report = evaluate(actual);
  assert.equal(report.level, levels.critical);
  assert.equal(
    report.reasons.some(({ signal }) => signal === signals.testDisabled),
    true,
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

  const actual = readGitDiff({
    base: "HEAD",
    cwd,
    includeContents: isTestFile,
  });
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
