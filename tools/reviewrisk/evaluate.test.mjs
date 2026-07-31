import assert from "node:assert/strict";
import test from "node:test";
import { classes, levels } from "./classes.mjs";
import { evaluate, signals } from "./evaluate.mjs";

const change = ({
  path,
  status = "M",
  oldPath = "",
  added = 1,
  deleted = 1,
}) => ({ path, status, oldPath, added, deleted });

const diff = ({
  files,
  addedLines = {},
  removedLines = {},
  beforeContents = {},
  afterContents = {},
}) => ({
  files,
  addedLines: new Map(Object.entries(addedLines)),
  removedLines: new Map(Object.entries(removedLines)),
  beforeContents: new Map(Object.entries(beforeContents)),
  afterContents: new Map(Object.entries(afterContents)),
});

const hasSignal = (report, signal) =>
  report.reasons.some((item) => item.signal === signal);

test("一般文書だけなら none", () => {
  const report = evaluate(
    diff({ files: [change({ path: "README.md", status: "M" })] }),
  );
  assert.equal(report.level, levels.none);
  assert.equal(report.files[0].class, classes.none);
});

test("未知 path は fail-closed で high", () => {
  const report = evaluate(
    diff({ files: [change({ path: "unknown.toml", status: "A" })] }),
  );
  assert.equal(report.level, levels.high);
  assert.equal(report.files[0].class, classes.unknown);
  assert.equal(hasSignal(report, signals.unclassified), true);
});

test("rename は新旧 path の重い方を採用する", () => {
  const report = evaluate(
    diff({
      files: [
        change({
          path: "docs/auth-notes.md",
          oldPath: "workers/src/auth.ts",
          status: "R",
        }),
      ],
    }),
  );
  assert.equal(report.level, levels.high);
  assert.equal(report.files[0].class, classes.high);
  assert.equal(report.files[0].rule, "worker-auth");
});

test("未分類の rename 元は fail-closed で high", () => {
  const report = evaluate(
    diff({
      files: [
        change({
          path: "docs/security.md",
          oldPath: "unknown-security.toml",
          status: "R",
        }),
      ],
    }),
  );
  assert.equal(report.level, levels.high);
  assert.equal(report.files[0].class, classes.unknown);
  assert.equal(report.files[0].rule, "unclassified");
  assert.equal(hasSignal(report, signals.unclassified), true);
});

test("同率 high でも未分類の rename 元を優先する", () => {
  const report = evaluate(
    diff({
      files: [
        change({
          path: "workers/src/auth.ts",
          oldPath: "mystery.toml",
          status: "R",
        }),
      ],
    }),
  );
  assert.equal(report.level, levels.high);
  assert.equal(report.files[0].class, classes.unknown);
  assert.equal(report.files[0].rule, "unclassified");
  assert.equal(hasSignal(report, signals.unclassified), true);
});

test("テスト削除・skip 追加・fixture 削除は critical", () => {
  const report = evaluate(
    diff({
      files: [
        change({ path: "src/lib/auth.test.ts", status: "D" }),
        change({ path: "src/lib/new.test.ts", status: "A" }),
        change({ path: "e2e/fixtures/auth.ts", status: "D" }),
      ],
      addedLines: {
        "src/lib/new.test.ts": ['test.skip("later", () => {});'],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testDeleted), true);
  assert.equal(hasSignal(report, signals.testDisabled), true);
  assert.equal(hasSignal(report, signals.testSupportDeleted), true);
});

test("test support 間の rename は critical", () => {
  const report = evaluate(
    diff({
      files: [
        change({
          path: "e2e/helpers/setup.ts",
          oldPath: "src/test/setup.ts",
          status: "R",
        }),
      ],
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testSupportDeleted), true);
});

test("test runner config の削除・rename は critical", () => {
  for (const file of [
    change({ path: "vitest.config.ts", status: "D" }),
    change({
      path: "docs/playwright.config.ts",
      oldPath: "playwright.config.ts",
      status: "R",
    }),
  ]) {
    const report = evaluate(diff({ files: [file] }));
    assert.equal(report.level, levels.critical, file.path);
    assert.equal(
      hasSignal(report, signals.testSupportDeleted),
      true,
      file.path,
    );
  }
});

test("test・it・describe の todo は critical", () => {
  for (const api of ["test", "it", "describe"]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/new.test.ts", status: "A" })],
        addedLines: {
          "src/lib/new.test.ts": [`${api}.todo("later", () => {});`],
        },
      }),
    );
    assert.equal(report.level, levels.critical, api);
    assert.equal(hasSignal(report, signals.testDisabled), true, api);
  }
});

