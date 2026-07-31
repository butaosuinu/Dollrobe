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

const reviewGatePrefixes = [".claude/scripts/", ".claude/skills/code-review/"];

const dmuxLifecycleHookNames = new Set([
  "before_pane_create",
  "pane_created",
  "worktree_created",
  "before_pane_close",
  "pane_closed",
  "before_worktree_remove",
  "worktree_removed",
  "pre_merge",
  "post_merge",
  "run_test",
  "run_dev",
]);

const isDmuxLifecycleHook = (path) => {
  const prefix = ".dmux-hooks/";
  if (!path.startsWith(prefix)) {
    return false;
  }
  const name = path.slice(prefix.length);
  return !name.includes("/") && dmuxLifecycleHookNames.has(name);
};

const touchesDmuxLifecycleHook = (file) =>
  isDmuxLifecycleHook(file.path) || isDmuxLifecycleHook(file.oldPath);

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
  /"(?:scripts|test(?::[^"]+)?|build(?::[^"]+)?|typecheck|lint|depcruise|format:check|i18n:check|precheck(?::full)?|review-risk)"\s*:/;
const qualityScriptNamePattern =
  /^(?:test(?::.+)?|build(?::.+)?|typecheck|lint|depcruise|format:check|i18n:check|precheck(?::full)?|review-risk)$/;

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

export const requiresEvaluationContents = (path) =>
  path === "package.json" ||
  isTestFile(path) ||
  isTestSupportPath(path) ||
  isWorkflowFile(path);

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
const controlStatementKeywords = new Set([
  "catch",
  "for",
  "if",
  "switch",
  "while",
  "with",
]);

const closesControlStatement = (source, closingIndex) => {
  let depth = 0;
  for (let index = closingIndex; index >= 0; index -= 1) {
    if (source[index] === ")") {
      depth += 1;
      continue;
    }
    if (source[index] !== "(") {
      continue;
    }
    depth -= 1;
    if (depth !== 0) {
      continue;
    }
    let keywordEnd = index;
    let keywordStart = index - 1;
    while (keywordStart >= 0 && /\s/.test(source[keywordStart])) {
      keywordStart -= 1;
      keywordEnd -= 1;
    }
    while (keywordStart >= 0 && /[A-Za-z]/.test(source[keywordStart])) {
      keywordStart -= 1;
    }
    let keyword = source.slice(keywordStart + 1, keywordEnd);
    if (keyword === "await") {
      keywordEnd = keywordStart + 1;
      while (keywordStart >= 0 && /\s/.test(source[keywordStart])) {
        keywordStart -= 1;
        keywordEnd -= 1;
      }
      while (keywordStart >= 0 && /[A-Za-z]/.test(source[keywordStart])) {
        keywordStart -= 1;
      }
      keyword = source.slice(keywordStart + 1, keywordEnd);
    }
    return controlStatementKeywords.has(keyword);
  }
  return false;
};

const opensStatementBlock = (source, openingIndex) => {
  let index = openingIndex - 1;
  while (index >= 0 && /\s/.test(source[index])) {
    index -= 1;
  }
  if (
    index < 0 ||
    source[index] === ";" ||
    source[index] === "{" ||
    source[index] === "}"
  ) {
    return true;
  }
  if (source[index] === ")" && closesControlStatement(source, index)) {
    return true;
  }
  const prefix = source.slice(0, openingIndex);
  return (
    /(?:^|[;{}])\s*(?:(?:export\s+)?(?:default\s+)?)?(?:async\s+)?function(?:\s*\*)?\s+[A-Za-z_$][\w$]*\s*\([^)]*\)(?:\s*:\s*[^=;{}]+)?\s*$/.test(
      prefix,
    ) ||
    /(?:^|[;{}])\s*(?:class\s+[A-Za-z_$][\w$]*(?:\s+extends\s+[^{]+)?|(?:else|do|finally|try))\s*$/.test(
      prefix,
    )
  );
};

const closesStatementBlock = (source, closingIndex) => {
  let depth = 0;
  for (let index = closingIndex; index >= 0; index -= 1) {
    if (source[index] === "}") {
      depth += 1;
    } else if (source[index] === "{") {
      depth -= 1;
      if (depth === 0) {
        return opensStatementBlock(source, index);
      }
    }
  }
  return false;
};

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
  if (
    codeBeforeSlash[index] === "!" &&
    /[A-Za-z0-9_$)\]}]/.test(codeBeforeSlash[index - 1] ?? "")
  ) {
    return false;
  }
  if (
    codeBeforeSlash[index] === ")" &&
    closesControlStatement(codeBeforeSlash, index)
  ) {
    return true;
  }
  if (
    codeBeforeSlash[index] === "}" &&
    closesStatementBlock(codeBeforeSlash, index)
  ) {
    return true;
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

const jsxTagAt = ({ source, start, closing }) => {
  if (source[start] !== "<") {
    return undefined;
  }
  let cursor = start + 1;
  if (closing) {
    if (source[cursor] !== "/") {
      return undefined;
    }
    cursor += 1;
  } else if (source[cursor] === "/") {
    return undefined;
  }

  let name = "";
  if (source[cursor] !== ">") {
    const nameMatch = /^[A-Za-z][\w$:.-]*/.exec(source.slice(cursor));
    if (nameMatch === null) {
      return undefined;
    }
    name = nameMatch[0];
    cursor += name.length;
  }

  let quote = "";
  let escaped = false;
  let braceDepth = 0;
  const expressionStarts = new Set();
  let end = -1;
  for (let index = cursor; index < source.length; index += 1) {
    const character = source[index];
    if (quote !== "") {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = "";
      }
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") {
      if (braceDepth === 0) {
        expressionStarts.add(index);
      }
      braceDepth += 1;
      continue;
    }
    if (character === "}" && braceDepth > 0) {
      braceDepth -= 1;
      continue;
    }
    if (character === ">" && braceDepth === 0) {
      end = index;
      break;
    }
  }
  if (end === -1) {
    return undefined;
  }
  let beforeEnd = end - 1;
  while (beforeEnd > start && /\s/.test(source[beforeEnd])) {
    beforeEnd -= 1;
  }
  const selfClosing = !closing && source[beforeEnd] === "/";
  if (
    !closing &&
    !selfClosing &&
    source.indexOf(name === "" ? "</>" : `</${name}`, end + 1) === -1
  ) {
    return undefined;
  }
  return {
    closing,
    end,
    expressionStarts,
    selfClosing,
  };
};

