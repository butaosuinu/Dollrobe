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

const qualityGatePattern =
  /"(?:scripts|test(?::[^"]+)?|build(?::[^"]+)?|typecheck|lint|depcruise|format:check|i18n:check|precheck(?::full)?)"\s*:/;
const qualityScriptNamePattern =
  /^(?:test(?::.+)?|build(?::.+)?|typecheck|lint|depcruise|format:check|i18n:check|precheck(?::full)?)$/;

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
  if (
    (codeBeforeSlash[index] === "+" || codeBeforeSlash[index] === "-") &&
    codeBeforeSlash[index - 1] === codeBeforeSlash[index]
  ) {
    return false;
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

const skipWhitespace = (source, start) => {
  let index = start;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }
  return index;
};

const findMatchingDelimiter = ({ source, openingIndex, opening, closing }) => {
  let depth = 0;
  for (let index = openingIndex; index < source.length; index += 1) {
    if (source[index] === opening) {
      depth += 1;
    } else if (source[index] === closing) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
};

const argumentRange = ({ source, structuralSource, start, end }) => {
  let trimmedStart = start;
  let trimmedEnd = end;
  while (trimmedStart < trimmedEnd && /\s/.test(source[trimmedStart])) {
    trimmedStart += 1;
  }
  while (trimmedEnd > trimmedStart && /\s/.test(source[trimmedEnd - 1])) {
    trimmedEnd -= 1;
  }
  return {
    start: trimmedStart,
    end: trimmedEnd,
    raw: source.slice(trimmedStart, trimmedEnd),
    structural: structuralSource.slice(trimmedStart, trimmedEnd),
  };
};

const readCallArguments = ({ source, structuralSource, openingIndex }) => {
  const closingIndex = findMatchingDelimiter({
    source: structuralSource,
    openingIndex,
    opening: "(",
    closing: ")",
  });
  if (closingIndex === -1) {
    return { arguments: [], closingIndex: structuralSource.length };
  }

  const argumentsList = [];
  let start = openingIndex + 1;
  let depth = 0;
  for (let index = start; index < closingIndex; index += 1) {
    const character = structuralSource[index];
    if (character === "(" || character === "[" || character === "{") {
      depth += 1;
    } else if (character === ")" || character === "]" || character === "}") {
      depth = Math.max(0, depth - 1);
    } else if (character === "," && depth === 0) {
      argumentsList.push(
        argumentRange({ source, structuralSource, start, end: index }),
      );
      start = index + 1;
    }
  }
  if (source.slice(start, closingIndex).trim() !== "") {
    argumentsList.push(
      argumentRange({
        source,
        structuralSource,
        start,
        end: closingIndex,
      }),
    );
  }
  return { arguments: argumentsList, closingIndex };
};

const testRootPattern =
  /(?<![\w$.])\b(test|it|describe|suite|context|xit|xdescribe|xtest|fit|fdescribe)\b/g;

const parseTestCalls = (source) => {
  const structuralSource = stripStringsAndComments(source);
  const calls = [];
  for (const match of structuralSource.matchAll(testRootPattern)) {
    const root = match[1];
    let cursor = skipWhitespace(
      structuralSource,
      (match.index ?? 0) + match[0].length,
    );
    const modifiers = [];
    const modifierArguments = new Map();
    let openingIndex = -1;

    while (cursor < structuralSource.length) {
      if (structuralSource[cursor] === "(") {
        openingIndex = cursor;
        break;
      }
      if (structuralSource[cursor] !== ".") {
        break;
      }

      cursor = skipWhitespace(structuralSource, cursor + 1);
      const modifierMatch = /^[A-Za-z_$][\w$]*/.exec(
        structuralSource.slice(cursor),
      );
      if (modifierMatch === null) {
        break;
      }
      const modifier = modifierMatch[0];
      modifiers.push(modifier);
      cursor = skipWhitespace(structuralSource, cursor + modifier.length);
      if (structuralSource[cursor] !== "(") {
        continue;
      }

      const parsedModifier = readCallArguments({
        source,
        structuralSource,
        openingIndex: cursor,
      });
      modifierArguments.set(modifier, parsedModifier.arguments);
      const afterModifier = skipWhitespace(
        structuralSource,
        parsedModifier.closingIndex + 1,
      );
      if (structuralSource[afterModifier] === "(") {
        openingIndex = afterModifier;
        break;
      }
      if (structuralSource[afterModifier] === ".") {
        cursor = afterModifier;
        continue;
      }
      openingIndex = cursor;
      break;
    }

    if (openingIndex === -1) {
      continue;
    }
    const parsedCall = readCallArguments({
      source,
      structuralSource,
      openingIndex,
    });
    calls.push({
      root,
      modifiers,
      modifierArguments,
      openingIndex,
      closingIndex: parsedCall.closingIndex,
      arguments: parsedCall.arguments,
    });
  }
  return { calls, structuralSource };
};

const normalizedTestRoot = (root) => {
  switch (root) {
    case "xit":
    case "fit":
      return "it";
    case "xtest":
      return "test";
    case "xdescribe":
    case "fdescribe":
    case "suite":
    case "context":
      return "describe";
    default:
      return root;
  }
};

const normalizedIdentityPart = (value) => value.trim().replace(/\s+/g, " ");

const findSuiteBody = ({ call, structuralSource }) => {
  const searchStart = call.arguments[0]?.end ?? call.openingIndex + 1;
  const arrowIndex = structuralSource.indexOf("=>", searchStart);
  const functionMatch = /\bfunction\b/.exec(
    structuralSource.slice(searchStart, call.closingIndex),
  );
  const functionIndex =
    functionMatch === null ? -1 : searchStart + (functionMatch.index ?? 0);
  const markers = [arrowIndex, functionIndex].filter(
    (index) => index >= searchStart && index < call.closingIndex,
  );
  if (markers.length === 0) {
    return undefined;
  }
  const markerIndex = Math.min(...markers);
  const openingIndex = structuralSource.indexOf("{", markerIndex);
  if (openingIndex === -1 || openingIndex >= call.closingIndex) {
    return undefined;
  }
  const closingIndex = findMatchingDelimiter({
    source: structuralSource,
    openingIndex,
    opening: "{",
    closing: "}",
  });
  if (closingIndex === -1) {
    return undefined;
  }
  return { openingIndex, closingIndex };
};

const suiteScopes = ({ calls, structuralSource }) =>
  calls.flatMap((call) => {
    if (normalizedTestRoot(call.root) !== "describe") {
      return [];
    }
    const body = findSuiteBody({ call, structuralSource });
    if (body === undefined) {
      return [];
    }
    return [
      {
        ...body,
        title: normalizedIdentityPart(call.arguments[0]?.raw ?? "<anonymous>"),
      },
    ];
  });

const readPropertyValueEnd = ({ structuralSource, start, objectEnd }) => {
  let braces = 0;
  let brackets = 0;
  let parentheses = 0;
  for (let index = start; index < objectEnd; index += 1) {
    const character = structuralSource[index];
    if (character === "{") {
      braces += 1;
    } else if (character === "[") {
      brackets += 1;
    } else if (character === "(") {
      parentheses += 1;
    } else if (character === "}") {
      if (braces === 0 && brackets === 0 && parentheses === 0) {
        return index;
      }
      braces = Math.max(0, braces - 1);
    } else if (character === "]") {
      brackets = Math.max(0, brackets - 1);
    } else if (character === ")") {
      parentheses = Math.max(0, parentheses - 1);
    } else if (
      character === "," &&
      braces === 0 &&
      brackets === 0 &&
      parentheses === 0
    ) {
      return index;
    }
  }
  return objectEnd;
};

const activeOptionModes = ({ argument, structuralSource }) => {
  const modes = new Set();
  const objectStart = skipWhitespace(structuralSource, argument.start);
  if (structuralSource[objectStart] !== "{") {
    return modes;
  }

  let braces = 0;
  let brackets = 0;
  let parentheses = 0;
  for (let index = objectStart; index < argument.end; index += 1) {
    const character = structuralSource[index];
    if (character === "{") {
      braces += 1;
      continue;
    }
    if (character === "}") {
      braces = Math.max(0, braces - 1);
      continue;
    }
    if (character === "[") {
      brackets += 1;
      continue;
    }
    if (character === "]") {
      brackets = Math.max(0, brackets - 1);
      continue;
    }
    if (character === "(") {
      parentheses += 1;
      continue;
    }
    if (character === ")") {
      parentheses = Math.max(0, parentheses - 1);
      continue;
    }
    if (
      braces !== 1 ||
      brackets !== 0 ||
      parentheses !== 0 ||
      !/[A-Za-z_$]/.test(character)
    ) {
      continue;
    }

    const keyMatch = /^[A-Za-z_$][\w$]*/.exec(structuralSource.slice(index));
    if (keyMatch === null) {
      continue;
    }
    const key = keyMatch[0];
    const colonIndex = skipWhitespace(structuralSource, index + key.length);
    if (
      (key !== "skip" && key !== "only") ||
      structuralSource[colonIndex] !== ":"
    ) {
      index += key.length - 1;
      continue;
    }

    const valueStart = skipWhitespace(structuralSource, colonIndex + 1);
    const valueEnd = readPropertyValueEnd({
      structuralSource,
      start: valueStart,
      objectEnd: argument.end,
    });
    if (structuralSource.slice(valueStart, valueEnd).trim() !== "false") {
      modes.add(key);
    }
    index = valueEnd - 1;
  }
  return modes;
};

const disableModesForCall = ({ call, structuralSource }) => {
  const modes = new Set();
  if (
    call.root === "xit" ||
    call.root === "xdescribe" ||
    call.root === "xtest"
  ) {
    modes.add("skip");
  }
  if (call.root === "fit" || call.root === "fdescribe") {
    modes.add("only");
  }
  for (const modifier of call.modifiers) {
    if (
      modifier === "skip" ||
      modifier === "only" ||
      modifier === "fixme" ||
      modifier === "todo"
    ) {
      modes.add(modifier);
    }
    if (modifier === "skipIf") {
      const condition =
        call.modifierArguments.get(modifier)?.[0]?.structural.trim() ?? "";
      if (condition !== "false") {
        modes.add(modifier);
      }
    }
  }
  for (const argument of call.arguments.slice(0, 2)) {
    for (const mode of activeOptionModes({ argument, structuralSource })) {
      modes.add(mode);
    }
  }
  return modes;
};

const testDisableFingerprints = (source) => {
  const parsed = parseTestCalls(source);
  const scopes = suiteScopes(parsed);
  const occurrences = new Map();
  const fingerprints = [];
  for (const call of parsed.calls) {
    const context = scopes
      .filter(
        (scope) =>
          scope.openingIndex < call.openingIndex &&
          call.openingIndex < scope.closingIndex,
      )
      .sort((left, right) => left.openingIndex - right.openingIndex)
      .map((scope) => scope.title)
      .join(" > ");
    const title = normalizedIdentityPart(
      call.arguments[0]?.raw ?? "<anonymous>",
    );
    const baseIdentity = `${context}|${normalizedTestRoot(call.root)}|${title}`;
    const occurrence = (occurrences.get(baseIdentity) ?? 0) + 1;
    occurrences.set(baseIdentity, occurrence);
    const identity = `${baseIdentity}|${String(occurrence)}`;
    for (const mode of disableModesForCall({
      call,
      structuralSource: parsed.structuralSource,
    })) {
      fingerprints.push(`${mode}:${identity}`);
    }
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
    return testDisableFingerprints(addedSource).length > 0;
  }
  const oldPath = file.oldPath || file.path;
  const beforeSource = isTestFile(oldPath)
    ? (diff.beforeContents?.get(file.path) ?? "")
    : "";
  return addsTestDisableFingerprint(beforeSource, afterSource);
};

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parsePackageJson = (source) => {
  // Invalid PR-authored JSON is a quality-gate change, not a CLI crash.
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