test("bracket notation・optional chaining・optional call の skip は critical", () => {
  for (const statement of [
    'test["skip"]("later", fn);',
    'test?.skip("later", fn);',
    'test?.["skip"]("later", fn);',
    'test.skip?.("later", fn);',
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/new.test.ts", status: "A" })],
        addedLines: {
          "src/lib/new.test.ts": [statement],
        },
      }),
    );
    assert.equal(report.level, levels.critical, statement);
    assert.equal(hasSignal(report, signals.testDisabled), true, statement);
  }
});

test("static import された test alias の skip・only は critical", () => {
  for (const source of [
    [
      'import { test as base } from "@playwright/test";',
      'base.skip("later", fn);',
    ],
    [
      'import { test as authedTest } from "./fixtures/auth";',
      'authedTest.describe.only("focused", fn);',
    ],
    ['import * as vitest from "vitest";', 'vitest.test.skip("later", fn);'],
    [
      'import * as playwright from "@playwright/test";',
      'playwright.test.describe.only("focused", fn);',
    ],
    ['import { it as check } from "vitest";', 'check.skip("later", fn);'],
    [
      'import { describe as group } from "vitest";',
      'group.only("focused", fn);',
    ],
    ['import { xit as pending } from "vitest";', 'pending("later", fn);'],
    [
      'import { fdescribe as focused } from "vitest";',
      'focused("focused", fn);',
    ],
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path: "e2e/new.spec.ts", status: "A" })],
        addedLines: {
          "e2e/new.spec.ts": source,
        },
      }),
    );
    assert.equal(report.level, levels.critical, source.join("\n"));
    assert.equal(
      hasSignal(report, signals.testDisabled),
      true,
      source.join("\n"),
    );
  }
});

test("Vitest namespace の x/f prefix alias は critical", () => {
  for (const statement of [
    'vitest.xit("later", fn);',
    'vitest.xtest("later", fn);',
    'vitest.xdescribe("later", fn);',
    'vitest.fit("focused", fn);',
    'vitest.fdescribe("focused", fn);',
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/new.test.ts", status: "A" })],
        addedLines: {
          "src/lib/new.test.ts": [
            'import * as vitest from "vitest";',
            statement,
          ],
        },
      }),
    );
    assert.equal(report.level, levels.critical, statement);
    assert.equal(hasSignal(report, signals.testDisabled), true, statement);
  }
});

test("node:test の直接 disable export と alias は critical", () => {
  for (const [importName, localName] of [
    ["skip", "skip"],
    ["todo", "pending"],
    ["only", "focused"],
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/new.test.ts", status: "A" })],
        addedLines: {
          "src/lib/new.test.ts": [
            `import { ${importName}${
              importName === localName ? "" : ` as ${localName}`
            } } from "node:test";`,
            `${localName}("boundary", fn);`,
          ],
        },
      }),
    );
    assert.equal(report.level, levels.critical, importName);
    assert.equal(hasSignal(report, signals.testDisabled), true, importName);
  }
});

test("static import のない任意 identifier の skip は無効化として扱わない", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": [
          "const base = createBuilder();",
          'base.skip("not a test", fn);',
        ],
      },
    }),
  );
  assert.equal(report.level, levels.low);
  assert.equal(hasSignal(report, signals.testDisabled), false);
});

