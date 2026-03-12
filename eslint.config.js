import js from "@eslint/js";
import tseslint from "typescript-eslint";
import love from "eslint-config-love";
import functional from "eslint-plugin-functional";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default tseslint.config(
  {
    ignores: [
      ".next/",
      "node_modules/",
      "public/sw.js",
      "src/sw.ts",
      "next-env.d.ts",
      "eslint.config.js",
      "postcss.config.mjs",
      "next.config.ts",
      "vitest.config.ts",
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
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-magic-numbers": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "functional/prefer-immutable-types": "off",
      "functional/type-declaration-immutability": "off",
      "functional/functional-parameters": [
        "error",
        { enforceParameterCount: false },
      ],
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
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
    files: ["src/app/sw.ts"],
    rules: {
      "functional/no-expression-statements": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/array-type": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "src/test/**/*.ts"],
    rules: {
      "functional/no-expression-statements": "off",
      "functional/no-return-void": "off",
      "functional/no-conditional-statements": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "no-console": "off",
    },
  },
  {
    files: ["workers/**/*.ts"],
    rules: {
      "functional/no-expression-statements": "off",
      "functional/no-return-void": "off",
      "functional/no-conditional-statements": "off",
      "functional/no-throw-statements": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-type-assertion": "off",
      "@typescript-eslint/prefer-destructuring": "off",
    },
  },
);
