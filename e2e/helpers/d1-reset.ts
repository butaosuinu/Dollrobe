import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const D1_STATE_DIR = join(
  process.cwd(),
  ".wrangler/state/v3/d1/miniflare-D1DatabaseObject",
);

const TABLES = [
  "digests",
  "garments",
  "storage_locations",
  "storage_cases",
  "coordinates",
  "dolls",
] as const;

const findSqliteFile = (): string => {
  const files = readdirSync(D1_STATE_DIR).filter((f) => f.endsWith(".sqlite"));
  if (files.length === 0) {
    throw new Error(`No .sqlite file found in ${D1_STATE_DIR}`);
  }
  return join(D1_STATE_DIR, files[0]);
};

export const resetD1 = (): void => {
  const dbPath = findSqliteFile();
  const sql = TABLES.map((t) => `DELETE FROM ${t};`).join(" ");
  execSync(`sqlite3 "${dbPath}" "${sql}"`, { stdio: "pipe" });
};