test("コメント・文字列内の import は test alias として扱わない", () => {
  for (const fakeImport of [
    '// import { it as check } from "vitest";',
    "const fixture = 'import { it as check } from \"vitest\";';",
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/new.test.ts", status: "A" })],
        addedLines: {
          "src/lib/new.test.ts": [
            fakeImport,
            "const check = createBuilder();",
            'check.skip("not a test", fn);',
          ],
        },
      }),
    );
    assert.equal(report.level, levels.low, fakeImport);
    assert.equal(hasSignal(report, signals.testDisabled), false, fakeImport);
  }
});

test("test module 以外の namespace は test root として扱わない", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": [
          'import * as helper from "./helper";',
          'helper.test.skip("not a test API", fn);',
        ],
      },
    }),
  );
  assert.equal(report.level, levels.low);
  assert.equal(hasSignal(report, signals.testDisabled), false);
});

test("静的 bracket の中間 modifier に続く only は critical", () => {
  for (const statement of [
    'test["describe"].only("suite", fn);',
    'test?.["describe"]["only"]("suite", fn);',
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/new.test.ts", status: "A" })],
        addedLines: {
          "src/lib/new.test.ts": [statement],
        },
      }),
    );
    assert.equal(report.level, levels.critical, statement);
    assert.equal(hasSignal(report, signals.testDisabled), true, statement);
  }
});

test("括弧で grouping した test root・member の skip は critical", () => {
  for (const statement of [
    '(test).skip("later", fn);',
    '(test.skip)("later", fn);',
    '((test).skip)("later", fn);',
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/new.test.ts", status: "A" })],
        addedLines: {
          "src/lib/new.test.ts": [statement],
        },
      }),
    );
    assert.equal(report.level, levels.critical, statement);
    assert.equal(hasSignal(report, signals.testDisabled), true, statement);
  }

  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": ['builder(test).skip("not test.skip", fn);'],
      },
    }),
  );
  assert.equal(report.level, levels.low);
  assert.equal(hasSignal(report, signals.testDisabled), false);
});

test("test options の skip true は critical", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": ['test("later", { skip: true }, () => {});'],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testDisabled), true);
});

test("引用符付き test options の skip・only true は critical", () => {
  for (const statement of [
    'test("later", { "skip": true }, fn);',
    "test(\"focused\", { 'only': true }, fn);",
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/new.test.ts", status: "A" })],
        addedLines: {
          "src/lib/new.test.ts": [statement],
        },
      }),
    );
    assert.equal(report.level, levels.critical, statement);
    assert.equal(hasSignal(report, signals.testDisabled), true, statement);
  }
});

test("computed test options の skip・only true は critical", () => {
  for (const statement of [
    'test("later", { ["skip"]: true }, fn);',
    "test(\"focused\", { ['only']: true }, fn);",
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/new.test.ts", status: "A" })],
        addedLines: {
          "src/lib/new.test.ts": [statement],
        },
      }),
    );
    assert.equal(report.level, levels.critical, statement);
    assert.equal(hasSignal(report, signals.testDisabled), true, statement);
  }
});

test("test options の skip string は critical", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": ['test("later", { skip: "TODO" }, () => {});'],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testDisabled), true);
});

test("複数行の test options skip は critical", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": [
          'test("later", { skip:',
          "  true }, () => {});",
        ],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testDisabled), true);
});

test("条件式を使う test options skip は critical", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": [
          'test("linux only", { skip: process.platform !== "linux" }, fn);',
        ],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testDisabled), true);
});

test("test options の skip false は無効化として扱わない", () => {
  for (const statement of [
    'test("enabled", { skip: false }, fn);',
    'test("enabled", { "skip": false }, fn);',
    'test("enabled", { ["skip"]: false }, fn);',
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/new.test.ts", status: "A" })],
        addedLines: {
          "src/lib/new.test.ts": [statement],
        },
      }),
    );
    assert.equal(report.level, levels.low, statement);
    assert.equal(hasSignal(report, signals.testDisabled), false, statement);
  }
});

