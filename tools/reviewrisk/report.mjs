import { levelGuidance } from "./classes.mjs";

export const reviewRiskMarker = "<!-- review-risk -->";

const plusMinus = ({ added, deleted }) =>
  `+${String(added)} −${String(deleted)}`;

const escapeTableCell = (value) => value.replaceAll("|", "\\|");

export const renderText = (report) => {
  const lines = [
    `Review risk: ${report.level.toUpperCase()} — ${levelGuidance[report.level]}`,
  ];
  if (report.reasons.length > 0) {
    lines.push("", "理由:");
    for (const item of report.reasons) {
      lines.push(
        `  [${item.level}] ${item.signal}  ${item.file || "-"}  ${item.detail}`,
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
        `  ${file.status.padEnd(3)} ${file.class.padEnd(6)} ${file.level.padEnd(9)} ${file.rule.padEnd(20)} ${file.path}`,
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
    for (const item of report.reasons) {
      lines.push(
        `- **[${item.level}]** \`${item.signal}\` — \`${item.file || "(diff 全体)"}\`: ${item.detail}`,
      );
    }
  }
  lines.push(
    "",
    `<details><summary>ファイル別クラス (${String(report.stats.files)} files, ${plusMinus(report.stats)})</summary>`,
    "",
    "| File | St | Class | Level | Rule |",
    "|---|---|---|---|---|",
  );
  for (const file of report.files) {
    lines.push(
      `| \`${escapeTableCell(file.path)}\` | ${file.status} | ${file.class} | ${file.level} | ${file.rule} |`,
    );
  }
  lines.push("", "</details>", "", "判定ルール: docs/review-risk.ja.md");
  return `${lines.join("\n")}\n`;
};

export const renderJson = (report) => JSON.stringify(report, null, 2);
