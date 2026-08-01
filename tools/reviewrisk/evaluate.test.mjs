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

test("コメントだけにされた test support は critical", () => {
  for (const afterSource of [
    "// setup disabled\n",
    "/* setup disabled\n * temporarily\n */\n",
  ]) {
    const path = "src/test/setup.ts";
    const report = evaluate(
      diff({
        files: [change({ path })],
        beforeContents: {
          [path]: 'import "@testing-library/jest-dom";\nsetupMocks();\n',
        },
        afterContents: { [path]: afterSource },
      }),
    );
    assert.equal(report.level, levels.critical, JSON.stringify(afterSource));
    assert.equal(
      hasSignal(report, signals.testSupportDeleted),
      true,
      JSON.stringify(afterSource),
    );
  }
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

test("静的に代入した test API alias の無効化を検出する", () => {
  for (const source of [
    ["const skipped = test.skip;", 'skipped("later", fn);'],
    ['const $skipped = test["skip"];', '$skipped("later", fn);'],
    [
      "const skipped = test.skip;",
      "const disabled = skipped;",
      'disabled("later", fn);',
    ],
    [
      "const disabled = test.skip;",
      "{ const disabled = test.only; }",
      'disabled("later", fn);',
    ],
    ["const { skip } = test;", 'skip("later", fn);'],
    ["const { todo: pending } = test;", 'pending("later", fn);'],
    [
      'import { test as base } from "./fixtures/auth";',
      "const focused = base.only;",
      'focused("boundary", fn);',
    ],
    [
      'import { test as base } from "@playwright/test";',
      "const custom: typeof base = base;",
      'custom.skip("disabled", fn);',
    ],
    [
      'import { test as base } from "@playwright/test";',
      "const custom = base as typeof base;",
      'custom.skip("disabled", fn);',
    ],
    [
      'import { test as base } from "@playwright/test";',
      "const custom = base satisfies typeof base;",
      'custom.skip("disabled", fn);',
    ],
    [
      'import * as vitest from "vitest";',
      "const { test: check } = vitest;",
      'check.skip("later", fn);',
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

test("Playwright の extend 由来 test root を追跡する", () => {
  const path = "e2e/custom.spec.ts";
  for (const extension of [
    "const custom = base.extend({});",
    "const custom = base.extend<Fixtures>({});",
  ]) {
    const disabled = evaluate(
      diff({
        files: [change({ path, status: "A" })],
        addedLines: {
          [path]: [
            'import { test as base } from "@playwright/test";',
            extension,
            'custom.skip("later", fn);',
          ],
        },
      }),
    );
    assert.equal(disabled.level, levels.critical, extension);
    assert.equal(hasSignal(disabled, signals.testDisabled), true, extension);
  }

  const importAndExtend = [
    'import { test as base } from "@playwright/test";',
    "const custom = base.extend<Fixtures>({});",
  ];
  const deleted = evaluate(
    diff({
      files: [change({ path })],
      beforeContents: {
        [path]: [...importAndExtend, 'custom("works", fn);'].join("\n"),
      },
      afterContents: { [path]: importAndExtend.join("\n") },
    }),
  );
  assert.equal(deleted.level, levels.critical);
  assert.equal(hasSignal(deleted, signals.testDeleted), true);
});

test("test API 以外から代入した alias は無効化として扱わない", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": [
          "const skipped = reporter.skip;",
          'skipped("not a test", fn);',
          "const { only: focused } = builder;",
          'focused("not a test", fn);',
        ],
      },
    }),
  );
  assert.equal(report.level, levels.low);
  assert.equal(hasSignal(report, signals.testDisabled), false);
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

test("node:test namespace の直接 disable export は critical", () => {
  for (const exportName of ["skip", "todo", "only"]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/new.test.ts", status: "A" })],
        addedLines: {
          "src/lib/new.test.ts": [
            'import * as nodeTest from "node:test";',
            `nodeTest.${exportName}("boundary", fn);`,
          ],
        },
      }),
    );
    assert.equal(report.level, levels.critical, exportName);
    assert.equal(hasSignal(report, signals.testDisabled), true, exportName);
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

test("node:test の default import alias は test root として扱う", () => {
  const disabled = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": [
          'import check from "node:test";',
          'check.skip("boundary", fn);',
        ],
      },
    }),
  );
  assert.equal(disabled.level, levels.critical);
  assert.equal(hasSignal(disabled, signals.testDisabled), true);

  const unrelated = evaluate(
    diff({
      files: [change({ path: "src/lib/helper.test.ts", status: "A" })],
      addedLines: {
        "src/lib/helper.test.ts": [
          'import check from "./helper";',
          'check.skip("not a test API", fn);',
        ],
      },
    }),
  );
  assert.equal(unrelated.level, levels.low);
  assert.equal(hasSignal(unrelated, signals.testDisabled), false);
});