test("通常オブジェクトの skip・only は無効化として扱わない", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": [
          'test("enabled", () => {',
          "  expect(result).toEqual({ skip: true });",
          "  const config = { only: true };",
          "});",
        ],
      },
    }),
  );
  assert.equal(report.level, levels.low);
  assert.equal(hasSignal(report, signals.testDisabled), false);
});

test("条件式を使う test options only は critical", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": [
          'test("linux only", { only: process.platform === "linux" }, fn);',
        ],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testDisabled), true);
});

test("test options の only false は focus として扱わない", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": ['test("enabled", { only: false }, fn);'],
      },
    }),
  );
  assert.equal(report.level, levels.low);
  assert.equal(hasSignal(report, signals.testDisabled), false);
});

test("skipIf false は無効化として扱わない", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": ['test.skipIf(false)("enabled", () => {});'],
      },
    }),
  );
  assert.equal(report.level, levels.low);
  assert.equal(hasSignal(report, signals.testDisabled), false);
});

test("runIf true は無効化として扱わない", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": ['test.runIf(true)("enabled", () => {});'],
      },
    }),
  );
  assert.equal(report.level, levels.low);
  assert.equal(hasSignal(report, signals.testDisabled), false);
});

test("runIf false・条件式は critical", () => {
  for (const condition of ["false", "process.env.CI"]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/new.test.ts", status: "A" })],
        addedLines: {
          "src/lib/new.test.ts": [
            `test.runIf(${condition})("conditionally enabled", fn);`,
          ],
        },
      }),
    );
    assert.equal(report.level, levels.critical, condition);
    assert.equal(hasSignal(report, signals.testDisabled), true, condition);
  }
});

test("条件付き modifier の条件差し替えは critical", () => {
  for (const [beforeSource, afterSource] of [
    [
      'test.skipIf(process.platform === "win32")("x", fn);',
      'test.skipIf(process.platform !== "win32")("x", fn);',
    ],
    ['test.runIf(featureA)("x", fn);', 'test.runIf(featureB)("x", fn);'],
    [
      'test.skip(process.platform === "win32", "Windows");',
      'test.skip(process.platform !== "win32", "Windows");',
    ],
    [
      'test.skipIf(process.platform === "win32")("x", fn);',
      'test.skipIf(process.platform === "darwin")("x", fn);',
    ],
  ]) {
    const path = "src/lib/new.test.ts";
    const report = evaluate(
      diff({
        files: [change({ path })],
        beforeContents: { [path]: beforeSource },
        afterContents: { [path]: afterSource },
      }),
    );
    assert.equal(report.level, levels.critical, afterSource);
    assert.equal(hasSignal(report, signals.testDisabled), true, afterSource);
  }

  const path = "src/lib/formatted.test.ts";
  const report = evaluate(
    diff({
      files: [change({ path })],
      beforeContents: {
        [path]: 'test.skipIf(featureA && featureB)("x", fn);',
      },
      afterContents: {
        [path]: 'test.skipIf(featureA  &&  featureB)("x", fn);',
      },
    }),
  );
  assert.equal(report.level, levels.low);
  assert.equal(hasSignal(report, signals.testDisabled), false);
});

test("Playwright の skip・fixme false は無効化として扱わない", () => {
  for (const modifier of ["skip", "fixme"]) {
    const report = evaluate(
      diff({
        files: [change({ path: "e2e/new.spec.ts", status: "A" })],
        addedLines: {
          "e2e/new.spec.ts": [
            `test.${modifier}(false, "condition is disabled");`,
          ],
        },
      }),
    );
    assert.equal(report.level, levels.low, modifier);
    assert.equal(hasSignal(report, signals.testDisabled), false, modifier);
  }
});

