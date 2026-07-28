import { spawnSync } from "node:child_process";
import { Buffer, isUtf8 } from "node:buffer";

const defaultMaxBuffer = 64 * 1024 * 1024;
const zeroOidPattern = /^0+$/;

const spawnGit = (args, cwd, { input, maxBuffer = defaultMaxBuffer } = {}) =>
  spawnSync(
    "git",
    ["--literal-pathspecs", "-c", "core.quotepath=off", ...args],
    {
      cwd,
      encoding: null,
      input,
      maxBuffer,
    },
  );

const gitError = (args, result) =>
  new Error(
    `git ${args.join(" ")} failed: ${
      result.stderr?.toString("utf8").trim() || `exit ${String(result.status)}`
    }`,
  );

const gitBuffer = (args, cwd, options) => {
  const result = spawnGit(args, cwd, options);
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw gitError(args, result);
  }
  return result.stdout;
};

const gitText = (args, cwd, options) =>
  gitBuffer(args, cwd, options).toString("utf8");

const limitedGitBuffer = (args, cwd, maxBuffer) => {
  const result = spawnGit(args, cwd, { maxBuffer });
  if (result.error?.code === "ENOBUFS") {
    return undefined;
  }
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw gitError(args, result);
  }
  return result.stdout;
};

const asBuffer = (output) =>
  Buffer.isBuffer(output) ? output : Buffer.from(output, "utf8");

const splitNullFields = (output) => {
  const buffer = asBuffer(output);
  const fields = [];
  let start = 0;
  while (start <= buffer.length) {
    const separator = buffer.indexOf(0, start);
    if (separator === -1) {
      fields.push(buffer.subarray(start));
      break;
    }
    fields.push(buffer.subarray(start, separator));
    start = separator + 1;
  }
  return fields;
};

const decodePathInfo = (path) => {
  if (isUtf8(path)) {
    const gitPath = path.toString("utf8");
    return {
      path: gitPath.replaceAll("%", "%25"),
      isUtf8: true,
      gitPath,
    };
  }
  return {
    path: [...path]
      .map((byte) =>
        byte >= 0x20 && byte <= 0x7e && byte !== 0x25
          ? String.fromCharCode(byte)
          : `%${byte.toString(16).toUpperCase().padStart(2, "0")}`,
      )
      .join(""),
    isUtf8: false,
    gitPath: "",
  };
};

const decodePath = (path) => decodePathInfo(path).path;

export const parseNameStatus = (output) => {
  const fields = splitNullFields(output);
  const files = [];
  let index = 0;
  while (index < fields.length && fields[index].length > 0) {
    const rawStatus = fields[index].toString("ascii");
    index += 1;
    const status = rawStatus[0];
    if (status === "R" || status === "C") {
      const oldPath = decodePath(fields[index]);
      const path = decodePath(fields[index + 1]);
      index += 2;
      files.push({ status, oldPath, path, added: 0, deleted: 0 });
      continue;
    }
    const path = decodePath(fields[index]);
    index += 1;
    files.push({ status, oldPath: "", path, added: 0, deleted: 0 });
  }
  return files;
};

const parseRaw = (output) => {
  const fields = splitNullFields(output);
  const files = [];
  let index = 0;
  while (index < fields.length && fields[index].length > 0) {
    const metadata = fields[index].toString("ascii");
    index += 1;
    const match = /^:(\d{6}) (\d{6}) ([0-9a-f]+) ([0-9a-f]+) ([A-Z])\d*$/.exec(
      metadata,
    );
    if (match === null) {
      throw new Error(`invalid raw diff metadata: ${JSON.stringify(metadata)}`);
    }
    const [, oldMode, newMode, oldOid, newOid, status] = match;
    let oldPath = "";
    let oldPathIsUtf8 = true;
    let oldGitPath = "";
    let pathInfo = decodePathInfo(fields[index]);
    index += 1;
    if (status === "R" || status === "C") {
      oldPath = pathInfo.path;
      oldPathIsUtf8 = pathInfo.isUtf8;
      oldGitPath = pathInfo.gitPath;
      pathInfo = decodePathInfo(fields[index]);
      index += 1;
    }
    files.push({
      status,
      oldPath,
      path: pathInfo.path,
      oldPathIsUtf8,
      pathIsUtf8: pathInfo.isUtf8,
      oldGitPath,
      gitPath: pathInfo.gitPath,
      oldMode,
      newMode,
      oldOid,
      newOid,
      added: 0,
      deleted: 0,
    });
  }
  return files;
};

const parseCount = (value) => (value === "-" ? -1 : Number.parseInt(value, 10));

const parseNumstatHeader = (header) => {
  const firstTab = header.indexOf(0x09);
  const secondTab = header.indexOf(0x09, firstTab + 1);
  if (firstTab === -1 || secondTab === -1) {
    throw new Error(
      `invalid numstat header: ${JSON.stringify(header.toString("utf8"))}`,
    );
  }
  return {
    addedText: header.subarray(0, firstTab).toString("ascii"),
    deletedText: header.subarray(firstTab + 1, secondTab).toString("ascii"),
    pathFromHeader: header.subarray(secondTab + 1),
  };
};

