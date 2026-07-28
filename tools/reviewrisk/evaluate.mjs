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

const testSupportPaths = new Set([
  "playwright.config.ts",
  "vitest.config.ts",
  "vitest.config.workers.ts",
  "vitest.workspace.ts",
]);

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

const removesOrRenamesProtectedPath = (file, predicate) =>
  (file.status === "D" && predicate(file.path)) ||
  (file.status === "R" && predicate(file.oldPath)) ||
  (replacesRegularFileType(file) && predicate(file.path));

const pathMatchesPrefix = (path, prefixes) =>
  prefixes.some((prefix) => path.startsWith(prefix));

const isTestSupportPath = (path) =>
  testSupportPaths.has(path) || pathMatchesPrefix(path, testSupportPrefixes);

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

const canonicalTestRoots = [
  "test",
  "it",
  "describe",
  "suite",
  "context",
  "xit",
  "xdescribe",
  "xtest",
  "fit",
  "fdescribe",
];

const namespaceTestModules = new Set([
  "@playwright/test",
  "node:test",
  "vitest",
]);

const importedTestRoots = (source) => {
  const roots = new Map();
  const importPattern =
    /\bimport\s*\{([\s\S]*?)\}\s*from\s*(["'])([^"'\r\n]+)\2/g;
  for (const match of source.matchAll(importPattern)) {
    const moduleName = match[3];
    for (const specifier of match[1].split(",")) {
      const aliasMatch =
        /^\s*(test|it|describe|suite|context|xit|xdescribe|xtest|fit|fdescribe)(?:\s+as\s+([A-Za-z_$][\w$]*))?\s*$/.exec(
          specifier,
        );
      if (
        aliasMatch !== null &&
        (aliasMatch[1] === "test" || namespaceTestModules.has(moduleName))
      ) {
        roots.set(aliasMatch[2] ?? aliasMatch[1], aliasMatch[1]);
      }
    }
  }

  const namespacePattern =
    /\bimport\s*\*\s*as\s+([A-Za-z_$][\w$]*)\s*from\s*(["'])([^"'\r\n]+)\2/g;
  for (const match of source.matchAll(namespacePattern)) {
    const namespace = match[1];
    const moduleName = match[3];
    if (!namespaceTestModules.has(moduleName)) {
      continue;
    }
    roots.set(`${namespace}.test`, "test");
    if (moduleName !== "@playwright/test") {
      roots.set(`${namespace}.it`, "it");
      roots.set(`${namespace}.describe`, "describe");
      roots.set(`${namespace}.suite`, "describe");
    }
  }
  return roots;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const testRootPatternFor = (importedRoots) => {
  const roots = [...new Set([...canonicalTestRoots, ...importedRoots.keys()])]
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join("|");
  return new RegExp(`(?<![\\w$.])\\b(${roots})\\b`, "g");
};

const staticBracketModifier = (source, start, end) => {
  const match = /^(["'])(skip|only|fixme|todo|skipIf|runIf)\1$/.exec(
    source.slice(start, end).trim(),
  );
  return match?.[2];
};

const parseTestCalls = (source) => {
  const structuralSource = stripStringsAndComments(source);
  const importedRoots = importedTestRoots(source);
  const calls = [];
  for (const match of structuralSource.matchAll(
    testRootPatternFor(importedRoots),
  )) {
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

      let modifier;
      if (structuralSource.startsWith("?.", cursor)) {
        const afterOptional = skipWhitespace(structuralSource, cursor + 2);
        if (structuralSource[afterOptional] === "(") {
          openingIndex = afterOptional;
          break;
        }
        cursor = afterOptional;
        if (structuralSource[cursor] === "[") {
          const closingBracket = findMatchingDelimiter({
            source: structuralSource,
            openingIndex: cursor,
            opening: "[",
            closing: "]",
          });
          if (closingBracket === -1) {
            break;
          }
          modifier = staticBracketModifier(source, cursor + 1, closingBracket);
          if (modifier === undefined) {
            break;
          }
          cursor = skipWhitespace(structuralSource, closingBracket + 1);
        }
      } else if (structuralSource[cursor] === ".") {
        cursor = skipWhitespace(structuralSource, cursor + 1);
      } else if (structuralSource[cursor] === "[") {
        const closingBracket = findMatchingDelimiter({
          source: structuralSource,
          openingIndex: cursor,
          opening: "[",
          closing: "]",
        });
        if (closingBracket === -1) {
          break;
        }
        modifier = staticBracketModifier(source, cursor + 1, closingBracket);
        if (modifier === undefined) {
          break;
        }
        cursor = skipWhitespace(structuralSource, closingBracket + 1);
      } else {
        break;
      }

      if (modifier === undefined) {
        const modifierMatch = /^[A-Za-z_$][\w$]*/.exec(
          structuralSource.slice(cursor),
        );
        if (modifierMatch === null) {
          break;
        }
        modifier = modifierMatch[0];
        cursor = skipWhitespace(structuralSource, cursor + modifier.length);
      }
      modifiers.push(modifier);
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
      importedRoot: importedRoots.get(root),
      modifiers,
      modifierArguments,
      openingIndex,
      closingIndex: parsedCall.closingIndex,
      arguments: parsedCall.arguments,
    });
  }
  return { calls, structuralSource };
};

const normalizedTestRoot = (call) => {
  const sourceRoot = call.importedRoot ?? call.root;
  let root;
  switch (sourceRoot) {
    case "xit":
    case "fit":
      root = "it";
      break;
    case "xtest":
      root = "test";
      break;
    case "xdescribe":
    case "fdescribe":
    case "suite":
    case "context":
      root = "describe";
      break;
    default:
      root = sourceRoot;
      break;
  }
  return root === "test" && call.modifiers.includes("describe")
    ? "describe"
    : root;
};

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
    if (normalizedTestRoot(call) !== "describe") {
      return [];
    }
    const body = findSuiteBody({ call, structuralSource });
    if (body === undefined) {
      return [];
    }
    return [
      {
        ...body,
        title: call.arguments[0]?.raw.trim().replace(/\s+/g, " ") ?? "",
      },
    ];
  });

const assignSuitePaths = (scopes) => {
  const counts = new Map();
  const titleCounts = new Map();
  const assigned = [];
  for (const scope of [...scopes].sort(
    (left, right) => left.openingIndex - right.openingIndex,
  )) {
    const parent = assigned
      .filter(
        (candidate) =>
          candidate.openingIndex < scope.openingIndex &&
          scope.openingIndex < candidate.closingIndex,
      )
      .at(-1);
    const parentPath = parent?.path ?? "root";
    const index = (counts.get(parentPath) ?? 0) + 1;
    counts.set(parentPath, index);
    const parentNamedPath = parent?.namedPath ?? "root";
    const titleKey = `${parentNamedPath}|${scope.title}`;
    const titleIndex = (titleCounts.get(titleKey) ?? 0) + 1;
    titleCounts.set(titleKey, titleIndex);
    assigned.push({
      ...scope,
      path: `${parentPath}.${String(index)}`,
      namedPath: `${parentNamedPath}>${scope.title}#${String(titleIndex)}`,
    });
  }
  return assigned;
};

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

const activeOptionModes = ({ argument, source, structuralSource }) => {
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
    if (braces !== 1 || brackets !== 0 || parentheses !== 0) {
      continue;
    }

    let key;
    let keyEnd;
    if (/[A-Za-z_$]/.test(character)) {
      const keyMatch = /^[A-Za-z_$][\w$]*/.exec(structuralSource.slice(index));
      if (keyMatch === null) {
        continue;
      }
      key = keyMatch[0];
      keyEnd = index + key.length;
    } else {
      const quotedKeyMatch = /^(["'])(skip|only)\1/.exec(
        source.slice(index, argument.end),
      );
      if (quotedKeyMatch === null) {
        continue;
      }
      key = quotedKeyMatch[2];
      keyEnd = index + quotedKeyMatch[0].length;
    }
    const colonIndex = skipWhitespace(structuralSource, keyEnd);
    if (
      (key !== "skip" && key !== "only") ||
      structuralSource[colonIndex] !== ":"
    ) {
      index = keyEnd - 1;
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

const disableModesForCall = ({ call, source, structuralSource }) => {
  const modes = new Set();
  const sourceRoot = call.importedRoot ?? call.root;
  if (
    sourceRoot === "xit" ||
    sourceRoot === "xdescribe" ||
    sourceRoot === "xtest"
  ) {
    modes.add("skip");
  }
  if (sourceRoot === "fit" || sourceRoot === "fdescribe") {
    modes.add("only");
  }
  for (const [index, modifier] of call.modifiers.entries()) {
    const modifierCondition =
      call.modifierArguments.get(modifier)?.[0] ??
      (index === call.modifiers.length - 1 ? call.arguments[0] : undefined);
    if (
      (modifier === "skip" || modifier === "fixme") &&
      modifierCondition?.structural.trim() === "false"
    ) {
      continue;
    }
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
    if (modifier === "runIf") {
      const condition =
        call.modifierArguments.get(modifier)?.[0]?.structural.trim() ?? "";
      if (condition !== "true") {
        modes.add(modifier);
      }
    }
  }
  for (const argument of call.arguments.slice(0, 2)) {
    for (const mode of activeOptionModes({
      argument,
      source,
      structuralSource,
    })) {
      modes.add(mode);
    }
  }
  return modes;
};

const normalizedStructuralCode = (source) => source.replace(/\s+/g, "");
const normalizedSourceFragment = (source) => source.trim().replace(/\s+/g, " ");

const testCallDescriptors = (source) => {
  const parsed = parseTestCalls(source);
  const scopes = assignSuitePaths(suiteScopes(parsed));
  const positions = new Map();
  const descriptors = [];
  for (const call of parsed.calls) {
    const directScope = scopes
      .filter(
        (scope) =>
          scope.openingIndex < call.openingIndex &&
          call.openingIndex < scope.closingIndex,
      )
      .sort((left, right) => left.openingIndex - right.openingIndex)
      .at(-1);
    const positionalContext = directScope?.path ?? "root";
    const namedContext = directScope?.namedPath ?? "root";
    const position = (positions.get(positionalContext) ?? 0) + 1;
    positions.set(positionalContext, position);
    const root = normalizedTestRoot(call);
    const title = normalizedSourceFragment(call.arguments[0]?.raw ?? "");
    const callback = call.arguments.at(-1)?.structural ?? "";
    const callbackIdentity = normalizedStructuralCode(callback);
    const positionalIdentity = `${root}|${positionalContext}|${String(position)}`;
    const casePositionIdentity = `${positionalContext}|${String(position)}`;
    const movableIdentity = `${root}|${namedContext}|${title}|${callbackIdentity}`;
    const modes = [
      ...disableModesForCall({
        call,
        source,
        structuralSource: parsed.structuralSource,
      }),
    ];
    descriptors.push({
      root,
      modes,
      title,
      callbackIdentity,
      casePositionIdentity,
      positionalIdentity,
      movableIdentity,
    });
  }
  return descriptors;
};

const testDisableDescriptors = (source) =>
  testCallDescriptors(source).flatMap(({ modes, ...descriptor }) =>
    modes.map((mode) => ({ ...descriptor, mode })),
  );

const addsTestDisableFingerprint = (beforeSource, afterSource) => {
  const beforeCalls = testCallDescriptors(beforeSource);
  const before = beforeCalls.flatMap(({ modes, ...descriptor }) =>
    modes.map((mode) => ({ ...descriptor, mode, used: false })),
  );
  const unmatched = [];
  for (const descriptor of testDisableDescriptors(afterSource)) {
    const movableMatch = before.find(
      (candidate) =>
        !candidate.used &&
        candidate.mode === descriptor.mode &&
        candidate.movableIdentity === descriptor.movableIdentity,
    );
    if (movableMatch !== undefined) {
      movableMatch.used = true;
    } else if (
      beforeCalls.some(
        (candidate) =>
          candidate.movableIdentity === descriptor.movableIdentity &&
          !candidate.modes.includes(descriptor.mode),
      )
    ) {
      return true;
    } else {
      unmatched.push(descriptor);
    }
  }
  for (const descriptor of unmatched) {
    const positionalMatch = before.find(
      (candidate) =>
        !candidate.used &&
        candidate.mode === descriptor.mode &&
        candidate.positionalIdentity === descriptor.positionalIdentity &&
        (candidate.title === descriptor.title ||
          candidate.callbackIdentity === descriptor.callbackIdentity),
    );
    if (positionalMatch === undefined) {
      return true;
    }
    positionalMatch.used = true;
  }
  return false;
};

const removesTestCallFingerprint = (beforeSource, afterSource) => {
  const before = testCallDescriptors(beforeSource).filter(
    ({ root }) => root === "test" || root === "it",
  );
  const after = testCallDescriptors(afterSource)
    .filter(({ root }) => root === "test" || root === "it")
    .map((descriptor) => ({ ...descriptor, used: false }));
  const unmatched = [];

  for (const descriptor of before) {
    const exactMatch = after.find(
      (candidate) =>
        !candidate.used &&
        candidate.title === descriptor.title &&
        candidate.callbackIdentity === descriptor.callbackIdentity,
    );
    if (exactMatch === undefined) {
      unmatched.push(descriptor);
    } else {
      exactMatch.used = true;
    }
  }

  for (const descriptor of unmatched) {
    const positionalMatch = after.find(
      (candidate) =>
        !candidate.used &&
        candidate.casePositionIdentity === descriptor.casePositionIdentity &&
        (candidate.title === descriptor.title ||
          candidate.callbackIdentity === descriptor.callbackIdentity),
    );
    if (positionalMatch === undefined) {
      return true;
    }
    positionalMatch.used = true;
  }
  return false;
};

const addsTestDisablePattern = (diff, file) => {
  const afterSource = diff.afterContents?.get(file.path);
  if (afterSource === undefined) {
    const addedSource = (diff.addedLines.get(file.path) ?? []).join("\n");
    return testDisableDescriptors(addedSource).length > 0;
  }
  const oldPath = file.oldPath || file.path;
  const beforeSource = isTestFile(oldPath)
    ? (diff.beforeContents?.get(file.path) ?? "")
    : "";
  return addsTestDisableFingerprint(beforeSource, afterSource);
};

const removesTestCallPattern = (diff, file) => {
  const oldPath = file.oldPath || file.path;
  if (!isTestFile(oldPath)) {
    return false;
  }
  const beforeSource = diff.beforeContents?.get(file.path);
  const afterSource = diff.afterContents?.get(file.path);
  return (
    beforeSource !== undefined &&
    afterSource !== undefined &&
    removesTestCallFingerprint(beforeSource, afterSource)
  );
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
    const losesTestFile = isDeletedOrMovedOut(file, isTestFile);
    if (losesTestFile) {
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
    } else if (removesTestCallPattern(diff, file)) {
      reasons.push(
        reason(
          signals.testDeleted,
          levels.critical,
          file.path,
          "テストファイル内の test case を削除・別 case へ差し替え",
        ),
      );
    }
    if (removesOrRenamesProtectedPath(file, isTestSupportPath)) {
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