test("CommonJS の node:test disable export と namespace alias は critical", () => {
  for (const source of [
    ['const { skip } = require("node:test");', 'skip("disabled", fn);'],
    [
      'const { only: focused } = require("node:test");',
      'focused("boundary", fn);',
    ],
    [
      'const nodeTest = require("node:test");',
      'nodeTest.todo("disabled", fn);',
    ],
    [
      'const nodeTest = require("node:test");',
      'nodeTest.test.skip("disabled", fn);',
    ],
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/new.test.cjs", status: "A" })],
        addedLines: { "src/lib/new.test.cjs": source },
      }),
    );
    assert.equal(report.level, levels.critical, source.join("\n"));
    assert.equal(
      hasSignal(report, signals.testDisabled),
      true,
      source.join("\n"),
    );
  }

  const unrelated = evaluate(
    diff({
      files: [change({ path: "src/lib/helper.test.cjs", status: "A" })],
      addedLines: {
        "src/lib/helper.test.cjs": [
          'const { skip } = require("./reporter");',
          'skip("not a test API", fn);',
        ],
      },
    }),
  );
  assert.equal(unrelated.level, levels.low);
  assert.equal(hasSignal(unrelated, signals.testDisabled), false);
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

test("private field の test member は test API として扱わない", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/helper.test.ts", status: "A" })],
      addedLines: {
        "src/lib/helper.test.ts": [
          "class Helper {",
          "  #test = createBuilder();",
          '  run() { this.#test.skip("not a test API", fn); }',
          "}",
        ],
      },
    }),
  );
  assert.equal(report.level, levels.low);
  assert.equal(hasSignal(report, signals.testDisabled), false);
});