const scanSource = (source) => {
  let result = "";
  let state = "code";
  let quote = "";
  let stringStart = -1;
  let regexStart = -1;
  let escaped = false;
  let inRegexCharacterClass = false;
  const templateExpressionDepths = [];
  const stringLiteralEnds = new Map();
  const regexLiteralEnds = new Map();
  const templateLiteralEnds = new Map();
  const templateStarts = [];
  let hasCodeLiteral = false;
  let hasJsxContent = false;
  let jsxMode;
  const jsxTags = [];
  const jsxElements = [];
  const jsxExpressions = [];

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
        stringLiteralEnds.set(stringStart, index);
        stringStart = -1;
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
          const templateStart = templateStarts.pop();
          if (templateStart !== undefined) {
            templateLiteralEnds.set(templateStart, index);
          }
          state = "code";
        }
      }
      continue;
    }
    if (state === "regex") {
      result += masked;
      if (character === "\n") {
        state = "code";
        regexStart = -1;
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
        regexLiteralEnds.set(regexStart, index);
        regexStart = -1;
        state = "code";
      }
      continue;
    }
    if (jsxMode === "text") {
      if (character === "{") {
        jsxExpressions.push({ depth: 1, returnMode: jsxMode });
        jsxMode = undefined;
        result += character;
        continue;
      }
      if (character === "<") {
        const tag =
          jsxTagAt({ source, start: index, closing: true }) ??
          jsxTagAt({ source, start: index, closing: false });
        if (tag !== undefined) {
          jsxTags.push({ ...tag, originMode: jsxMode });
          jsxMode = "tag";
          result += masked;
          continue;
        }
      }
      result += masked;
      continue;
    }
    if (jsxMode === "tag") {
      const tag = jsxTags.at(-1);
      if (tag?.expressionStarts.has(index)) {
        jsxExpressions.push({ depth: 1, returnMode: jsxMode });
        jsxMode = undefined;
        result += character;
        continue;
      }
      result += masked;
      if (tag !== undefined && index === tag.end) {
        jsxTags.pop();
        if (tag.closing) {
          jsxMode = jsxElements.pop()?.afterCloseMode;
        } else if (tag.selfClosing) {
          jsxMode = tag.originMode;
        } else {
          jsxElements.push({ afterCloseMode: tag.originMode });
          jsxMode = "text";
        }
      }
      continue;
    }
    const jsxExpression = jsxExpressions.at(-1);
    if (jsxExpression !== undefined && templateExpressionDepths.length === 0) {
      if (character === "{") {
        jsxExpression.depth += 1;
      } else if (character === "}") {
        jsxExpression.depth -= 1;
        result += character;
        if (jsxExpression.depth === 0) {
          jsxExpressions.pop();
          jsxMode = jsxExpression.returnMode;
        }
        continue;
      }
    }
    if (character === "<") {
      const tag = jsxTagAt({ source, start: index, closing: false });
      if (
        tag !== undefined &&
        (jsxExpression !== undefined || startsRegexLiteral(result))
      ) {
        jsxTags.push({
          ...tag,
          originMode: jsxExpression === undefined ? undefined : "expression",
        });
        jsxMode = "tag";
        hasJsxContent = true;
        result += masked;
        continue;
      }
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
    if (character === "/" && startsRegexLiteral(result)) {
      result += " ";
      state = "regex";
      regexStart = index;
      hasCodeLiteral = true;
      escaped = false;
      inRegexCharacterClass = false;
      continue;
    }
    if (character === '"' || character === "'") {
      result += " ";
      quote = character;
      stringStart = index;
      state = "string";
      hasCodeLiteral = true;
      escaped = false;
      continue;
    }
    if (character === "`") {
      result += " ";
      templateStarts.push(index);
      state = "template";
      hasCodeLiteral = true;
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
  return {
    structuralSource: result,
    stringLiteralEnds,
    regexLiteralEnds,
    templateLiteralEnds,
    hasCodeLiteral: hasCodeLiteral || hasJsxContent,
  };
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
const directNodeTestDisableRoots = new Set(["skip", "todo", "only"]);
const vitestNamespacePrefixRoots = [
  "xit",
  "xdescribe",
  "xtest",
  "fit",
  "fdescribe",
];

const staticStringLiteralAt = ({
  source,
  structuralSource,
  stringLiteralEnds,
  start,
  end = source.length,
}) => {
  for (let index = start; index < end; index += 1) {
    const literalEnd = stringLiteralEnds.get(index);
    if (literalEnd !== undefined && literalEnd < end) {
      return {
        value: source.slice(index + 1, literalEnd),
        end: literalEnd,
      };
    }
    if (!/\s/.test(structuralSource[index])) {
      return undefined;
    }
  }
  return undefined;
};

const staticRequireModuleAt = ({
  source,
  structuralSource,
  stringLiteralEnds,
  openingIndex,
}) => {
  const closingIndex = findMatchingDelimiter({
    source: structuralSource,
    openingIndex,
    opening: "(",
    closing: ")",
  });
  if (closingIndex === -1) {
    return undefined;
  }
  const moduleLiteral = staticStringLiteralAt({
    source,
    structuralSource,
    stringLiteralEnds,
    start: openingIndex + 1,
    end: closingIndex,
  });
  if (
    moduleLiteral === undefined ||
    skipWhitespace(structuralSource, moduleLiteral.end + 1) !== closingIndex
  ) {
    return undefined;
  }
  return { value: moduleLiteral.value, end: closingIndex + 1 };
};

const addNodeTestNamespaceRoots = ({ roots, namespace, callable }) => {
  if (callable) {
    roots.set(namespace, "test");
  }
  roots.set(`${namespace}.test`, "test");
  roots.set(`${namespace}.it`, "it");
  roots.set(`${namespace}.describe`, "describe");
  roots.set(`${namespace}.suite`, "describe");
  for (const root of directNodeTestDisableRoots) {
    roots.set(`${namespace}.${root}`, root);
  }
};

const importedTestRoots = ({ source, structuralSource, stringLiteralEnds }) => {
  const roots = new Map();
  const defaultImportPattern =
    /\bimport\s+([A-Za-z_$][\w$]*)\s*(?:,\s*(?:\{[\s\S]*?\}|\*\s+as\s+[A-Za-z_$][\w$]*))?\s*from\b/g;
  for (const match of structuralSource.matchAll(defaultImportPattern)) {
    const moduleLiteral = staticStringLiteralAt({
      source,
      structuralSource,
      stringLiteralEnds,
      start: (match.index ?? 0) + match[0].length,
    });
    if (moduleLiteral?.value === "node:test") {
      roots.set(match[1], "test");
    }
  }

  const importPattern = /\bimport\s*\{([\s\S]*?)\}\s*from\b/g;
  for (const match of structuralSource.matchAll(importPattern)) {
    const moduleLiteral = staticStringLiteralAt({
      source,
      structuralSource,
      stringLiteralEnds,
      start: (match.index ?? 0) + match[0].length,
    });
    if (moduleLiteral === undefined) {
      continue;
    }
    const moduleName = moduleLiteral.value;
    for (const specifier of match[1].split(",")) {
      const aliasMatch =
        /^\s*(test|it|describe|suite|context|xit|xdescribe|xtest|fit|fdescribe|skip|todo|only)(?:\s+as\s+([A-Za-z_$][\w$]*))?\s*$/.exec(
          specifier,
        );
      const importedName = aliasMatch?.[1];
      if (
        aliasMatch !== null &&
        (importedName === "test" ||
          (importedName !== undefined &&
            canonicalTestRoots.includes(importedName) &&
            namespaceTestModules.has(moduleName)) ||
          (moduleName === "node:test" &&
            importedName !== undefined &&
            directNodeTestDisableRoots.has(importedName)))
      ) {
        roots.set(aliasMatch[2] ?? aliasMatch[1], aliasMatch[1]);
      }
    }
  }

  const namespacePattern = /\bimport\s*\*\s*as\s+([A-Za-z_$][\w$]*)\s*from\b/g;
  for (const match of structuralSource.matchAll(namespacePattern)) {
    const namespace = match[1];
    const moduleLiteral = staticStringLiteralAt({
      source,
      structuralSource,
      stringLiteralEnds,
      start: (match.index ?? 0) + match[0].length,
    });
    if (moduleLiteral === undefined) {
      continue;
    }
    const moduleName = moduleLiteral.value;
    if (!namespaceTestModules.has(moduleName)) {
      continue;
    }
    roots.set(`${namespace}.test`, "test");
    if (moduleName !== "@playwright/test") {
      roots.set(`${namespace}.it`, "it");
      roots.set(`${namespace}.describe`, "describe");
      roots.set(`${namespace}.suite`, "describe");
    }
    if (moduleName === "vitest") {
      for (const root of vitestNamespacePrefixRoots) {
        roots.set(`${namespace}.${root}`, root);
      }
    }
    if (moduleName === "node:test") {
      addNodeTestNamespaceRoots({ roots, namespace, callable: false });
    }
  }

  const requireNamespacePattern =
    /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*require\s*\(/g;
  for (const match of structuralSource.matchAll(requireNamespacePattern)) {
    const requiredModule = staticRequireModuleAt({
      source,
      structuralSource,
      stringLiteralEnds,
      openingIndex: (match.index ?? 0) + match[0].lastIndexOf("("),
    });
    if (
      requiredModule?.value === "node:test" &&
      endsStaticAliasInitializer(structuralSource, requiredModule.end)
    ) {
      addNodeTestNamespaceRoots({
        roots,
        namespace: match[1],
        callable: true,
      });
    }
  }

  const requireDestructuringPattern =
    /\bconst\s*\{([^{}]*)\}\s*=\s*require\s*\(/g;
  for (const match of structuralSource.matchAll(requireDestructuringPattern)) {
    const requiredModule = staticRequireModuleAt({
      source,
      structuralSource,
      stringLiteralEnds,
      openingIndex: (match.index ?? 0) + match[0].lastIndexOf("("),
    });
    if (
      requiredModule?.value !== "node:test" ||
      !endsStaticAliasInitializer(structuralSource, requiredModule.end)
    ) {
      continue;
    }
    for (const specifier of match[1].split(",")) {
      const aliasMatch =
        /^\s*(test|it|describe|suite|context|xit|xdescribe|xtest|fit|fdescribe|skip|todo|only)(?:\s*:\s*([A-Za-z_$][\w$]*))?\s*$/.exec(
          specifier,
        );
      if (aliasMatch !== null) {
        roots.set(aliasMatch[2] ?? aliasMatch[1], aliasMatch[1]);
      }
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
  return new RegExp(`(?<![\\w$.#])(${roots})(?![\\w$])`, "g");
};

const staticBracketMember = (source, start, end) => {
  const match = /^(["'])([A-Za-z_$][\w$]*)\1$/.exec(
    source.slice(start, end).trim(),
  );
  return match?.[2];
};

const staticMemberPathAt = ({ source, structuralSource, start }) => {
  const rootMatch = /^[A-Za-z_$][\w$]*/.exec(structuralSource.slice(start));
  if (rootMatch === null) {
    return undefined;
  }
  const members = [rootMatch[0]];
  let cursor = start + rootMatch[0].length;
  while (cursor < structuralSource.length) {
    cursor = skipWhitespace(structuralSource, cursor);
    if (structuralSource[cursor] === ".") {
      const memberStart = skipWhitespace(structuralSource, cursor + 1);
      const memberMatch = /^[A-Za-z_$][\w$]*/.exec(
        structuralSource.slice(memberStart),
      );
      if (memberMatch === null) {
        break;
      }
      members.push(memberMatch[0]);
      cursor = memberStart + memberMatch[0].length;
      continue;
    }
    if (structuralSource[cursor] !== "[") {
      break;
    }
    const closingBracket = findMatchingDelimiter({
      source: structuralSource,
      openingIndex: cursor,
      opening: "[",
      closing: "]",
    });
    if (closingBracket === -1) {
      break;
    }
    const member = staticBracketMember(source, cursor + 1, closingBracket);
    if (member === undefined) {
      break;
    }
    members.push(member);
    cursor = closingBracket + 1;
  }
  return { path: members.join("."), end: cursor };
};

const aliasableTestMembers = new Set([
  ...canonicalTestRoots,
  "fixme",
  "only",
  "skip",
  "todo",
]);

const resolvedTestRoot = (roots, path) => {
  const direct = roots.get(path);
  if (direct !== undefined) {
    return direct;
  }
  if (canonicalTestRoots.includes(path)) {
    return path;
  }
  const separator = path.lastIndexOf(".");
  if (separator === -1) {
    return undefined;
  }
  const base = resolvedTestRoot(roots, path.slice(0, separator));
  const member = path.slice(separator + 1);
  return base !== undefined && aliasableTestMembers.has(member)
    ? member
    : undefined;
};

const endsStaticAliasInitializer = (structuralSource, end) => {
  for (let index = end; index < structuralSource.length; index += 1) {
    if (structuralSource[index] === "\n") {
      return true;
    }
    if (!/\s/.test(structuralSource[index])) {
      return structuralSource[index] === ";" || structuralSource[index] === ",";
    }
  }
  return true;
};

const resolvedStaticTestRootInitializer = ({
  source,
  structuralSource,
  start,
  roots,
}) => {
  const initializer = staticMemberPathAt({
    source,
    structuralSource,
    start,
  });
  if (initializer === undefined) {
    return undefined;
  }
  const directRoot = resolvedTestRoot(roots, initializer.path);
  if (
    directRoot !== undefined &&
    endsStaticAliasInitializer(structuralSource, initializer.end)
  ) {
    return directRoot;
  }

  const separator = initializer.path.lastIndexOf(".");
  if (separator === -1 || initializer.path.slice(separator + 1) !== "extend") {
    return undefined;
  }
  const baseRoot = resolvedTestRoot(
    roots,
    initializer.path.slice(0, separator),
  );
  if (baseRoot === undefined) {
    return undefined;
  }
  const openingIndex = skipStaticTypeArguments(
    structuralSource,
    skipWhitespace(structuralSource, initializer.end),
  );
  if (structuralSource[openingIndex] !== "(") {
    return undefined;
  }
  const closingIndex = findMatchingDelimiter({
    source: structuralSource,
    openingIndex,
    opening: "(",
    closing: ")",
  });
  return closingIndex !== -1 &&
    endsStaticAliasInitializer(structuralSource, closingIndex + 1)
    ? baseRoot
    : undefined;
};

const staticTestRootAliases = ({ source, structuralSource, importedRoots }) => {
  const roots = new Map(importedRoots);
  let changed = true;
  while (changed) {
    changed = false;
    const assignmentPattern = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*/g;
    for (const match of structuralSource.matchAll(assignmentPattern)) {
      const localName = match[1];
      const root = resolvedStaticTestRootInitializer({
        source,
        structuralSource,
        start: (match.index ?? 0) + match[0].length,
        roots,
      });
      if (root !== undefined && !roots.has(localName)) {
        roots.set(localName, root);
        changed = true;
      }
    }

    const destructuringPattern = /\bconst\s*\{([^{}]*)\}\s*=\s*/g;
    for (const match of structuralSource.matchAll(destructuringPattern)) {
      const initializer = staticMemberPathAt({
        source,
        structuralSource,
        start: (match.index ?? 0) + match[0].length,
      });
      if (
        initializer === undefined ||
        !endsStaticAliasInitializer(structuralSource, initializer.end)
      ) {
        continue;
      }
      for (const specifier of match[1].split(",")) {
        const aliasMatch =
          /^\s*([A-Za-z_$][\w$]*)(?:\s*:\s*([A-Za-z_$][\w$]*))?\s*$/.exec(
            specifier,
          );
        if (aliasMatch === null) {
          continue;
        }
        const root = resolvedTestRoot(
          roots,
          `${initializer.path}.${aliasMatch[1]}`,
        );
        const localName = aliasMatch[2] ?? aliasMatch[1];
        if (root !== undefined && !roots.has(localName)) {
          roots.set(localName, root);
          changed = true;
        }
      }
    }
  }
  return roots;
};

const braceScopes = (structuralSource) => {
  const topLevel = {
    openingIndex: -1,
    closingIndex: structuralSource.length,
  };
  const scopes = [topLevel];
  const stack = [topLevel];
  for (let index = 0; index < structuralSource.length; index += 1) {
    if (structuralSource[index] === "{") {
      const scope = {
        openingIndex: index,
        closingIndex: structuralSource.length,
      };
      scopes.push(scope);
      stack.push(scope);
    } else if (structuralSource[index] === "}" && stack.length > 1) {
      const scope = stack.pop();
      if (scope !== undefined) {
        scope.closingIndex = index;
      }
    }
  }
  return scopes;
};

const innermostScopeAt = (scopes, index) =>
  scopes
    .filter((scope) => scope.openingIndex < index && index < scope.closingIndex)
    .at(-1);

const splitTopLevelBindings = (source) => {
  const bindings = [];
  const closingFor = { "(": ")", "[": "]", "{": "}" };
  const stack = [];
  let start = 0;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (Object.hasOwn(closingFor, character)) {
      stack.push(closingFor[character]);
    } else if (character === stack.at(-1)) {
      stack.pop();
    } else if (character === "," && stack.length === 0) {
      bindings.push(source.slice(start, index));
      start = index + 1;
    }
  }
  bindings.push(source.slice(start));
  return bindings;
};

const topLevelBindingOperator = (source, operator) => {
  const closingFor = { "(": ")", "[": "]", "{": "}" };
  const stack = [];
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (Object.hasOwn(closingFor, character)) {
      stack.push(closingFor[character]);
    } else if (character === stack.at(-1)) {
      stack.pop();
    } else if (character === operator && stack.length === 0) {
      return index;
    }
  }
  return -1;
};

const bindingNamesForPattern = (pattern) => {
  let trimmed = pattern.trim().replace(/^\.\.\./, "");
  const assignmentIndex = topLevelBindingOperator(trimmed, "=");
  if (assignmentIndex !== -1) {
    trimmed = trimmed.slice(0, assignmentIndex).trim();
  }
  const direct = /^([A-Za-z_$][\w$]*)/.exec(trimmed);
  if (direct !== null) {
    return [direct[1]];
  }

  const opening = trimmed[0];
  const closing = opening === "[" ? "]" : opening === "{" ? "}" : "";
  if (closing === "") {
    return [];
  }
  const closingIndex = findMatchingDelimiter({
    source: trimmed,
    openingIndex: 0,
    opening,
    closing,
  });
  if (closingIndex === -1) {
    return [];
  }

  return splitTopLevelBindings(trimmed.slice(1, closingIndex)).flatMap(
    (binding) => {
      if (opening === "[") {
        return bindingNamesForPattern(binding);
      }
      const property = binding.trim();
      const colonIndex = topLevelBindingOperator(property, ":");
      return bindingNamesForPattern(
        colonIndex === -1 ? property : property.slice(colonIndex + 1),
      );
    },
  );
};

const parameterBindingNames = (parameters) =>
  splitTopLevelBindings(parameters).flatMap(bindingNamesForPattern);

const scopeRangeForOpening = (scopes, openingIndex) => {
  const scope = scopes.find(
    (candidate) => candidate.openingIndex === openingIndex,
  );
  return scope === undefined
    ? undefined
    : { start: scope.openingIndex, end: scope.closingIndex };
};

const parameterBodyAfter = ({ structuralSource, closingIndex }) => {
  let cursor = skipWhitespace(structuralSource, closingIndex + 1);
  if (structuralSource.startsWith("=>", cursor)) {
    cursor = skipWhitespace(structuralSource, cursor + 2);
    return structuralSource[cursor] === "{"
      ? { openingIndex: cursor, arrow: true }
      : undefined;
  }
  if (structuralSource[cursor] === "{") {
    return { openingIndex: cursor, arrow: false };
  }
  if (structuralSource[cursor] !== ":") {
    return undefined;
  }

  for (let index = cursor + 1; index < structuralSource.length; index += 1) {
    if (structuralSource.startsWith("=>", index)) {
      const openingIndex = skipWhitespace(structuralSource, index + 2);
      return structuralSource[openingIndex] === "{"
        ? { openingIndex, arrow: true }
        : undefined;
    }
    if (structuralSource[index] !== "{") {
      continue;
    }
    const closingType = findMatchingDelimiter({
      source: structuralSource,
      openingIndex: index,
      opening: "{",
      closing: "}",
    });
    if (closingType === -1) {
      return undefined;
    }
    const afterType = skipWhitespace(structuralSource, closingType + 1);
    if (structuralSource[afterType] === "{") {
      return { openingIndex: afterType, arrow: false };
    }
    if (structuralSource.startsWith("=>", afterType)) {
      const openingIndex = skipWhitespace(structuralSource, afterType + 2);
      return structuralSource[openingIndex] === "{"
        ? { openingIndex, arrow: true }
        : undefined;
    }
    return { openingIndex: index, arrow: false };
  }
  return undefined;
};

const callableParameterLists = ({ structuralSource, scopes }) => {
  const lists = [];
  const excludedNames = new Set(["for", "if", "switch", "while", "with"]);
  for (
    let openingIndex = 0;
    openingIndex < structuralSource.length;
    openingIndex += 1
  ) {
    if (structuralSource[openingIndex] !== "(") {
      continue;
    }
    const closingIndex = findMatchingDelimiter({
      source: structuralSource,
      openingIndex,
      opening: "(",
      closing: ")",
    });
    if (closingIndex === -1) {
      continue;
    }
    const body = parameterBodyAfter({ structuralSource, closingIndex });
    if (body === undefined) {
      continue;
    }
    const prefix = structuralSource.slice(0, openingIndex);
    const callableName = /([A-Za-z_$][\w$]*)\s*$/.exec(prefix)?.[1];
    const functionExpression =
      /\bfunction(?:\s*\*)?(?:\s+[A-Za-z_$][\w$]*)?\s*$/.test(prefix);
    if (
      !body.arrow &&
      !functionExpression &&
      (callableName === undefined || excludedNames.has(callableName))
    ) {
      continue;
    }
    const range = scopeRangeForOpening(scopes, body.openingIndex);
    if (range !== undefined) {
      lists.push({ openingIndex, closingIndex, range });
    }
  }
  return lists;
};

const parameterBindingsForScopes = ({ structuralSource, scopes }) => {
  const bindings = callableParameterLists({ structuralSource, scopes }).flatMap(
    ({ openingIndex, closingIndex, range }) =>
      parameterBindingNames(
        structuralSource.slice(openingIndex + 1, closingIndex),
      ).map((name) => ({ name, declarationIndex: openingIndex, range })),
  );
  for (const match of structuralSource.matchAll(
    /\b([A-Za-z_$][\w$]*)\s*=>\s*\{/g,
  )) {
    const openingIndex = (match.index ?? 0) + match[0].lastIndexOf("{");
    const range = scopeRangeForOpening(scopes, openingIndex);
    if (range !== undefined) {
      bindings.push({
        name: match[1],
        declarationIndex: match.index ?? 0,
        range,
      });
    }
  }
  return bindings;
};

const testRootShadowRanges = ({
  source,
  structuralSource,
  stringLiteralEnds,
  testRoots,
}) => {
  const rootNames = new Set([
    ...canonicalTestRoots,
    ...[...testRoots.keys()].map((root) => root.split(".")[0]),
  ]);
  const scopes = braceScopes(structuralSource);
  const rangesByRoot = new Map();
  const addRange = (root, range) => {
    if (!rootNames.has(root) || range === undefined) {
      return;
    }
    const ranges = rangesByRoot.get(root) ?? [];
    ranges.push(range);
    rangesByRoot.set(root, ranges);
  };
  const bodyRange = (openingIndex) =>
    scopeRangeForOpening(scopes, openingIndex);
  const singleStatementEnd = (start) => {
    const stack = [];
    const closingFor = { "(": ")", "[": "]", "{": "}" };
    for (let index = start; index < structuralSource.length; index += 1) {
      const character = structuralSource[index];
      if (Object.hasOwn(closingFor, character)) {
        stack.push(closingFor[character]);
      } else if (character === stack.at(-1)) {
        stack.pop();
      } else if (character === ";" && stack.length === 0) {
        return index;
      }
    }
    return structuralSource.length;
  };
  const forLoopRangeAt = (declarationIndex) => {
    const forPattern = /\bfor(?:\s+await)?\s*\(/g;
    let range;
    for (const match of structuralSource.matchAll(forPattern)) {
      const openingIndex = (match.index ?? 0) + match[0].lastIndexOf("(");
      if (openingIndex >= declarationIndex) {
        break;
      }
      const closingIndex = findMatchingDelimiter({
        source: structuralSource,
        openingIndex,
        opening: "(",
        closing: ")",
      });
      if (closingIndex === -1 || declarationIndex >= closingIndex) {
        continue;
      }
      const bodyStart = skipWhitespace(structuralSource, closingIndex + 1);
      const body =
        structuralSource[bodyStart] === "{" ? bodyRange(bodyStart) : undefined;
      range = {
        start: openingIndex,
        end: body?.end ?? singleStatementEnd(bodyStart),
      };
    }
    return range;
  };
  const variablePattern = /\b(const|let|var)\s+([A-Za-z_$][\w$]*)\b/g;
  for (const match of structuralSource.matchAll(variablePattern)) {
    const localName = match[2];
    if (!rootNames.has(localName)) {
      continue;
    }
    const nameEnd =
      (match.index ?? 0) + match[0].lastIndexOf(localName) + localName.length;
    const assignmentIndex = skipWhitespace(structuralSource, nameEnd);
    const initializerStart = skipWhitespace(
      structuralSource,
      assignmentIndex + 1,
    );
    const staticAliasRoot =
      structuralSource[assignmentIndex] === "="
        ? resolvedStaticTestRootInitializer({
            source,
            structuralSource,
            start: initializerStart,
            roots: testRoots,
          })
        : undefined;
    const requireOpeningIndex =
      structuralSource[assignmentIndex] === "=" &&
      structuralSource.startsWith("require", initializerStart)
        ? skipWhitespace(structuralSource, initializerStart + "require".length)
        : -1;
    const requiredModule =
      requireOpeningIndex !== -1 &&
      structuralSource[requireOpeningIndex] === "("
        ? staticRequireModuleAt({
            source,
            structuralSource,
            stringLiteralEnds,
            openingIndex: requireOpeningIndex,
          })
        : undefined;
    const aliasesTestRoot =
      (requiredModule?.value === "node:test" &&
        endsStaticAliasInitializer(structuralSource, requiredModule.end)) ||
      staticAliasRoot !== undefined;
    if (!aliasesTestRoot) {
      const scope = innermostScopeAt(scopes, match.index ?? 0);
      const loopRange =
        match[1] === "var" ? undefined : forLoopRangeAt(match.index ?? 0);
      addRange(
        localName,
        loopRange ??
          (scope === undefined
            ? undefined
            : { start: scope.openingIndex, end: scope.closingIndex }),
      );
    }
  }

  const declarationPattern =
    /\b(?:function(?:\s*\*)?|class)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of structuralSource.matchAll(declarationPattern)) {
    const scope = innermostScopeAt(scopes, match.index ?? 0);
    addRange(
      match[1],
      scope === undefined
        ? undefined
        : { start: scope.openingIndex, end: scope.closingIndex },
    );
  }

  for (const binding of parameterBindingsForScopes({
    structuralSource,
    scopes,
  })) {
    addRange(binding.name, binding.range);
  }

  return rangesByRoot;
};

const isTestRootShadowed = ({ root, index, shadowRanges }) =>
  (shadowRanges.get(root.split(".")[0]) ?? []).some(
    (range) => range.start < index && index < range.end,
  );

const groupingParenthesesBefore = (source, rootIndex) => {
  let cursor = rootIndex;
  let count = 0;
  while (cursor > 0) {
    let openingIndex = cursor - 1;
    while (openingIndex >= 0 && /\s/.test(source[openingIndex])) {
      openingIndex -= 1;
    }
    if (
      source[openingIndex] !== "(" ||
      !startsRegexLiteral(source.slice(0, openingIndex))
    ) {
      break;
    }
    count += 1;
    cursor = openingIndex;
  }
  return count;
};

const skipGroupingClosings = ({ source, start, remaining }) => {
  let cursor = skipWhitespace(source, start);
  let grouping = remaining;
  while (grouping > 0 && source[cursor] === ")") {
    grouping -= 1;
    cursor = skipWhitespace(source, cursor + 1);
  }
  return { cursor, remaining: grouping };
};

const skipStaticTypeArguments = (source, start) => {
  if (source[start] !== "<") {
    return start;
  }
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "<") {
      depth += 1;
    } else if (source[index] === ">" && source[index - 1] !== "=") {
      depth -= 1;
      if (depth === 0) {
        const afterTypeArguments = skipWhitespace(source, index + 1);
        return source[afterTypeArguments] === "(" ? afterTypeArguments : start;
      }
    }
  }
  return start;
};

const taggedTemplateAt = ({ structuralSource, templateLiteralEnds, start }) => {
  for (let index = start; index < structuralSource.length; index += 1) {
    const end = templateLiteralEnds.get(index);
    if (end !== undefined) {
      return { start: index, end };
    }
    if (!/\s/.test(structuralSource[index])) {
      return undefined;
    }
  }
  return undefined;
};

const parseTestCalls = (source) => {
  const { structuralSource, stringLiteralEnds, templateLiteralEnds } =
    scanSource(source);
  const importedRoots = importedTestRoots({
    source,
    structuralSource,
    stringLiteralEnds,
  });
  const testRoots = staticTestRootAliases({
    source,
    structuralSource,
    importedRoots,
  });
  const shadowRanges = testRootShadowRanges({
    source,
    structuralSource,
    stringLiteralEnds,
    testRoots,
  });
  const calls = [];
  for (const match of structuralSource.matchAll(
    testRootPatternFor(testRoots),
  )) {
    const root = match[1];
    if (
      isTestRootShadowed({
        root,
        index: match.index ?? 0,
        shadowRanges,
      })
    ) {
      continue;
    }
    let groupingDepth = groupingParenthesesBefore(
      structuralSource,
      match.index ?? 0,
    );
    let cursor = skipWhitespace(
      structuralSource,
      (match.index ?? 0) + match[0].length,
    );
    const modifiers = [];
    const modifierArguments = new Map();
    const modifierTaggedTemplates = new Map();
    let terminalModifier;
    let openingIndex = -1;

    while (cursor < structuralSource.length) {
      const afterGrouping = skipGroupingClosings({
        source: structuralSource,
        start: cursor,
        remaining: groupingDepth,
      });
      cursor = afterGrouping.cursor;
      groupingDepth = afterGrouping.remaining;
      cursor = skipStaticTypeArguments(structuralSource, cursor);
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
          modifier = staticBracketMember(source, cursor + 1, closingBracket);
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
        modifier = staticBracketMember(source, cursor + 1, closingBracket);
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
        const modifierEnd = cursor + modifier.length;
        const taggedTemplate =
          modifier === "each"
            ? taggedTemplateAt({
                structuralSource,
                templateLiteralEnds,
                start: modifierEnd,
              })
            : undefined;
        cursor =
          taggedTemplate?.start ??
          skipWhitespace(structuralSource, modifierEnd);
        modifiers.push(modifier);
        if (taggedTemplate !== undefined) {
          modifierTaggedTemplates.set(modifier, taggedTemplate);
          cursor = skipWhitespace(structuralSource, taggedTemplate.end + 1);
          if (structuralSource[cursor] === "(") {
            openingIndex = cursor;
            break;
          }
          if (structuralSource[cursor] === ".") {
            continue;
          }
          break;
        }
      } else {
        modifiers.push(modifier);
      }
      cursor = skipStaticTypeArguments(structuralSource, cursor);
      if (structuralSource[cursor] !== "(") {
        continue;
      }

      const parsedModifier = readCallArguments({
        source,
        structuralSource,
        openingIndex: cursor,
      });
      modifierArguments.set(modifier, parsedModifier.arguments);
      const afterModifierGrouping = skipGroupingClosings({
        source: structuralSource,
        start: parsedModifier.closingIndex + 1,
        remaining: groupingDepth,
      });
      const afterModifier = afterModifierGrouping.cursor;
      groupingDepth = afterModifierGrouping.remaining;
      if (structuralSource[afterModifier] === "(") {
        openingIndex = afterModifier;
        break;
      }
      if (structuralSource[afterModifier] === ".") {
        cursor = afterModifier;
        continue;
      }
      terminalModifier = modifier;
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
      importedRoot: testRoots.get(root),
      modifiers,
      modifierArguments,
      modifierTaggedTemplates,
      terminalModifier,
      openingIndex,
      closingIndex: parsedCall.closingIndex,
      arguments: parsedCall.arguments,
    });
  }
  return {
    calls,
    structuralSource,
    stringLiteralEnds,
    optionBindings: staticOptionBindings({ source, structuralSource }),
  };
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
    case "skip":
    case "todo":
    case "only":
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

const nonTestCaseModifiers = new Set([
  "afterAll",
  "afterEach",
  "beforeAll",
  "beforeEach",
  "extend",
  "info",
  "setTimeout",
  "slow",
  "step",
  "use",
]);

const runtimeAnnotationForCall = (call) => {
  const sourceRoot = call.importedRoot ?? call.root;
  const mode =
    call.terminalModifier ??
    (sourceRoot === "skip" || sourceRoot === "fixme" ? sourceRoot : undefined);
  if (mode !== "skip" && mode !== "fixme") {
    return undefined;
  }
  const annotationArguments =
    call.terminalModifier === mode
      ? (call.modifierArguments.get(mode) ?? [])
      : call.arguments;
  if (
    annotationArguments.length < 2 ||
    annotationArguments[0]?.structural.trim() === "" ||
    annotationArguments[1]?.structural.trim() !== "" ||
    !/^["'`]/.test(annotationArguments[1]?.raw.trim() ?? "")
  ) {
    return undefined;
  }
  return { mode, arguments: annotationArguments };
};

const isTestCaseCall = (call) => {
  const root = normalizedTestRoot(call);
  return (
    (root === "test" || root === "it") &&
    !call.modifiers.some((modifier) => nonTestCaseModifiers.has(modifier)) &&
    runtimeAnnotationForCall(call) === undefined
  );
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

const staticOptionKeyAt = ({
  source,
  structuralSource,
  stringLiteralEnds,
  start,
  end,
}) => {
  const identifierMatch = /^[A-Za-z_$][\w$]*/.exec(
    structuralSource.slice(start),
  );
  if (identifierMatch !== null) {
    return {
      key: identifierMatch[0],
      end: start + identifierMatch[0].length,
    };
  }

  const literalEnd = stringLiteralEnds.get(start);
  if (literalEnd !== undefined && literalEnd < end) {
    return {
      key: source.slice(start + 1, literalEnd),
      end: literalEnd + 1,
    };
  }

  if (structuralSource[start] !== "[") {
    return undefined;
  }
  const closingBracket = findMatchingDelimiter({
    source: structuralSource,
    openingIndex: start,
    opening: "[",
    closing: "]",
  });
  if (closingBracket === -1 || closingBracket >= end) {
    return undefined;
  }
  const literal = staticStringLiteralAt({
    source,
    structuralSource,
    stringLiteralEnds,
    start: start + 1,
    end: closingBracket,
  });
  if (
    literal === undefined ||
    structuralSource.slice(literal.end + 1, closingBracket).trim() !== ""
  ) {
    return undefined;
  }
  return { key: literal.value, end: closingBracket + 1 };
};

const activeOptionModeConditions = ({
  argument,
  source,
  structuralSource,
  stringLiteralEnds,
}) => {
  const modes = new Map();
  const objectStart = skipWhitespace(structuralSource, argument.start);
  if (structuralSource[objectStart] !== "{") {
    return modes;
  }

  let braces = 0;
  let brackets = 0;
  let parentheses = 0;
  for (let index = objectStart; index < argument.end; index += 1) {
    const character = structuralSource[index];
    if (braces === 1 && brackets === 0 && parentheses === 0) {
      const property = staticOptionKeyAt({
        source,
        structuralSource,
        stringLiteralEnds,
        start: index,
        end: argument.end,
      });
      if (property !== undefined) {
        const colonIndex = skipWhitespace(structuralSource, property.end);
        const shorthand =
          structuralSource[colonIndex] === "," ||
          structuralSource[colonIndex] === "}";
        if (!["skip", "only", "todo"].includes(property.key)) {
          index = property.end - 1;
          continue;
        }
        if (structuralSource[colonIndex] !== ":" && !shorthand) {
          index = property.end - 1;
          continue;
        }

        const valueStart =
          structuralSource[colonIndex] === ":"
            ? skipWhitespace(structuralSource, colonIndex + 1)
            : index;
        const valueEnd =
          structuralSource[colonIndex] === ":"
            ? readPropertyValueEnd({
                structuralSource,
                start: valueStart,
                objectEnd: argument.end,
              })
            : property.end;
        const valueStructural = structuralSource
          .slice(valueStart, valueEnd)
          .trim();
        if (valueStructural !== "false") {
          const conditionIdentity =
            valueStructural === "" || valueStructural === "true"
              ? ""
              : normalizedConditionCode(source.slice(valueStart, valueEnd));
          modes.set(property.key, conditionIdentity);
        }
        index = valueEnd - 1;
        continue;
      }
    }
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
  }
  return modes;
};

const staticOptionBindings = ({ source, structuralSource }) => {
  const scopes = braceScopes(structuralSource);
  const bindings = [];
  const addBinding = ({ name, declarationIndex, argument }) => {
    const scope = innermostScopeAt(scopes, declarationIndex);
    if (scope === undefined) {
      return;
    }
    bindings.push({
      name,
      declarationIndex,
      argument,
      range: { start: scope.openingIndex, end: scope.closingIndex },
    });
  };

  const variablePattern = /\b(const|let|var)\s+([A-Za-z_$][\w$]*)\b/g;
  for (const match of structuralSource.matchAll(variablePattern)) {
    const declarationIndex = match.index ?? 0;
    const name = match[2];
    const nameEnd = declarationIndex + match[0].lastIndexOf(name) + name.length;
    const assignmentIndex = skipWhitespace(structuralSource, nameEnd);
    const objectStart = skipWhitespace(structuralSource, assignmentIndex + 1);
    let argument;
    if (
      match[1] === "const" &&
      structuralSource[assignmentIndex] === "=" &&
      structuralSource[objectStart] === "{"
    ) {
      const objectEnd = findMatchingDelimiter({
        source: structuralSource,
        openingIndex: objectStart,
        opening: "{",
        closing: "}",
      });
      const staticTypeSuffixPattern =
        /^(?:as\s+(?:const\b|[A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)|satisfies\s+[A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)/;
      let initializerEnd = objectEnd + 1;
      let suffix;
      while (objectEnd !== -1) {
        initializerEnd = skipWhitespace(structuralSource, initializerEnd);
        suffix = staticTypeSuffixPattern.exec(
          structuralSource.slice(initializerEnd),
        );
        if (suffix === null) {
          break;
        }
        initializerEnd += suffix[0].length;
      }
      if (
        objectEnd !== -1 &&
        endsStaticAliasInitializer(structuralSource, initializerEnd)
      ) {
        argument = argumentRange({
          source,
          structuralSource,
          start: objectStart,
          end: objectEnd + 1,
        });
      }
    }
    addBinding({ name, declarationIndex, argument });
  }

  const declarationPattern =
    /\b(?:function(?:\s*\*)?|class)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of structuralSource.matchAll(declarationPattern)) {
    addBinding({
      name: match[1],
      declarationIndex: match.index ?? 0,
      argument: undefined,
    });
  }
  bindings.push(...parameterBindingsForScopes({ structuralSource, scopes }));
  return bindings;
};

const resolvedOptionArgument = ({ argument, call, optionBindings }) => {
  const name = /^([A-Za-z_$][\w$]*)$/.exec(argument.structural.trim())?.[1];
  if (name === undefined) {
    return argument;
  }
  const binding = optionBindings
    .filter(
      (candidate) =>
        candidate.name === name &&
        candidate.range.start < call.openingIndex &&
        call.openingIndex < candidate.range.end,
    )
    .sort(
      (left, right) =>
        left.range.start - right.range.start ||
        left.declarationIndex - right.declarationIndex,
    )
    .at(-1);
  return binding?.argument !== undefined &&
    binding.declarationIndex < call.openingIndex
    ? binding.argument
    : argument;
};

const optionModeConditionsForCall = ({
  call,
  source,
  structuralSource,
  stringLiteralEnds,
  optionBindings,
}) => {
  const conditions = new Map();
  for (const argument of call.arguments.slice(0, 2)) {
    const resolvedArgument = resolvedOptionArgument({
      argument,
      call,
      optionBindings,
    });
    for (const [mode, conditionIdentity] of activeOptionModeConditions({
      argument: resolvedArgument,
      source,
      structuralSource,
      stringLiteralEnds,
    })) {
      conditions.set(mode, conditionIdentity);
    }
  }
  return conditions;
};

const disableModesForCall = ({
  call,
  source,
  structuralSource,
  stringLiteralEnds,
  optionBindings,
}) => {
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
  if (directNodeTestDisableRoots.has(sourceRoot)) {
    modes.add(sourceRoot);
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
  for (const mode of optionModeConditionsForCall({
    call,
    source,
    structuralSource,
    stringLiteralEnds,
    optionBindings,
  }).keys()) {
    modes.add(mode);
  }
  return modes;
};

const normalizedStructuralCode = (source) => source.replace(/\s+/g, "");
const normalizedSourceFragment = (source) => source.trim().replace(/\s+/g, " ");

const normalizedConditionCode = (source) => {
  const {
    structuralSource,
    stringLiteralEnds,
    regexLiteralEnds,
    templateLiteralEnds,
  } = scanSource(source);
  let result = "";
  for (let index = 0; index < source.length; index += 1) {
    const literalEnd =
      stringLiteralEnds.get(index) ??
      regexLiteralEnds.get(index) ??
      templateLiteralEnds.get(index);
    if (literalEnd !== undefined) {
      result += source.slice(index, literalEnd + 1);
      index = literalEnd;
    } else if (!/\s/.test(structuralSource[index])) {
      result += structuralSource[index];
    }
  }
  return result;
};

const disableConditionIdentity = (call, mode) => {
  const modifierArguments = call.modifierArguments.get(mode) ?? [];
  if (mode === "skipIf" || mode === "runIf") {
    return normalizedConditionCode(modifierArguments[0]?.raw ?? "");
  }
  const annotation = runtimeAnnotationForCall(call);
  if (annotation?.mode === mode) {
    return normalizedConditionCode(annotation.arguments[0].raw);
  }
  return "";
};

const staticInlineEachTable = ({ call, source, structuralSource }) => {
  const tableArgument = call.modifierArguments.get("each")?.[0];
  if (tableArgument === undefined) {
    return undefined;
  }
  const openingIndex = skipWhitespace(structuralSource, tableArgument.start);
  if (structuralSource[openingIndex] !== "[") {
    return undefined;
  }
  const closingIndex = findMatchingDelimiter({
    source: structuralSource,
    openingIndex,
    opening: "[",
    closing: "]",
  });
  if (
    closingIndex === -1 ||
    skipWhitespace(structuralSource, closingIndex + 1) !== tableArgument.end
  ) {
    return undefined;
  }

  const ranges = [];
  let start = openingIndex + 1;
  let depth = 0;
  for (let index = start; index < closingIndex; index += 1) {
    const character = structuralSource[index];
    if (character === "(" || character === "[" || character === "{") {
      depth += 1;
    } else if (character === ")" || character === "]" || character === "}") {
      depth = Math.max(0, depth - 1);
    } else if (character === "," && depth === 0) {
      ranges.push(
        argumentRange({
          source,
          structuralSource,
          start,
          end: index,
        }),
      );
      start = index + 1;
    }
  }
  if (source.slice(start, closingIndex).trim() !== "") {
    ranges.push(
      argumentRange({
        source,
        structuralSource,
        start,
        end: closingIndex,
      }),
    );
  }
  if (
    ranges.some(
      (range) => range.raw === "" || range.structural.trim().startsWith("..."),
    )
  ) {
    return undefined;
  }
  return {
    kind: "inline-array",
    rows: ranges.map((range) => normalizedConditionCode(range.raw)),
  };
};

const staticTaggedEachTable = ({ call, source }) => {
  const table = call.modifierTaggedTemplates.get("each");
  if (table === undefined) {
    return undefined;
  }
  const lines = source
    .slice(table.start + 1, table.end)
    .split(/\r?\n/)
    .map(normalizedSourceFragment)
    .filter((line) => line !== "");
  if (lines.length === 0) {
    return undefined;
  }
  const [header, ...rows] = lines;
  return {
    kind: "tagged-template",
    rows: rows.map((row) => `${header}|${row}`),
  };
};

const staticEachTableForCall = ({ call, source, structuralSource }) => {
  if (!call.modifiers.includes("each")) {
    return undefined;
  }
  return (
    staticInlineEachTable({ call, source, structuralSource }) ??
    staticTaggedEachTable({ call, source })
  );
};

const staticEachRowsPreserved = (before, after) => {
  if (
    before === undefined ||
    after === undefined ||
    before.kind !== after.kind
  ) {
    return true;
  }
  const remainingRows = [...after.rows];
  for (const row of before.rows) {
    const index = remainingRows.indexOf(row);
    if (index === -1) {
      return false;
    }
    remainingRows.splice(index, 1);
  }
  return true;
};

const testCallDescriptors = (source) => {
  const parsed = parseTestCalls(source);
  const scopes = assignSuitePaths(suiteScopes(parsed));
  const positions = new Map();
  const casePositions = new Map();
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
    const testCase = isTestCaseCall(call);
    const casePosition = testCase
      ? (casePositions.get(positionalContext) ?? 0) + 1
      : 0;
    if (testCase) {
      casePositions.set(positionalContext, casePosition);
    }
    const matchingRoot = root === "it" ? "test" : root;
    const title = normalizedSourceFragment(call.arguments[0]?.raw ?? "");
    const callback = call.arguments.at(-1)?.structural ?? "";
    const callbackIdentity = normalizedStructuralCode(callback);
    const positionalIdentity = `${matchingRoot}|${positionalContext}|${String(position)}`;
    const casePositionIdentity = `${positionalContext}|${String(casePosition)}`;
    const movableIdentity = `${matchingRoot}|${namedContext}|${title}|${callbackIdentity}`;
    const eachTable = staticEachTableForCall({
      call,
      source,
      structuralSource: parsed.structuralSource,
    });
    const modes = [
      ...disableModesForCall({
        call,
        source,
        structuralSource: parsed.structuralSource,
        stringLiteralEnds: parsed.stringLiteralEnds,
        optionBindings: parsed.optionBindings,
      }),
    ];
    const optionModeConditions = optionModeConditionsForCall({
      call,
      source,
      structuralSource: parsed.structuralSource,
      stringLiteralEnds: parsed.stringLiteralEnds,
      optionBindings: parsed.optionBindings,
    });
    const modeConditions = new Map(
      modes.map((mode) => [
        mode,
        call.modifiers.includes(mode)
          ? disableConditionIdentity(call, mode)
          : (optionModeConditions.get(mode) ??
            disableConditionIdentity(call, mode)),
      ]),
    );
    descriptors.push({
      root,
      testCase,
      modes,
      modeConditions,
      title,
      callbackIdentity,
      eachTable,
      casePositionIdentity,
      positionalIdentity,
      movableIdentity,
    });
  }
  return descriptors;
};

const disableDescriptorsForCalls = (calls) =>
  calls.flatMap(({ modes, modeConditions, ...descriptor }) =>
    modes.map((mode) => ({
      ...descriptor,
      mode,
      conditionIdentity: modeConditions.get(mode) ?? "",
    })),
  );

const testDisableDescriptors = (source) =>
  disableDescriptorsForCalls(testCallDescriptors(source));

const addsTestDisableFingerprint = (beforeSource, afterSource) => {
  const beforeCalls = testCallDescriptors(beforeSource);
  const before = disableDescriptorsForCalls(beforeCalls).map((descriptor) => ({
    ...descriptor,
    used: false,
  }));
  const unmatched = [];
  for (const descriptor of testDisableDescriptors(afterSource)) {
    const movableMatch = before.find(
      (candidate) =>
        !candidate.used &&
        candidate.mode === descriptor.mode &&
        candidate.conditionIdentity === descriptor.conditionIdentity &&
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
        candidate.conditionIdentity === descriptor.conditionIdentity &&
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
    ({ testCase }) => testCase,
  );
  const after = testCallDescriptors(afterSource)
    .filter(({ testCase }) => testCase)
    .map((descriptor) => ({ ...descriptor, used: false }));
  const unmatched = [];

  for (const descriptor of before) {
    const exactMatch = after.find(
      (candidate) =>
        !candidate.used &&
        candidate.title === descriptor.title &&
        candidate.callbackIdentity === descriptor.callbackIdentity &&
        staticEachRowsPreserved(descriptor.eachTable, candidate.eachTable),
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
        staticEachRowsPreserved(descriptor.eachTable, candidate.eachTable) &&
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

const hasTestSupportDefinition = (source) => {
  const { structuralSource, hasCodeLiteral } = scanSource(source);
  return structuralSource.trim() !== "" || hasCodeLiteral;
};

const emptiesTestSupportPattern = (diff, file) => {
  if (!isTestSupportPath(file.path)) {
    return false;
  }
  const beforeSource = diff.beforeContents?.get(file.path);
  const afterSource = diff.afterContents?.get(file.path);
  return (
    beforeSource !== undefined &&
    hasTestSupportDefinition(beforeSource) &&
    afterSource !== undefined &&
    !hasTestSupportDefinition(afterSource)
  );
};

const hasWorkflowDefinition = (source) =>
  source
    .split(/\r?\n/)
    .some((line) => line.trim() !== "" && !line.trimStart().startsWith("#"));

const emptiesWorkflowPattern = (diff, file) => {
  if (!isWorkflowFile(file.path)) {
    return false;
  }
  const beforeSource = diff.beforeContents?.get(file.path);
  const afterSource = diff.afterContents?.get(file.path);
  return (
    beforeSource !== undefined &&
    hasWorkflowDefinition(beforeSource) &&
    afterSource !== undefined &&
    !hasWorkflowDefinition(afterSource)
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
    const losesTestSupport = removesOrRenamesProtectedPath(
      file,
      isTestSupportPath,
    );
    if (losesTestSupport || emptiesTestSupportPattern(diff, file)) {
      reasons.push(
        reason(
          signals.testSupportDeleted,
          levels.critical,
          file.path,
          losesTestSupport
            ? "test fixture・helper・harness を削除・対象外へ移動・type change"
            : "test fixture・helper・harness の内容を空に変更",
        ),
      );
    }
    if (
      file.path === ".claude/settings.json" ||
      file.oldPath === ".claude/settings.json" ||
      touchesDmuxLifecycleHook(file) ||
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
      changesWorkflowExtension(file) ||
      emptiesWorkflowPattern(diff, file)
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
