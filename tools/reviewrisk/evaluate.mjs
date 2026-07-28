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

const reviewGatePrefixes = [
  ".claude/scripts/",
  ".claude/skills/code-review/",
  ".dmux-hooks/",
];

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

const testDisablePattern =
  /\.(?:skip|only|fixme)\s*(?:\(|\.)|\.skipIf\s*\((?!\s*false\s*(?=[,)]))|\b(?:xit|xdescribe|xtest|fit|fdescribe)\s*\(|\b(?:skip|only)\s*:(?!\s*false\s*(?=[,}]))\s*/;
const qualityGatePattern =
  /"(?:scripts|test(?::[^"]+)?|build(?::[^"]+)?|typecheck|lint|depcruise|format:check|i18n:check|precheck(?::full)?)"\s*:/;

const touches = (file, pathOrPrefix) =>
  file.path.startsWith(pathOrPrefix) ||
  (file.oldPath !== "" && file.oldPath.startsWith(pathOrPrefix));

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

const pathMatchesPrefix = (path, prefixes) =>
  prefixes.some((prefix) => path.startsWith(prefix));

const changedLines = (diff, path) => [
  ...(diff.addedLines.get(path) ?? []),
  ...(diff.removedLines.get(path) ?? []),
];

const unclassifiedRule = (note = "未分類（rules.mjs に要追記）") => ({
  id: "unclassified",
  class: classes.unknown,
  note,
});

const regexPrefixCharacters = new Set([
  "(",
  "[",
  "{",
  ":",
  ";",
  ",",
  "=",
  "!",
  "?",
  "&",
  "|",
  "+",
  "-",
  "*",
  "%",
  "^",
  "~",
  "<",
  ">",
]);
const regexPrefixKeywords = new Set([
  "await",
  "case",
  "delete",
  "do",
  "else",
  "in",
  "instanceof",
  "of",
  "return",
  "throw",
  "typeof",
  "void",
  "yield",
]);

const startsRegexLiteral = (codeBeforeSlash) => {
  let index = codeBeforeSlash.length - 1;
  while (index >= 0 && /\s/.test(codeBeforeSlash[index])) {
    index -= 1;
  }
  if (index < 0 || regexPrefixCharacters.has(codeBeforeSlash[index])) {
    return true;
  }
  if (!/[A-Za-z0-9_$]/.test(codeBeforeSlash[index])) {
    return false;
  }
  const end = index + 1;
  while (index >= 0 && /[A-Za-z0-9_$]/.test(codeBeforeSlash[index])) {
    index -= 1;
  }
  return regexPrefixKeywords.has(codeBeforeSlash.slice(index + 1, end));
};

const stripStringsAndComments = (source) => {
  let result = "";
  let state = "code";
  let quote = "";
  let escaped = false;
  let inRegexCharacterClass = false;
  const templateExpressionDepths = [];

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    const masked = character === "\n" ? "\n" : " ";

    if (state === "line-comment") {
      if (character === "\n") {
        state = "code";
      }
      result += masked;
      continue;
    }
    if (state === "block-comment") {
      if (character === "*" && next === "/") {
        result += "  ";
        index += 1;
        state = "code";
      } else {
        result += masked;
      }
      continue;
    }
    if (state === "string") {
      result += masked;
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        state = "code";
      }
      continue;
    }
    if (state === "template") {
      if (!escaped && character === "$" && next === "{") {
        result += "  ";
        index += 1;
        templateExpressionDepths.push(1);
        state = "code";
      } else {
        result += masked;
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === "`") {
          state = "code";
        }
      }
      continue;
    }
    if (state === "regex") {
      result += masked;
      if (character === "\n") {
        state = "code";
        escaped = false;
        inRegexCharacterClass = false;
      } else if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "[") {
        inRegexCharacterClass = true;
      } else if (character === "]") {
        inRegexCharacterClass = false;
      } else if (character === "/" && !inRegexCharacterClass) {
        state = "code";
      }
      continue;
    }
    if (character === "/" && next === "/") {
      result += "  ";
      index += 1;
      state = "line-comment";
      continue;
    }
    if (character === "/" && next === "*") {
      result += "  ";
      index += 1;
      state = "block-comment";
      continue;
    }
    if (character === "/" && next !== "=" && startsRegexLiteral(result)) {
      result += " ";
      state = "regex";
      escaped = false;
      inRegexCharacterClass = false;
      continue;
    }
    if (character === '"' || character === "'") {
      result += " ";
      quote = character;
      state = "string";
      escaped = false;
      continue;
    }
    if (character === "`") {
      result += " ";
      state = "template";
      escaped = false;
      continue;
    }
    if (templateExpressionDepths.length > 0 && character === "{") {
      templateExpressionDepths[templateExpressionDepths.length - 1] += 1;
      result += character;
      continue;
    }
    if (templateExpressionDepths.length > 0 && character === "}") {
      const depthIndex = templateExpressionDepths.length - 1;
      templateExpressionDepths[depthIndex] -= 1;
      if (templateExpressionDepths[depthIndex] === 0) {
        templateExpressionDepths.pop();
        result += " ";
        state = "template";
      } else {
        result += character;
      }
      continue;
    }
    result += character;
  }
  return result;
};