test("ローカル binding で shadow された test root は test API として扱わない", () => {
  for (const source of [
    ["const test = createReporter();", 'test.skip("not a test API", fn);'],
    ["function inspect(test) {", '  test.only("not a test API", fn);', "}"],
    [
      "function inspect(test = createReporter()) {",
      '  test.only("not a test API", fn);',
      "}",
    ],
    [
      "function inspect<T>(test = createReporter()) {",
      '  test.only("not a test API", fn);',
      "}",
    ],
    [
      "const inspect = (test = createReporter()) => {",
      '  test.only("not a test API", fn);',
      "};",
    ],
    ["function inspect([test]) {", '  test.only("not a test API", fn);', "}"],
    [
      "function inspect([, { reporter: test }]) {",
      '  test.only("not a test API", fn);',
      "}",
    ],
    [
      "const { reporter: test } = createReporter();",
      'test.skip("not a test API", fn);',
    ],
    ["const [test] = createReporters();", 'test.skip("not a test API", fn);'],
    [
      "const [, { reporter: test }] = createReporters();",
      'test.skip("not a test API", fn);',
    ],
    [
      "function inspect() {",
      "  if (enabled) { var test = createReporter(); }",
      '  test.skip("not a test API", fn);',
      "}",
    ],
    [
      "if (enabled) { var test = createReporter(); }",
      'test.skip("not a test API", fn);',
    ],
    [
      "function inspect() {",
      "  if (enabled) { var [test] = createReporters(); }",
      '  test.skip("not a test API", fn);',
      "}",
    ],
    [
      "const helper = function test() {",
      '  test.skip("not a test API", fn);',
      "};",
    ],
    [
      "const Helper = class test {",
      '  static run() { test.skip("not a test API", fn); }',
      "};",
    ],
    ['const inspect = test => test.only("not a test API", fn);'],
    ['const inspect = (test) => test.only("not a test API", fn);'],
    ["function test() {}", 'test.skip("not a test API", fn);'],
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/helper.test.ts", status: "A" })],
        addedLines: {
          "src/lib/helper.test.ts": source,
        },
      }),
    );
    assert.equal(report.level, levels.low, source.join("\n"));
    assert.equal(
      hasSignal(report, signals.testDisabled),
      false,
      source.join("\n"),
    );
  }

  const realTest = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": [
          "function inspect(test) {",
          '  test.only("not a test API", fn);',
          "}",
          "const helper = function test() {};",
          "const Helper = class test {};",
          'const inspectExpression = test => test.only("not a test API", fn);',
          'const inspectParenthesized = (test) => test.only("not a test API", fn);',
          'test.skip("real test API", fn);',
        ],
      },
    }),
  );
  assert.equal(realTest.level, levels.critical);
  assert.equal(hasSignal(realTest, signals.testDisabled), true);

  for (const source of [
    [
      "for (const test of reporters) {",
      '  test.skip("not a test API", fn);',
      "}",
    ],
    ["for (const test of reporters)", '  test.skip("not a test API", fn);'],
    [
      "for (const [test] of reporters) {",
      '  test.skip("not a test API", fn);',
      "}",
    ],
  ]) {
    const loopOnly = evaluate(
      diff({
        files: [change({ path: "src/lib/loop.test.ts", status: "A" })],
        addedLines: { "src/lib/loop.test.ts": source },
      }),
    );
    assert.equal(loopOnly.level, levels.low, source.join("\n"));
    assert.equal(
      hasSignal(loopOnly, signals.testDisabled),
      false,
      source.join("\n"),
    );
  }

  const loopShadow = evaluate(
    diff({
      files: [change({ path: "src/lib/loop.test.ts", status: "A" })],
      addedLines: {
        "src/lib/loop.test.ts": [
          "for (const test of reporters) {",
          '  test.skip("not a test API", fn);',
          "}",
          'test.skip("real test API", fn);',
        ],
      },
    }),
  );
  assert.equal(loopShadow.level, levels.critical);
  assert.equal(hasSignal(loopShadow, signals.testDisabled), true);
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

