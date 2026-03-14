import { Miniflare } from "miniflare";
import fs from "node:fs/promises";
import path from "node:path";

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "../../migrations");

type D1Setup = {
  readonly db: D1Database;
  readonly mf: Miniflare;
};

const applyMigrations = async (db: D1Database): Promise<void> => {
  const migrationFiles = await fs.readdir(MIGRATIONS_DIR);
  const sqlFiles = migrationFiles.filter((f) => f.endsWith(".sql")).sort();

  const sqlContents = await Promise.all(
    sqlFiles.map(
      async (file) =>
        await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf-8"),
    ),
  );

  const statements = sqlContents.flatMap((sql) =>
    sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );

  await db.batch(statements.map((s) => db.prepare(s)));
};

export const createTestD1 = async (): Promise<D1Setup> => {
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok'); } }",
    d1Databases: { DB: "test-db" },
  });

  const db = await mf.getD1Database("DB");
  await applyMigrations(db);

  return { db: db as unknown as D1Database, mf };
};

export const cleanAllTables = async (db: D1Database): Promise<void> => {
  await db.batch([
    db.prepare("DELETE FROM garments"),
    db.prepare("DELETE FROM storage_locations"),
    db.prepare("DELETE FROM storage_cases"),
    db.prepare("DELETE FROM coordinates"),
  ]);
};
