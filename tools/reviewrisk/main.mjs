#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { compareLevels, parseLevel } from "./classes.mjs";
import { readGitDiff } from "./diff.mjs";
import { evaluate } from "./evaluate.mjs";
import { renderJson, renderMarkdown, renderText } from "./report.mjs";
import { isTestFile } from "./rules.mjs";

const usage =
  "usage: node tools/reviewrisk/main.mjs [--base <ref>] [--format text|json|markdown] [--fail-at <level>]";

export const parseArgs = (args) => {
  const options = { base: undefined, format: "text", failAt: undefined };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--") {
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      return { ...options, help: true };
    }
    if (
      argument === "--base" ||
      argument === "--format" ||
      argument === "--fail-at"
    ) {
      const value = args[index + 1];
      if (value === undefined) {
        throw new Error(`${argument} requires a value`);
      }
      index += 1;
      if (argument === "--base") {
        options.base = value;
      } else if (argument === "--format") {
        if (!["text", "json", "markdown"].includes(value)) {
          throw new Error(`unknown format ${JSON.stringify(value)}`);
        }
        options.format = value;
      } else {
        options.failAt = parseLevel(value);
      }
      continue;
    }
    throw new Error(`unknown argument ${JSON.stringify(argument)}`);
  }
  return options;
};

const render = (format, report) => {
  switch (format) {
    case "json":
      return renderJson(report);
    case "markdown":
      return renderMarkdown(report);
    case "text":
    default:
      return renderText(report);
  }
};

export const run = (args) => {
  const options = parseArgs(args);
  if (options.help === true) {
    return { output: usage, exitCode: 0 };
  }
  const report = evaluate(
    readGitDiff({ base: options.base, includeContents: isTestFile }),
  );
  const exitCode =
    options.failAt !== undefined &&
    compareLevels(report.level, options.failAt) >= 0
      ? 1
      : 0;
  return { output: render(options.format, report), exitCode };
};

const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

const runEntrypoint = async () => {
  const { output, exitCode } = run(process.argv.slice(2));
  process.stdout.write(`${output.replace(/\n$/, "")}\n`);
  process.exitCode = exitCode;
};

if (isEntrypoint) {
  await runEntrypoint().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`review-risk: ${message}\n${usage}\n`);
    process.exitCode = 2;
  });
}
