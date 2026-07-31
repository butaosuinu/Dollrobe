import { eq } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import { createDrizzle } from "../db/client";
import { users } from "../db/schema";

// better-auth の databaseHooks.session.create.before で利用する frozen 判定。
// auth.ts から分離することで、cloudflare:test pool が `node:os` を解決できない
// `@better-auth/telemetry` を読み込まずに helper 単体でテストできるようにする。
export const isUserFrozen = async ({
  db,
  userId,
}: {
  readonly db: D1Database;
  readonly userId: string;
}): Promise<boolean> => {
  const drizzleDb = createDrizzle(db);
  const rows = await drizzleDb
    .select({ frozen: users.frozen })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0]?.frozen === true;
};

export const isUserActive = async ({
  db,
  userId,
}: {
  readonly db: D1Database;
  readonly userId: string;
}): Promise<boolean> => {
  const drizzleDb = createDrizzle(db);
  const rows = await drizzleDb
    .select({ frozen: users.frozen })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0]?.frozen === false;
};