test("const alias の test options は静的に解決する", () => {
  for (const source of [
    ["const options = { skip: true };", 'test("later", options, () => {});'],
    [
      "const options = { only: process.env.CI };",
      'test("focused", options, () => {});',
    ],
    [
      'const options = { todo: "blocked" };',
      "function register() {",
      '  test("later", options, () => {});',
      "}",
    ],
    [
      "const options = { skip: true } as const;",
      'test("later", options, () => {});',
    ],
    [
      "const options = { only: process.env.CI } satisfies TestOptions;",
      'test("focused", options, () => {});',
    ],
    [
      "const options: TestOptions = { skip: true };",
      'test("later", options, () => {});',
    ],
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/new.test.ts", status: "A" })],
        addedLines: { "src/lib/new.test.ts": source },
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

test("shadow された const alias の test options は解決しない", () => {
  for (const source of [
    [
      "const options = { skip: true };",
      "function register(options) {",
      '  test("enabled", options, () => {});',
      "}",
    ],
    [
      "const options = { skip: true };",
      "function register() {",
      "  const options = { skip: false };",
      '  test("enabled", options, () => {});',
      "}",
    ],
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/new.test.ts", status: "A" })],
        addedLines: { "src/lib/new.test.ts": source },
      }),
    );
    assert.equal(report.level, levels.low, source.join("\n"));
    assert.equal(
      hasSignal(report, signals.testDisabled),
      false,
      source.join("\n"),
    );
  }
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

test("test options の todo true・理由文字列は critical", () => {
  for (const statement of [
    'test("later", { todo: true }, fn);',
    'test("later", { todo: "blocked by upstream" }, fn);',
    'test("later", { ["todo"]: true }, fn);',
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

test("test options の todo false は無効化として扱わない", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": ['test("enabled", { todo: false }, fn);'],
      },
    }),
  );
  assert.equal(report.level, levels.low);
  assert.equal(hasSignal(report, signals.testDisabled), false);
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

test("test options の shorthand disable property は critical", () => {
  for (const mode of ["skip", "only", "todo"]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/new.test.ts", status: "A" })],
        addedLines: {
          "src/lib/new.test.ts": [
            `const ${mode} = process.env.CI;`,
            `test("boundary", { ${mode} }, fn);`,
          ],
        },
      }),
    );
    assert.equal(report.level, levels.critical, mode);
    assert.equal(hasSignal(report, signals.testDisabled), true, mode);
  }
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

test("const boolean の無効化条件差し替えは critical", () => {
  const path = "src/lib/new.test.ts";
  for (const suffix of ["", " as const", " satisfies boolean"]) {
    const report = evaluate(
      diff({
        files: [change({ path })],
        beforeContents: {
          [path]: [
            `const disabled = false${suffix};`,
            'test.skip(disabled, "reason");',
          ].join("\n"),
        },
        afterContents: {
          [path]: [
            `const disabled = true${suffix};`,
            'test.skip(disabled, "reason");',
          ].join("\n"),
        },
      }),
    );
    assert.equal(report.level, levels.critical, suffix);
    assert.equal(hasSignal(report, signals.testDisabled), true, suffix);
  }
});

test("test options の条件差し替えは critical", () => {
  for (const [beforeSource, afterSource] of [
    [
      'test("boundary", { skip: process.platform === "win32" }, fn);',
      'test("boundary", { skip: process.platform !== "win32" }, fn);',
    ],
    [
      'test("boundary", { only: featureA }, fn);',
      'test("boundary", { only: featureB }, fn);',
    ],
  ]) {
    const path = "src/lib/options.test.ts";
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

test("Playwright の実行時 annotation 削除は test case 削除にしない", () => {
  for (const modifier of ["skip", "fixme"]) {
    const path = "e2e/annotation.spec.ts";
    const report = evaluate(
      diff({
        files: [change({ path })],
        beforeContents: {
          [path]: [
            'test("works", () => {',
            `  test.${modifier}(process.env.CI, "CI annotation");`,
            "  expect(result).toBe(true);",
            "});",
          ].join("\n"),
        },
        afterContents: {
          [path]: [
            'test("works", () => {',
            "  expect(result).toBe(true);",
            "});",
          ].join("\n"),
        },
      }),
    );
    assert.equal(report.level, levels.low, modifier);
    assert.equal(hasSignal(report, signals.testDeleted), false, modifier);
  }
});

test("Playwright の skipped test 宣言削除は test case 削除を維持する", () => {
  for (const modifier of ["skip", "fixme"]) {
    const path = "e2e/disabled.spec.ts";
    const report = evaluate(
      diff({
        files: [change({ path })],
        beforeContents: {
          [path]: `test.${modifier}("disabled", fn);`,
        },
        afterContents: { [path]: "" },
      }),
    );
    assert.equal(report.level, levels.critical, modifier);
    assert.equal(hasSignal(report, signals.testDeleted), true, modifier);
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

test("静的な each table の行削除は test case 削除として扱う", () => {
  for (const [beforeSource, afterSource] of [
    [
      'test.each([[1], [2]])("case %s", fn);',
      'test.each([[1]])("case %s", fn);',
    ],
    [
      ["test.each`", "value", "${1}", "${2}", '`("case $value", fn);'].join(
        "\n",
      ),
      ["test.each`", "value", "${1}", '`("case $value", fn);'].join("\n"),
    ],
    [
      'describe.each([[1], [2]])("suite %s", () => { test("case", fn); });',
      'describe.each([[1]])("suite %s", () => { test("case", fn); });',
    ],
    [
      ["const cases = [[1], [2]];", 'test.each(cases)("case %s", fn);'].join(
        "\n",
      ),
      ["const cases = [[1]];", 'test.each(cases)("case %s", fn);'].join("\n"),
    ],
    [
      [
        "const cases = [[1], [2]] as const;",
        'describe.each(cases)("suite %s", () => { test("case", fn); });',
      ].join("\n"),
      [
        "const cases = [[1]] as const;",
        'describe.each(cases)("suite %s", () => { test("case", fn); });',
      ].join("\n"),
    ],
    [
      [
        'const suite = () => { test("case", fn); };',
        'describe.each([[1], [2]])("suite %s", suite);',
      ].join("\n"),
      'const suite = () => { test("case", fn); };',
    ],
  ]) {
    const path = "src/lib/each.test.ts";
    const report = evaluate(
      diff({
        files: [change({ path })],
        beforeContents: { [path]: beforeSource },
        afterContents: { [path]: afterSource },
      }),
    );
    assert.equal(report.level, levels.critical, beforeSource);
    assert.equal(hasSignal(report, signals.testDeleted), true, beforeSource);
  }
});

test("静的な each table の並び替え・行追加は削除として扱わない", () => {
  for (const [beforeSource, afterSource] of [
    [
      'test.each([[1], [2]])("case %s", fn);',
      'test.each([[2], [1]])("case %s", fn);',
    ],
    [
      'test.each([[1]])("case %s", fn);',
      'test.each([[1], [2]])("case %s", fn);',
    ],
    [
      'describe.each([[1], [2]])("suite %s", () => { test("case", fn); });',
      'describe.each([[2], [1]])("suite %s", () => { test("case", fn); });',
    ],
    [
      'describe.each([[1]])("suite %s", () => { test("case", fn); });',
      'describe.each([[1], [2]])("suite %s", () => { test("case", fn); });',
    ],
    [
      ["const cases = [[1], [2]];", 'test.each(cases)("case %s", fn);'].join(
        "\n",
      ),
      ["const cases = [[2], [1]];", 'test.each(cases)("case %s", fn);'].join(
        "\n",
      ),
    ],
    [
      ["const cases = [[1]];", 'test.each(cases)("case %s", fn);'].join("\n"),
      ["const cases = [[1], [2]];", 'test.each(cases)("case %s", fn);'].join(
        "\n",
      ),
    ],
  ]) {
    const path = "src/lib/each.test.ts";
    const report = evaluate(
      diff({
        files: [change({ path })],
        beforeContents: { [path]: beforeSource },
        afterContents: { [path]: afterSource },
      }),
    );
    assert.equal(report.level, levels.low, afterSource);
    assert.equal(hasSignal(report, signals.testDeleted), false, afterSource);
  }
});

test("generic type arguments 付き test call を解析する", () => {
  const path = "src/lib/generic.test.ts";
  const disabled = evaluate(
    diff({
      files: [change({ path, status: "A" })],
      addedLines: {
        [path]: ['test.skip.each<[number, number]>(cases)("later", fn);'],
      },
    }),
  );
  assert.equal(disabled.level, levels.critical);
  assert.equal(hasSignal(disabled, signals.testDisabled), true);

  const removed = evaluate(
    diff({
      files: [change({ path })],
      beforeContents: {
        [path]: 'test.each<Row>(cases)("later", fn);',
      },
      afterContents: { [path]: "" },
    }),
  );
  assert.equal(removed.level, levels.critical);
  assert.equal(hasSignal(removed, signals.testDeleted), true);
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

test("制御文直後の正規表現後にある test skip を検出する", () => {
  for (const statement of [
    'if (enabled) /foo=/.test(value); test.skip("later", fn);',
    'while (enabled) /foo=/.test(value); test.skip("later", fn);',
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

test("for await の本体で始まる正規表現後にある test skip を検出する", () => {
  const report = evaluate(
    diff({
      files: [change({ path: "src/lib/new.test.ts", status: "A" })],
      addedLines: {
        "src/lib/new.test.ts": [
          "async function inspect() {",
          "  for await (const value of values)",
          '    /foo=/.test(value); test.skip("later", fn);',
          "}",
        ],
      },
    }),
  );
  assert.equal(report.level, levels.critical);
  assert.equal(hasSignal(report, signals.testDisabled), true);
});

test("閉じ波括弧後の正規表現に続く test skip を検出する", () => {
  for (const statement of [
    'if (enabled) {} /foo=/.test(value); test.skip("later", fn);',
    'function inspect() {} /foo=/.test(value); test.skip("later", fn);',
    'class Fixture<T> {} /foo=/.test(value); test.skip("later", fn);',
    '{} /foo=/.test(value); test.skip("later", fn);',
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

test("リテラル直後の除算に続く test skip を検出する", () => {
  for (const statement of [
    'const ratio = "4" / 2; test.skip("later", fn);',
    'const ratio = `4` / 2; test.skip("later", fn);',
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path: "src/lib/new.test.ts", status: "A" })],
        addedLines: { "src/lib/new.test.ts": [statement] },
      }),
    );
    assert.equal(report.level, levels.critical, statement);
    assert.equal(hasSignal(report, signals.testDisabled), true, statement);
  }
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

test("JSX text 内の test API は無視して式コンテナ内だけを解析する", () => {
  const textOnly = evaluate(
    diff({
      files: [change({ path: "src/components/Docs.test.tsx", status: "A" })],
      addedLines: {
        "src/components/Docs.test.tsx": [
          'it("renders docs", () =>',
          '  render(<code>test.skip("later", fn)</code>),',
          ");",
        ],
      },
    }),
  );
  assert.equal(textOnly.level, levels.low);
  assert.equal(hasSignal(textOnly, signals.testDisabled), false);

  const expression = evaluate(
    diff({
      files: [change({ path: "src/components/Docs.test.tsx", status: "A" })],
      addedLines: {
        "src/components/Docs.test.tsx": [
          'it("renders docs", () =>',
          '  render(<code>{test.skip("later", fn)}</code>),',
          ");",
        ],
      },
    }),
  );
  assert.equal(expression.level, levels.critical);
  assert.equal(hasSignal(expression, signals.testDisabled), true);
});

test("dmux lifecycle hook の変更は critical", () => {
  for (const path of [
    ".dmux-hooks/worktree_created",
    ".dmux-hooks/pre_merge",
  ]) {
    const report = evaluate(diff({ files: [change({ path })] }));
    assert.equal(report.level, levels.critical, path);
    assert.equal(hasSignal(report, signals.reviewGate), true, path);
  }
});

test("dmux の文書と example は review gate 変更として扱わない", () => {
  for (const [path, expectedLevel] of [
    [".dmux-hooks/README.md", levels.none],
    [".dmux-hooks/AGENTS.md", levels.medium],
    [".dmux-hooks/CLAUDE.md", levels.medium],
    [".dmux-hooks/examples/worktree_created.example", levels.high],
  ]) {
    const report = evaluate(diff({ files: [change({ path })] }));
    assert.equal(report.level, expectedLevel, path);
    assert.equal(hasSignal(report, signals.reviewGate), false, path);
  }
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

test("review-risk entry script の追加・削除・変更は critical", () => {
  for (const [beforeScripts, afterScripts] of [
    [{ "review-risk": "node tools/reviewrisk/cli.mjs" }, {}],
    [{}, { "review-risk": "node tools/reviewrisk/cli.mjs" }],
    [
      { "review-risk": "node tools/reviewrisk/cli.mjs" },
      { "review-risk": "true" },
    ],
  ]) {
    const report = evaluate(
      diff({
        files: [change({ path: "package.json" })],
        beforeContents: {
          "package.json": JSON.stringify({ scripts: beforeScripts }),
        },
        afterContents: {
          "package.json": JSON.stringify({ scripts: afterScripts }),
        },
      }),
    );
    assert.equal(report.level, levels.critical);
    assert.equal(hasSignal(report, signals.qualityGate), true);
  }
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
          path: "src/lib/domain.ts",
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
