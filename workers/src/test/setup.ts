import { Miniflare } from "miniflare";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, afterAll } from "vitest";

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../migrations",
);

const readMigrationStatements = (): readonly string[] => {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  return files.flatMap((f) => {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf-8");
    return content
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => `${s};`);
  });
};

beforeAll(async () => {
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok'); } }",
    d1Databases: { DB: "test-db" },
    kvNamespaces: { KV: "test-kv" },
    r2Buckets: { BUCKET: "test-bucket" },
    queueProducers: { QUEUE: "test-queue" },
  });

  const db = await mf.getD1Database("DB");
  const kv = await mf.getKVNamespace("KV");
  const bucket = await mf.getR2Bucket("BUCKET");
  const queue = await mf.getQueueProducer("QUEUE");

  const statements = readMigrationStatements();
  for (const sql of statements) {
    await db.prepare(sql).run();
  }

  globalThis.__miniflare = mf;
  globalThis.__testDb = db;
  globalThis.__testKv = kv;
  globalThis.__testBucket = bucket;
  globalThis.__testQueue = queue;
});

afterAll(async () => {
  await globalThis.__miniflare?.dispose();
});