test("Playwright の条件付き skip・fixme は critical", () => {
  for (const modifier of ["skip", "fixme"]) {
    const report = evaluate(
      diff({
        files: [change({ path: "e2e/new.spec.ts", status: "A" })],
        addedLines: {
          "e2e/new.spec.ts": [
            `test.${modifier}(process.env.CI, "conditional annotation");`,
          ],
        },
      }),
    );
    assert.equal(report.level, levels.critical, modifier);
    assert.equal(hasSignal(report, signals.testDisabled), true, modifier);
  }
});

test("false から始まる skipIf 条件式は critical", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": [
          'test.skipIf(false || true)("disabled", () => {});',
        ],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testDisabled), true);
});

test("false から始まる test options skip 式は critical", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": [
          'test("disabled", { skip: false || true }, fn);',
        ],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testDisabled), true);
});

test("tagged-template each の skip は critical", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": [
          "test.skip.each`a | b",
          '${1} | ${2}`("later", fn);',
        ],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testDisabled), true);
});

test("template literal の補間内にある test skip を検出する", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": [
          'const value = `${{ nested: test.skip("later", fn) }.nested}`;',
        ],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testDisabled), true);
});

test("template literal の本文にある test skip は無効化として扱わない", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/parser.test.ts", status: "A" })],
      addedLines: {
        "src/lib/parser.test.ts": ['const source = `test.skip("later", fn)`;'],
      },
    }),
  );
  assert.equal(report.level, levels.low);
  assert.equal(hasSignal(report, signals.testDisabled), false);
});

test("正規表現リテラル後の test skip を検出する", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": ['const quote = /["]/; test.skip("later", fn);'],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testDisabled), true);
});

test("イコールから始まる正規表現と除算代入後の skip を検出する", () => {
  for (const statement of [
    'const matches = /=/.test(value); test.skip("later", fn);',
    'value /= 2; test.skip("later", fn);',
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/new.test.ts", status: "A" })],
        addedLines: {
          "src/lib/new.test.ts": [statement],
        },
      }),
    );
    assert.equal(report.level, levels.critical, statement);
    assert.equal(hasSignal(report, signals.testDisabled), true, statement);
  }
});

test("postfix 演算後の除算に続く test skip を検出する", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": [
          'let i = 4; const half = i++ / 2; test.skip("later", fn);',
        ],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testDisabled), true);
});

test("non-null assertion 後の除算に続く test skip を検出する", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": [
          'const half = value! / 2; test.skip("later", fn);',
        ],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testDisabled), true);
});

test("正規表現リテラル内の test skip は無効化として扱わない", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/parser.test.ts", status: "A" })],
      addedLines: {
        "src/lib/parser.test.ts": [
          'const pattern = /* syntax */ /test\\.skip\\("later"/;',
        ],
      },
    }),
  );
  assert.equal(report.level, levels.low);
  assert.equal(hasSignal(report, signals.testDisabled), false);
});

test("文字列と block comment 内の skip は無視する", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/parser.test.ts", status: "A" })],
      addedLines: {
        "src/lib/parser.test.ts": [
          'expect(source).toContain("skip: true");',
          '/* test.skip("example", fn);',
          " * only: true",
          " */",
        ],
      },
    }),
  );
  assert.equal(report.level, levels.low);
  assert.equal(hasSignal(report, signals.testDisabled), false);
});

test("dmux lifecycle hook の変更は critical", () => {
  const report = evaluate(
    diff({
      files: [change({ path: ".dmux-hooks/worktree_created" })],
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.reviewGate), true);
});

test("test subscript の変更は critical", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "package.json" })],
      addedLines: {
        "package.json": ['"test:review-risk": "true"'],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.qualityGate), true);
});

test("depcruise script の変更は critical", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "package.json" })],
      addedLines: {
        "package.json": ['"depcruise": "echo disabled"'],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.qualityGate), true);
});

test("CI build scripts の変更は critical", () => {
  for (const script of ["build", "build:workers"]) {
    const report = evaluate(
      diff({
        files: [change({ path: "package.json" })],
        addedLines: {
          "package.json": [`"${script}": "echo disabled"`],
        },
      }),
    );
    assert.equal(report.level, levels.critical, script);
    assert.equal(hasSignal(report, signals.qualityGate), true, script);
  }
});

