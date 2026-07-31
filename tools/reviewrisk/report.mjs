import { Buffer } from "node:buffer";
import { levelGuidance } from "./classes.mjs";

export const reviewRiskMarker = "<!-- review-risk -->";
export const markdownByteLimit = 60_000;

const markdownReasonByteBudget = 20_000;
const markdownFileByteBudget = 35_000;

const plusMinus = ({ added, deleted }) =>
  `+${String(added)} −${String(deleted)}`;

const unsafeTextPathCharacter =
  /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/gu;
const unsafeMarkdownPathCharacter =
  /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069`|<>&]/gu;

const escapePath = (value, pattern) =>
  value.replace(pattern, (character) => {
    const codePoint = character.codePointAt(0);
    return `[U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}]`;
  });

const escapeTextPath = (value) => escapePath(value, unsafeTextPathCharacter);
const escapeMarkdownPath = (value) =>
  escapePath(value, unsafeMarkdownPathCharacter);

const takeLinesWithinByteBudget = ({ items, render, byteBudget }) => {
  const lines = [];
  let usedBytes = 0;
  for (const item of items) {
    const line = render(item);
    const lineBytes = Buffer.byteLength(`${line}\n`, "utf8");
    if (usedBytes + lineBytes > byteBudget) {
      break;
    }
    lines.push(line);
    usedBytes += lineBytes;
  }
  return { lines, omitted: items.length - lines.length };
};

export const renderText = (report) => {
  const lines = [
    `Review risk: ${report.level.toUpperCase()} — ${levelGuidance[report.level]}`,
  ];
  if (report.reasons.length > 0) {
    lines.push("", "理由:");
    for (const item of report.reasons) {
      lines.push(
        `  [${item.level}] ${item.signal}  ${escapeTextPath(item.file || "-")}  ${item.detail}`,
      );
    }
  }
  if (report.files.length > 0) {
    lines.push(
      "",
      `ファイル (${String(report.stats.files)} files, ${plusMinus(report.stats)}):`,
      "  St  Class  Level     Rule                 File",
    );
    for (const file of report.files) {
      lines.push(
        `  ${file.status.padEnd(3)} ${file.class.padEnd(6)} ${file.level.padEnd(9)} ${file.rule.padEnd(20)} ${escapeTextPath(file.path)}`,
      );
    }
  }
  return lines.join("\n");
};

export const renderMarkdown = (report) => {
  const lines = [
    reviewRiskMarker,
    `## Review risk: **${report.level.toUpperCase()}**`,
    "",
    levelGuidance[report.level],
    "",
    "### 理由",
    "",
  ];
  if (report.reasons.length === 0) {
    lines.push("- エスカレーションシグナルなし");
  } else {
    const visibleReasons = takeLinesWithinByteBudget({
      items: report.reasons,
      byteBudget: markdownReasonByteBudget,
      render: (item) =>
        `- **[${item.level}]** \`${item.signal}\` — \`${escapeMarkdownPath(item.file || "(diff 全体)")}\`: ${item.detail}`,
    });
    lines.push(...visibleReasons.lines);
    if (visibleReasons.omitted > 0) {
      lines.push(`- _ほか ${String(visibleReasons.omitted)} 件の理由を省略_`);
    }
  }
  lines.push(
    "",
    `<details><summary>ファイル別クラス (${String(report.stats.files)} files, ${plusMinus(report.stats)})</summary>`,
    "",
    "| File | St | Class | Level | Rule |",
    "|---|---|---|---|---|",
  );
  const visibleFiles = takeLinesWithinByteBudget({
    items: report.files,
    byteBudget: markdownFileByteBudget,
    render: (file) =>
      `| \`${escapeMarkdownPath(file.path)}\` | ${file.status} | ${file.class} | ${file.level} | ${file.rule} |`,
  });
  lines.push(...visibleFiles.lines);
  if (visibleFiles.omitted > 0) {
    lines.push(
      `| _ほか ${String(visibleFiles.omitted)} files を省略_ | - | - | - | - |`,
    );
  }
  lines.push("", "</details>", "", "判定ルール: docs/review-risk.ja.md");
  const markdown = `${lines.join("\n")}\n`;
  if (Buffer.byteLength(markdown, "utf8") <= markdownByteLimit) {
    return markdown;
  }
  return `${[
    reviewRiskMarker,
    `## Review risk: **${report.level.toUpperCase()}**`,
    "",
    levelGuidance[report.level],
    "",
    `出力上限のため ${String(report.reasons.length)} 件の理由と ${String(report.files.length)} files の詳細を省略しました。`,
    "",
    "判定ルール: docs/review-risk.ja.md",
  ].join("\n")}\n`;
};

export const renderJson = (report) => JSON.stringify(report, null, 2);
