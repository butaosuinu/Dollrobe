import assert from "node:assert/strict";
import test from "node:test";
import { parseNameStatus, parseNumstat, parsePatchLines } from "./diff.mjs";

test("name-status の追加・削除・rename を読む", () => {
  assert.deepEqual(
    parseNameStatus(
      "A\0new.ts\0D\0old.ts\0R091\0before name.ts\0after name.ts\0",
    ),
    [
      {
        status: "A",
        oldPath: "",
        path: "new.ts",
        added: 0,
        deleted: 0,
      },
      {
        status: "D",
        oldPath: "",
        path: "old.ts",
        added: 0,
        deleted: 0,
      },
      {
        status: "R",
        oldPath: "before name.ts",
        path: "after name.ts",
        added: 0,
        deleted: 0,
      },
    ],
  );
});

test("numstat の通常 path・rename・binary を読む", () => {
  const actual = parseNumstat(
    "12\t3\tsrc/file.ts\0-\t-\tpublic/image.png\0" + "1\t2\t\0old.ts\0new.ts\0",
  );
  assert.deepEqual(actual.get("src/file.ts"), { added: 12, deleted: 3 });
  assert.deepEqual(actual.get("public/image.png"), {
    added: -1,
    deleted: -1,
  });
  assert.deepEqual(actual.get("new.ts"), { added: 1, deleted: 2 });
});

test("unified diff の hunk 本文だけを追加・削除行として読む", () => {
  const actual = parsePatchLines(
    [
      "diff --git a/file.ts b/file.ts",
      "--- a/file.ts",
      "+++ b/file.ts",
      "@@ -1 +1 @@",
      "-old line",
      "+new line",
      "@@ -5,0 +6 @@",
      "+++ content beginning with plus",
      "",
    ].join("\n"),
  );
  assert.deepEqual(actual, {
    added: ["new line", "++ content beginning with plus"],
    removed: ["old line"],
  });
});
