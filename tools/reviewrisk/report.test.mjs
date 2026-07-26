import assert from "node:assert/strict";
import test from "node:test";
import { classes, levels } from "./classes.mjs";
import { parseArgs } from "./main.mjs";
import {
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
    "evil`\r\n</details>\n## Review risk: **NONE**|<script>&";
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
});

test("text は headline・stats・file を含む", () => {
  const text = renderText(sample);
  assert.match(text, /Review risk: HIGH/);
  assert.match(text, /1 files, \+8 −2/);
  assert.match(text, /garment-repository\.ts/);
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