const readFirstArgument = ({ source, structuralSource, openingIndex }) => {
  let depth = 0;
  let end = structuralSource.length;
  for (
    let index = openingIndex + 1;
    index < structuralSource.length;
    index += 1
  ) {
    const character = structuralSource[index];
    if (character === "(" || character === "[" || character === "{") {
      depth += 1;
      continue;
    }
    if (character === ")" || character === "]" || character === "}") {
      if (character === ")" && depth === 0) {
        end = index;
        break;
      }
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (character === "," && depth === 0) {
      end = index;
      break;
    }
  }
  return {
    end,
    value: source
      .slice(openingIndex + 1, end)
      .trim()
      .replace(/\s+/g, " "),
  };
};

const findLastTestCallOpening = (structuralSource, beforeIndex) => {
  const pattern = /\b(?:test|it|describe)\s*\(/g;
  let openingIndex = -1;
  for (const match of structuralSource.matchAll(pattern)) {
    if ((match.index ?? 0) >= beforeIndex) {
      break;
    }
    openingIndex = (match.index ?? 0) + match[0].lastIndexOf("(");
  }
  return openingIndex;
};

const testDisableFingerprints = (source) => {
  const structuralSource = stripStringsAndComments(source);
  const pattern = new RegExp(testDisablePattern.source, "g");
  const fingerprints = [];
  for (const match of structuralSource.matchAll(pattern)) {
    const matchIndex = match.index ?? 0;
    const property = match[0].match(/\b(skip|only)\s*:/)?.[1];
    if (property !== undefined) {
      const openingIndex = findLastTestCallOpening(
        structuralSource,
        matchIndex,
      );
      const target =
        openingIndex === -1
          ? ""
          : readFirstArgument({
              source,
              structuralSource,
              openingIndex,
            }).value;
      fingerprints.push(`${property}:${target}`);
      continue;
    }

    const kind =
      match[0].match(/\.(skipIf|skip|only|fixme)/)?.[1] ??
      match[0].match(/\b(xit|xdescribe|xtest|fit|fdescribe)/)?.[1] ??
      match[0].trim();
    let openingIndex = matchIndex + match[0].lastIndexOf("(");
    if (!match[0].includes("(")) {
      openingIndex = structuralSource.indexOf(
        "(",
        matchIndex + match[0].length,
      );
    }
    if (openingIndex === -1) {
      fingerprints.push(kind);
      continue;
    }

    const firstArgument = readFirstArgument({
      source,
      structuralSource,
      openingIndex,
    });
    if (kind !== "skipIf") {
      fingerprints.push(`${kind}:${firstArgument.value}`);
      continue;
    }

    const targetOpening = structuralSource.indexOf("(", firstArgument.end + 1);
    const target =
      targetOpening === -1
        ? ""
        : readFirstArgument({
            source,
            structuralSource,
            openingIndex: targetOpening,
          }).value;
    fingerprints.push(`${kind}:${firstArgument.value}:${target}`);
  }
  return fingerprints;
};

const addsTestDisableFingerprint = (beforeSource, afterSource) => {
  const beforeCounts = new Map();
  for (const fingerprint of testDisableFingerprints(beforeSource)) {
    beforeCounts.set(fingerprint, (beforeCounts.get(fingerprint) ?? 0) + 1);
  }
  for (const fingerprint of testDisableFingerprints(afterSource)) {
    const remaining = beforeCounts.get(fingerprint) ?? 0;
    if (remaining === 0) {
      return true;
    }
    beforeCounts.set(fingerprint, remaining - 1);
  }
  return false;
};

const addsTestDisablePattern = (diff, file) => {
  const afterSource = diff.afterContents?.get(file.path);
  if (afterSource === undefined) {
    const addedSource = (diff.addedLines.get(file.path) ?? []).join("\n");
    return testDisablePattern.test(stripStringsAndComments(addedSource));
  }
  const oldPath = file.oldPath || file.path;
  const beforeSource = isTestFile(oldPath)
    ? (diff.beforeContents?.get(file.path) ?? "")
    : "";
  return addsTestDisableFingerprint(beforeSource, afterSource);
};

const criticalReasons = (diff) => {
  const reasons = [];
  for (const path of diff.unreadablePaths ?? []) {
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
    if (
      isDeletedOrMovedOut(file, (path) =>
        pathMatchesPrefix(path, testSupportPrefixes),
      )
    ) {
      reasons.push(
        reason(
          signals.testSupportDeleted,
          levels.critical,
          file.path,
          "test fixture・helper・harness を削除・対象外へ移動・type change",
        ),
      );
    }
    if (
      file.path === ".claude/settings.json" ||
      file.oldPath === ".claude/settings.json" ||
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
          "GitHub Actions workflow を削除・拡張子変更または無効化",
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

  for (const file of diff.files) {
    if (isTestFile(file.path) && addsTestDisablePattern(diff, file)) {
      reasons.push(
        reason(
          signals.testDisabled,
          levels.critical,
          file.path,
          "テストの skip・fixme・only を追加・有効化",
        ),
      );
    }
  }

  const packageManifestRemoved = diff.files.some((file) =>
    isDeletedOrMovedOut(file, (path) => path === "package.json"),
  );
  const packageLines = changedLines(diff, "package.json");
  if (
    packageManifestRemoved ||
    packageLines.some((line) => qualityGatePattern.test(line))
  ) {
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
