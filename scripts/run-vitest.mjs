#!/usr/bin/env node
import { spawn } from "node:child_process";
import readline from "node:readline";

const child = spawn("vitest", process.argv.slice(2), {
  stdio: ["inherit", "inherit", "pipe"],
  shell: process.platform === "win32",
  env: process.env,
});

const rl = readline.createInterface({ input: child.stderr });
rl.on("line", (line) => {
  if (line.includes('header value for "MF-Vitest-Source"')) return;
  process.stderr.write(line + "\n");
});

const forward = (signal) => {
  if (!child.killed) child.kill(signal);
};
process.on("SIGINT", () => forward("SIGINT"));
process.on("SIGTERM", () => forward("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal !== null) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (err) => {
  process.stderr.write(`Failed to spawn vitest: ${err.message}\n`);
  process.exit(1);
});