test("scripts container の rename は critical", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "package.json" })],
      addedLines: {
        "package.json": ['"disabledScripts": {'],
      },
      removedLines: {
        "package.json": ['"scripts": {'],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.qualityGate), true);
});

test("package.json の対象外への rename は critical", () => {
  const report = evaluate(
    diff({
      files: [
        change({
          path: "package-old.json",
          oldPath: "package.json",
          status: "R",
        }),
      ],
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.qualityGate), true);
});

test("workflow の yml・yaml 間 rename は critical", () => {
  const report = evaluate(
    diff({
      files: [
        change({
          path: ".github/workflows/ci.yaml",
          oldPath: ".github/workflows/ci.yml",
          status: "R",
        }),
      ],
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.workflowDeleted), true);
});

test("空またはコメントだけにされた workflow は critical", () => {
  for (const afterSource of ["", "\n# disabled temporarily\n"]) {
    const path = ".github/workflows/ci.yml";
    const report = evaluate(
      diff({
        files: [change({ path })],
        beforeContents: {
          [path]: "on: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n",
        },
        afterContents: { [path]: afterSource },
      }),
    );
    assert.equal(report.level, levels.critical, JSON.stringify(afterSource));
    assert.equal(
      hasSignal(report, signals.workflowDeleted),
      true,
      JSON.stringify(afterSource),
    );
  }
});

test("review-risk 自身・品質 script・既存 migration の変更は critical", () => {
  const report = evaluate(
    diff({
      files: [
        change({ path: "tools/reviewrisk/rules.mjs" }),
        change({ path: "package.json" }),
        change({ path: "workers/migrations/0001_initial.sql" }),
      ],
      addedLines: {
        "package.json": ['"test": "vitest run"'],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.riskTool), true);
  assert.equal(hasSignal(report, signals.qualityGate), true);
  assert.equal(hasSignal(report, signals.migrationRewritten), true);
});

test("migration 外からの rename は新規 migration として high", () => {
  const report = evaluate(
    diff({
      files: [
        change({
          path: "workers/migrations/0017_new.sql",
          oldPath: "scripts/draft.sql",
          status: "R",
        }),
      ],
    }),
  );
  assert.equal(report.level, levels.high);
  assert.equal(hasSignal(report, signals.migrationRewritten), false);
});

test("既存 migration からの rename は critical", () => {
  const report = evaluate(
    diff({
      files: [
        change({
          path: "scripts/archived.sql",
          oldPath: "workers/migrations/0016_existing.sql",
          status: "R",
        }),
      ],
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.migrationRewritten), true);
});

test("認可・同期の不変条件に触れると high の理由を残す", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/domain.ts", status: "A" })],
      addedLines: {
        "src/lib/domain.ts": ["const owner = userId;", "syncQueue.push(item);"],
      },
    }),
  );
  assert.equal(report.level, levels.high);
  assert.equal(
    report.reasons.filter((item) => item.signal === signals.invariant).length,
    2,
  );
});

test("medium の大規模 diff は high に一段上げる", () => {
  const report = evaluate(
    diff({
      files: [
        change({
          path: "src/lib/confidence.ts",
          added: 801,
          deleted: 0,
        }),
      ],
    }),
  );
  assert.equal(report.level, levels.high);
  assert.equal(hasSignal(report, signals.largeDiff), true);
});

test("report の file と reason 順は決定的", () => {
  const report = evaluate(
    diff({
      files: [
        change({ path: "z-new.toml", status: "A" }),
        change({ path: "a-new.toml", status: "A" }),
      ],
    }),
  );
  assert.deepEqual(
    report.files.map(({ path }) => path),
    ["a-new.toml", "z-new.toml"],
  );
  assert.deepEqual(
    report.reasons.map(({ file }) => file),
    ["a-new.toml", "z-new.toml"],
  );
});
