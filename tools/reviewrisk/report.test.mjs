import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";
import { classes, levels } from "./classes.mjs";
import { parseArgs, run } from "./main.mjs";
import {
  markdownByteLimit,
  renderJson,
  renderMarkdown,
  renderText,
  reviewRiskMarker,
} from "./report.mjs";

const sample = {
  level: levels.high,
  files: [
    {
      path: "workers/src/repositories/garment-repository.ts",
      status: "M",
      class: classes.high,
      level: levels.high,
      rule: "worker-repository",
      note: "userId scoped D1 access",
    },
  ],
  reasons: [
    {
      signal: "S10-invariant-hit",
      level: levels.high,
      file: "workers/src/repositories/garment-repository.ts",
      detail: "ドメイン・運用不変条件 userId に接触",
    },
  ],
  stats: { files: 1, added: 8, deleted: 2 },
};

test("Markdown は sticky marker・理由・折り畳み table を含む", () => {
  const markdown = renderMarkdown(sample);
  assert.equal(markdown.startsWith(`${reviewRiskMarker}\n`), true);
  assert.match(markdown, /## Review risk: \*\*HIGH\*\*/);
  assert.match(markdown, /S10-invariant-hit/);
  assert.match(markdown, /<details><summary>ファイル別クラス/);
  assert.match(markdown, /worker-repository/);
  assert.match(markdown, /docs\/review-risk\.ja\.md/);
});

test("Markdown に埋め込む path を無害化する", () => {
  const maliciousPath =
    "evil`\r\n</details>\n## Review risk: **NONE**|<script>&\u202E";
  const report = {
    ...sample,
    files: [{ ...sample.files[0], path: maliciousPath }],
    reasons: [{ ...sample.reasons[0], file: maliciousPath }],
  };
  const markdown = renderMarkdown(report);
  const lines = markdown.split("\n");
  assert.deepEqual(
    lines.filter((line) => line.startsWith("## Review risk:")),
    ["## Review risk: **HIGH**"],
  );
  assert.deepEqual(
    lines.filter((line) => line === "</details>"),
    ["</details>"],
  );
  assert.match(markdown, /\[U\+0060\]/);
  assert.match(markdown, /\[U\+000D\]\[U\+000A\]/);
  assert.match(markdown, /\[U\+007C\]/);
  assert.match(markdown, /\[U\+003C\]script\[U\+003E\]/);
  assert.match(markdown, /\[U\+0026\]/);
  assert.match(markdown, /\[U\+202E\]/);
  assert.equal(markdown.includes("\u202E"), false);
});

test("Markdown に埋め込む reason detail を無害化する", () => {
  const maliciousDetail =
    'test 無効化 marker: test.skip("x", fn); // <!--\n## Review risk: **NONE**\n[link](https://example.com)<script>\u202E';
  const report = {
    ...sample,
    reasons: [{ ...sample.reasons[0], detail: maliciousDetail }],
  };
  const markdown = renderMarkdown(report);
  assert.deepEqual(
    markdown.split("\n").filter((line) => line.startsWith("## Review risk:")),
    ["## Review risk: **HIGH**"],
  );
  assert.equal(markdown.match(/<!--/gu)?.length, 1);
  assert.equal(markdown.includes("[link](https://example.com)"), false);
  assert.equal(markdown.includes("<script>"), false);
  assert.equal(markdown.includes("\u202E"), false);
  assert.match(markdown, /\[U\+003C\]\[U\+0021\]--/);
  assert.match(markdown, /\[U\+005B\]link\[U\+005D\]/);
});

test("大規模 diff の Markdown を上限内で省略する", () => {
  const files = Array.from({ length: 500 }, (_, index) => ({
    ...sample.files[0],
    path: `src/${String(index).padStart(3, "0")}-${"x".repeat(100)}.ts`,
  }));
  const reasons = files.map((file) => ({
    ...sample.reasons[0],
    file: file.path,
  }));
  const markdown = renderMarkdown({
    ...sample,
    files,
    reasons,
    stats: { files: files.length, added: 500, deleted: 0 },
  });

  assert.ok(Buffer.byteLength(markdown, "utf8") <= markdownByteLimit);
  assert.match(markdown, /ほか \d+ 件の理由を省略/);
  assert.match(markdown, /ほか \d+ files を省略/);
  assert.match(markdown, /<\/details>/);
});

test("text は headline・stats・file を含む", () => {
  const text = renderText(sample);
  assert.match(text, /Review risk: HIGH/);
  assert.match(text, /1 files, \+8 −2/);
  assert.match(text, /garment-repository\.ts/);
});

test("text に埋め込む path の制御文字を無害化する", () => {
  const maliciousPath = "src/\u001b[2J\n\u0007\u009B8;;\u2066evil.test.ts";
  const report = {
    ...sample,
    files: [{ ...sample.files[0], path: maliciousPath }],
    reasons: [{ ...sample.reasons[0], file: maliciousPath }],
  };
  const text = renderText(report);
  assert.equal(text.includes("\u001b"), false);
  assert.equal(text.includes("\u0007"), false);
  assert.equal(text.includes("\u009B"), false);
  assert.equal(text.includes("\u2066"), false);
  assert.match(
    text,
    /\[U\+001B\]\[2J\[U\+000A\]\[U\+0007\]\[U\+009B\]8;;\[U\+2066\]/,
  );
});

test("JSON は公開契約を保つ", () => {
  const parsed = JSON.parse(renderJson(sample));
  assert.equal(parsed.level, "high");
  assert.equal(parsed.files[0].class, "H");
  assert.equal(parsed.reasons[0].signal, "S10-invariant-hit");
  assert.deepEqual(parsed.stats, { files: 1, added: 8, deleted: 2 });
});

test("CLI 引数を検証する", () => {
  assert.deepEqual(
    parseArgs([
      "--",
      "--base",
      "main",
      "--format",
      "json",
      "--fail-at",
      "high",
    ]),
    { base: "main", format: "json", failAt: "high" },
  );
  assert.throws(() => parseArgs(["--format", "yaml"]), /unknown format/);
  assert.throws(() => parseArgs(["--base"]), /requires a value/);
});

test("CLI は process cwd の diff を評価する", () => {
  const result = run(["--base", "HEAD", "--format", "json"]);
  assert.equal(result.exitCode, 0);
  assert.equal(typeof JSON.parse(result.output).level, "string");
});