export const parseNumstat = (output) => {
  const fields = splitNullFields(output);
  const stats = new Map();
  let index = 0;
  while (index < fields.length && fields[index].length > 0) {
    const { addedText, deletedText, pathFromHeader } = parseNumstatHeader(
      fields[index],
    );
    index += 1;
    let path = pathFromHeader;
    if (path.length === 0) {
      index += 1;
      path = fields[index];
      index += 1;
    }
    stats.set(decodePath(path), {
      added: parseCount(addedText),
      deleted: parseCount(deletedText),
    });
  }
  return stats;
};

export const parsePatchLines = (output) => {
  const added = [];
  const removed = [];
  let inHunk = false;
  for (const line of asBuffer(output).toString("utf8").split("\n")) {
    if (line.startsWith("@@")) {
      inHunk = true;
      continue;
    }
    if (line.startsWith("diff --git ")) {
      inHunk = false;
      continue;
    }
    if (!inHunk) {
      continue;
    }
    if (line.startsWith("+")) {
      added.push(line.slice(1));
    } else if (line.startsWith("-")) {
      removed.push(line.slice(1));
    }
  }
  return { added, removed };
};

const parseContentLines = (output) => {
  if (output.length === 0) {
    return [];
  }
  const lines = output.toString("utf8").split("\n");
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
};

const resolveBase = (requestedBase, cwd) => {
  const candidates =
    requestedBase === undefined ? ["origin/main", "main"] : [requestedBase];
  for (const candidate of candidates) {
    const result = spawnSync(
      "git",
      ["rev-parse", "--verify", `${candidate}^{commit}`],
      { cwd, encoding: "utf8" },
    );
    if (result.status === 0) {
      return candidate;
    }
  }
  throw new Error(
    requestedBase === undefined
      ? "cannot resolve default base (tried origin/main and main)"
      : `cannot resolve base ${JSON.stringify(requestedBase)}`,
  );
};

export const readGitDiff = ({
  base: requestedBase,
  cwd,
  maxPatchBytes = defaultMaxBuffer,
} = {}) => {
  const base = resolveBase(requestedBase, cwd);
  const mergeBase = gitText(["merge-base", base, "HEAD"], cwd).trim();
  const files = parseRaw(
    gitBuffer(["diff", "--raw", "--no-abbrev", "-M", "-z", mergeBase], cwd),
  );
  const stats = parseNumstat(
    gitBuffer(["diff", "--numstat", "-M", "-z", mergeBase], cwd),
  );
  const addedLines = new Map();
  const removedLines = new Map();
  const unreadablePaths = new Set();

  for (const file of files) {
    const fileStats = stats.get(file.path);
    if (fileStats !== undefined) {
      file.added = fileStats.added;
      file.deleted = fileStats.deleted;
    }
    if (file.oldMode === "160000" || file.newMode === "160000") {
      unreadablePaths.add(file.path);
      continue;
    }
    const oldIsEmpty = zeroOidPattern.test(file.oldOid);
    const newIsEmpty = zeroOidPattern.test(file.newOid);
    let lines;
    const readsWorkingTree = newIsEmpty && file.newMode !== "000000";
    if (readsWorkingTree) {
      if (!file.pathIsUtf8 || !file.oldPathIsUtf8) {
        unreadablePaths.add(file.path);
        continue;
      }
      const paths =
        file.oldPath === "" ? [file.gitPath] : [file.oldGitPath, file.gitPath];
      const patch = limitedGitBuffer(
        [
          "diff",
          "--text",
          "--unified=0",
          "--no-ext-diff",
          "--no-color",
          mergeBase,
          "--",
          ...paths,
        ],
        cwd,
        maxPatchBytes,
      );
      if (patch !== undefined) {
        lines = parsePatchLines(patch);
      }
    } else if (oldIsEmpty || newIsEmpty) {
      const oid = oldIsEmpty ? file.newOid : file.oldOid;
      const content = limitedGitBuffer(
        ["cat-file", "blob", oid],
        cwd,
        maxPatchBytes,
      );
      if (content !== undefined) {
        const contentLines = parseContentLines(content);
        lines = {
          added: oldIsEmpty ? contentLines : [],
          removed: newIsEmpty ? contentLines : [],
        };
      }
    } else {
      const args = [
        "diff",
        "--text",
        "--unified=0",
        "--no-ext-diff",
        "--no-color",
        file.oldOid,
        file.newOid,
      ];
      const patch = limitedGitBuffer(args, cwd, maxPatchBytes);
      if (patch !== undefined) {
        lines = parsePatchLines(patch);
      }
    }
    if (lines === undefined) {
      unreadablePaths.add(file.path);
      continue;
    }
    if (lines.added.length > 0) {
      addedLines.set(file.path, lines.added);
    }
    if (lines.removed.length > 0) {
      removedLines.set(file.oldPath || file.path, lines.removed);
    }
  }

  return {
    base,
    mergeBase,
    files,
    addedLines,
    removedLines,
    unreadablePaths,
  };
};
