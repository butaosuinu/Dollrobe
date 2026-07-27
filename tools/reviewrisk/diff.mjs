import { spawnSync } from "node:child_process";

const git = (args, cwd) => {
  const result = spawnSync(
    "git",
    ["--literal-pathspecs", "-c", "core.quotepath=off", ...args],
    {
      cwd,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${result.stderr.trim() || `exit ${String(result.status)}`}`,
    );
  }
  return result.stdout;
};

export const parseNameStatus = (output) => {
  const fields = output.split("\0");
  const files = [];
  let index = 0;
  while (index < fields.length && fields[index] !== "") {
    const rawStatus = fields[index];
    index += 1;
    const status = rawStatus[0];
    if (status === "R" || status === "C") {
      const oldPath = fields[index];
      const path = fields[index + 1];
      index += 2;
      files.push({ status, oldPath, path, added: 0, deleted: 0 });
      continue;
    }
    const path = fields[index];
    index += 1;
    files.push({ status, oldPath: "", path, added: 0, deleted: 0 });
  }
  return files;
};

const parseCount = (value) => (value === "-" ? -1 : Number.parseInt(value, 10));

export const parseNumstat = (output) => {
  const fields = output.split("\0");
  const stats = new Map();
  let index = 0;
  while (index < fields.length && fields[index] !== "") {
    const [addedText, deletedText, pathFromHeader = ""] =
      fields[index].split("\t");
    index += 1;
    let path = pathFromHeader;
    if (path === "") {
      index += 1;
      path = fields[index];
      index += 1;
    }
    stats.set(path, {
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
  for (const line of output.split("\n")) {
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

export const readGitDiff = ({ base: requestedBase, cwd } = {}) => {
  const base = resolveBase(requestedBase, cwd);
  const mergeBase = git(["merge-base", base, "HEAD"], cwd).trim();
  const files = parseNameStatus(
    git(["diff", "--name-status", "-M", "-z", mergeBase], cwd),
  );
  const stats = parseNumstat(
    git(["diff", "--numstat", "-M", "-z", mergeBase], cwd),
  );
  const addedLines = new Map();
  const removedLines = new Map();

  for (const file of files) {
    const fileStats = stats.get(file.path);
    if (fileStats !== undefined) {
      file.added = fileStats.added;
      file.deleted = fileStats.deleted;
    }
    const paths = file.oldPath === "" ? [file.path] : [file.oldPath, file.path];
    const patch = git(
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
    );
    const lines = parsePatchLines(patch);
    if (lines.added.length > 0) {
      addedLines.set(file.path, lines.added);
    }
    if (lines.removed.length > 0) {
      removedLines.set(file.oldPath || file.path, lines.removed);
    }
  }

  return { base, mergeBase, files, addedLines, removedLines };
};
