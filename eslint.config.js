import js from "@eslint/js";
import tseslint from "typescript-eslint";
import love from "eslint-config-love";
import functional from "eslint-plugin-functional";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import lingui from "eslint-plugin-lingui";

export default tseslint.config(
  {
    ignores: [
      ".next/",
      "coverage/",
      "node_modules/",
      "public/sw.js",
      "src/sw.ts",
      "next-env.d.ts",
      "eslint.config.js",
      "postcss.config.mjs",
      "next.config.ts",
      "vitest.config.ts",
      "lingui.config.ts",
      "lingui-macro-loader.cjs",
      "src/lib/stubs/**/*.cjs",
      "src/locales/**/*.js",
      "src/locales/**/*.mjs",
      ".wrangler/",
      "worker-configuration.d.ts",
      "vitest.workspace.ts",
      "vitest.config.workers.ts",
      "drizzle.config.ts",
      "sentry.client.config.ts",
      "sentry.server.config.ts",
      "sentry.edge.config.ts",
      "src/types/**/*.d.ts",
      "public/opencv.js",
      "e2e/",
      "playwright.config.ts",
      "scripts/",
      ".claude/",
      ".mcp.json",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  love,
  functional.configs.strict,
  {
    plugins: {
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-magic-numbers": [
        "warn",
        {
          ignore: [-1, 0, 1, 2, 100, 1000, 60_000, 86_400_000],
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
          ignoreDefaultValues: true,
          ignoreClassFieldInitialValues: true,
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "functional/prefer-immutable-types": "off",
      "functional/type-declaration-immutability": "off",
      "functional/functional-parameters": [
        "error",
        { enforceParameterCount: false },
      ],
      "functional/no-conditional-statements": [
        "error",
        { allowReturningBranches: true },
      ],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-restricted-syntax": [
        "error",
        {
          selector: "TryStatement",
          message:
            "try/catch is forbidden. Use the await/catch pattern: `const result = await expr.catch(handler)`",
        },
        {
          selector:
            "CallExpression > MemberExpression.callee[property.name='then']",
          message:
            ".then() is forbidden. Use the await/catch pattern: `const result = await expr.catch(handler)`",
        },
        {
          selector: "ExportAllDeclaration",
          message:
            "バレル再エクスポート（`export *`）禁止。直接 import パスを使用すること（CLAUDE.md TypeScript Guidelines）",
        },
        {
          selector: "CallExpression[callee.name='useEffect'] AwaitExpression",
          message:
            "useEffect 内での非同期データ取得は禁止 (await)。Suspense + Jotai async atom を使用すること（CLAUDE.md React Suspense パターン）",
        },
        {
          selector:
            "CallExpression[callee.name='useEffect'] ArrowFunctionExpression[async=true]",
          message:
            "useEffect の引数を async 関数にすることは禁止。Suspense + Jotai async atom を使用すること（CLAUDE.md React Suspense パターン）",
        },
        {
          selector:
            "CallExpression[callee.name='useEffect'] FunctionExpression[async=true]",
          message:
            "useEffect の引数を async 関数にすることは禁止。Suspense + Jotai async atom を使用すること（CLAUDE.md React Suspense パターン）",
        },
        {
          selector:
            "CallExpression[callee.name='useEffect'] CallExpression[callee.type='MemberExpression'][callee.property.name='catch']",
          message:
            "useEffect 内での Promise チェーン (.catch) は禁止。fire-and-forget な非同期処理は Suspense + Jotai async atom に置き換えること（CLAUDE.md React Suspense パターン）",
        },
        {
          selector:
            "CallExpression[callee.name='useEffect'] CallExpression[callee.type='MemberExpression'][callee.property.name='finally']",
          message:
            "useEffect 内での Promise チェーン (.finally) は禁止。Suspense + Jotai async atom を使用すること（CLAUDE.md React Suspense パターン）",
        },
      ],
      "@typescript-eslint/max-params": ["error", { max: 3 }],
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["src/**/*.tsx"],
    ignores: [
      "**/*.test.tsx",
      "src/test/**",
      "src/components/error/ErrorBoundary.tsx",
    ],
    plugins: { lingui },
    rules: {
      "lingui/t-call-in-function": "error",
      "lingui/no-trans-inside-trans": "error",
      "lingui/no-unlocalized-strings": [
        "warn",
        {
          ignore: [
            "^use (client|server)$",
            "^/",
            "^[a-z][a-zA-Z0-9_-]*$",
            "^[A-Z][a-zA-Z0-9_-]*$",
            "^[A-Z0-9_]+$",
            "^https?://",
            "^#",
            "^[a-z0-9][a-z0-9:/_-]*( +[a-z0-9][a-z0-9:/_-]*)+$",
            "^image/[a-z]+$",
            "^application/[a-z+-]+$",
            "^text/[a-z]+$",
          ],
          ignoreNames: [
            "className",
            "displayName",
            "id",
            "key",
            "data-testid",
            "type",
            "role",
            "name",
            "href",
            "src",
            "alt",
            "viewBox",
            "fill",
            "stroke",
            "strokeWidth",
            "strokeLinecap",
            "strokeLinejoin",
            "xmlns",
            "d",
            "points",
            "transform",
            "fontFamily",
            "rel",
            "target",
            "as",
            "entityType",
          ],
          ignoreFunctions: [
            "cn",
            "clsx",
            "twMerge",
            "createId",
            "console.*",
            "logger.*",
            "Sentry.*",
            "router.push",
            "router.replace",
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/error/ErrorBoundary.tsx"],
    rules: {
      "functional/no-classes": "off",
      "functional/no-class-inheritance": "off",
      "functional/no-this-expressions": "off",
      "functional/no-expression-statements": "off",
      "functional/no-conditional-statements": "off",
      "functional/no-return-void": "off",
      "@typescript-eslint/class-methods-use-this": "off",
      "no-console": "off",
    },
  },
  {
    files: ["src/components/**/*.tsx", "src/app/**/*.tsx"],
    rules: {
      "functional/no-expression-statements": "off",
      "functional/no-return-void": "off",
      "functional/no-conditional-statements": "off",
      "functional/no-mixed-types": "off",
      "functional/immutable-data": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/strict-void-return": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/prefer-destructuring": "off",
      "@typescript-eslint/no-unsafe-type-assertion": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "no-negated-condition": "off",
      "require-unicode-regexp": "off",
    },
  },
  {
    files: ["src/lib/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },
  {
    files: ["src/i18n/**/*.ts"],
    rules: {
      "functional/no-expression-statements": "off",
      "functional/no-return-void": "off",
      "functional/no-conditional-statements": "off",
      "functional/immutable-data": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
    },
  },
  {
    files: ["src/stores/**/*.ts", "src/lib/db/**/*.ts"],
    rules: {
      "functional/no-expression-statements": "off",
      "functional/no-return-void": "off",
      "functional/no-classes": "off",
      "functional/no-class-inheritance": "off",
      "functional/no-this-expressions": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-type-assertion": "off",
    },
  },
  {
    files: ["src/hooks/**/*.ts"],
    rules: {
      "functional/no-expression-statements": "off",
      "functional/no-return-void": "off",
      "functional/no-conditional-statements": "off",
      "functional/no-throw-statements": "off",
      "functional/immutable-data": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector: "TryStatement",
          message:
            "try/catch is forbidden. Use the await/catch pattern: `const result = await expr.catch(handler)`",
        },
        {
          selector:
            "CallExpression > MemberExpression.callee[property.name='then']",
          message:
            ".then() is forbidden. Use the await/catch pattern: `const result = await expr.catch(handler)`",
        },
        {
          selector: "ExportAllDeclaration",
          message:
            "バレル再エクスポート（`export *`）禁止。直接 import パスを使用すること（CLAUDE.md TypeScript Guidelines）",
        },
      ],
    },
  },
  {
    files: ["**/*.d.ts"],
    rules: {
      "@typescript-eslint/consistent-type-definitions": "off",
    },
  },
  {
    files: ["src/lib/generateLabel.ts"],
    rules: {
      "functional/no-conditional-statements": "off",
      "functional/no-throw-statements": "off",
    },
  },
  {
    files: ["src/lib/image/**/*.ts"],
    rules: {
      "functional/no-expression-statements": "off",
      "functional/no-return-void": "off",
      "functional/no-conditional-statements": "off",
      "functional/no-throw-statements": "off",
      "functional/immutable-data": "off",
      "promise/avoid-new": "off",
    },
  },
  {
    files: ["src/instrumentation.ts"],
    rules: {
      "functional/no-expression-statements": "off",
      "functional/no-conditional-statements": "off",
      "@typescript-eslint/prefer-destructuring": "off",
    },
  },
  {
    files: ["src/app/sw.ts"],
    rules: {
      "functional/no-expression-statements": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
    },
  },
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "src/test/**/*.ts",
      "src/test/**/*.tsx",
      "workers/src/test/**/*.ts",
      "workers/test/**/*.ts",
    ],
    rules: {
      "functional/no-expression-statements": "off",
      "functional/no-return-void": "off",
      "functional/no-conditional-statements": "off",
      "functional/immutable-data": "off",
      "functional/no-loop-statements": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-type-assertion": "off",
      "@typescript-eslint/consistent-type-assertions": "off",
      "@typescript-eslint/consistent-type-imports": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/strict-void-return": "off",
      "@typescript-eslint/naming-convention": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-magic-numbers": "off",
      "@eslint-community/eslint-comments/require-description": "off",
      "max-nested-callbacks": "off",
      complexity: "off",
      "promise/avoid-new": "off",
      "no-promise-executor-return": "off",
      "no-await-in-loop": "off",
      "no-console": "off",
      "@typescript-eslint/max-params": "off",
    },
  },
  {
    files: ["workers/**/*.ts"],
    rules: {
      "functional/no-expression-statements": "off",
      "functional/no-return-void": "off",
      "functional/no-throw-statements": "off",
      "functional/no-conditional-statements": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/prefer-destructuring": "off",
      "no-negated-condition": "off",
    },
  },
);
