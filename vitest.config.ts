import { defineConfig } from "vitest/config";
import path from "node:path";
import type { Plugin } from "vitest/config";

const linguiMacroPlugin = (): Plugin => {
  const macroPattern = /@lingui\/(core|react)\/macro/;

  return {
    name: "lingui-macro-transform",
    enforce: "pre",
    async transform(code, id) {
      if (!/\.[jt]sx?$/.test(id)) return undefined;
      if (id.includes("node_modules")) return undefined;
      if (!macroPattern.test(code)) return undefined;

      const babel = await import("@babel/core");
      const isTSX = id.endsWith(".tsx");

      const result = await babel.transformAsync(code, {
        filename: id,
        plugins: ["@lingui/babel-plugin-lingui-macro"],
        presets: [["@babel/preset-typescript", { isTSX, allExtensions: true }]],
        sourceMaps: true,
      });

      if (result === null) return undefined;

      return {
        code: result.code ?? code,
        map: result.map,
      };
    },
  };
};

export default defineConfig({
  plugins: [linguiMacroPlugin()],
  esbuild: {
    jsx: "automatic",
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "workers/**/*.test.ts"],
    css: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@shared/lib": path.resolve(import.meta.dirname, "./src/lib"),
      "@shared": path.resolve(import.meta.dirname, "./src/types"),
    },
  },
});
