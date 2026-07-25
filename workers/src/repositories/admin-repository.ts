import { createId } from "@paralleldrive/cuid2";
import { and, desc, eq, gte, like, or, sql } from "drizzle-orm";
import type { DrizzleDB } from "../db/client";
import { coordinates, garments, storageLocations, users } from "../db/schema";
import { wrapDbError } from "../lib/d1-helpers";
import type { Logger } from "../lib/logger";

export type AdminUserRole = "admin" | "user";

const ADMIN_ROLES: readonly AdminUserRole[] = ["admin", "user"];

const isAdminUserRole = (value: string): value is AdminUserRole =>
  ADMIN_ROLES.some((r) => r === value);

const toRole = (raw: string): AdminUserRole =>
  isAdminUserRole(raw) ? raw : "user";

export type AdminUser = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly image: string | undefined;
  readonly role: AdminUserRole;
  readonly frozen: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
};

const toAdminUser = (row: typeof users.$inferSelect): AdminUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  emailVerified: row.emailVerified,
  image: row.image ?? undefined,
  role: toRole(row.role),
  frozen: row.frozen,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const findUserById = async ({
  drizzleDb,
  id,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly logger: Logger;
}): Promise<AdminUser | undefined> => {
  const rows = await drizzleDb
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
    .catch(wrapDbError({ context: "find admin user by id", logger }));

  const first = rows[0];
  return first === undefined ? undefined : toAdminUser(first);
};

export const findUsers = async ({
  drizzleDb,
  filters,
  limit,
  offset,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly filters: {
    readonly search?: string;
    readonly role?: AdminUserRole;
    readonly frozen?: boolean;
  };
  readonly limit: number;
  readonly offset: number;
  readonly logger: Logger;
}): Promise<{
  readonly items: readonly AdminUser[];
  readonly total: number;
}> => {
  const conditions = [
    filters.role !== undefined ? eq(users.role, filters.role) : undefined,
    filters.frozen !== undefined ? eq(users.frozen, filters.frozen) : undefined,
    filters.search !== undefined && filters.search !== ""
      ? or(
          like(users.email, `%${filters.search}%`),
          like(users.name, `%${filters.search}%`),
        )
      : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  const where = conditions.length === 0 ? undefined : and(...conditions);

  const rows = await drizzleDb
    .select()
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset)
    .catch(wrapDbError({ context: "list admin users", logger }));

  const countRows = await drizzleDb
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(where)
    .catch(wrapDbError({ context: "count admin users", logger }));

  const total = countRows[0]?.count ?? 0;

  return { items: rows.map(toAdminUser), total };
};

export type AdminMetricsSummary = {
  readonly totalUsers: number;
  readonly frozenUsers: number;
  readonly totalGarments: number;
  readonly totalCoordinates: number;
  readonly totalLocations: number;
  readonly signupsLast7d: number;
};

type CountableTable = Parameters<DrizzleDB["select"]>[0] extends never
  ? never
  : Parameters<DrizzleDB["$count"]>[0];

const countTable = async ({
  drizzleDb,
  table,
  where,
  context,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly table: CountableTable;
  readonly where: Parameters<DrizzleDB["$count"]>[1];
  readonly context: string;
  readonly logger: Logger;
}): Promise<number> =>
  await drizzleDb.$count(table, where).catch(wrapDbError({ context, logger }));

export const getMetricsSummary = async ({
  drizzleDb,
  sevenDaysAgo,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly sevenDaysAgo: number;
  readonly logger: Logger;
}): Promise<AdminMetricsSummary> => {
  const [
    totalUsers,
    frozenUsers,
    totalGarments,
    totalCoordinates,
    totalLocations,
    signupsLast7d,
  ] = await Promise.all([
    countTable({
      drizzleDb,
      table: users,
      where: undefined,
      context: "count total users",
      logger,
    }),
    countTable({
      drizzleDb,
      table: users,
      where: eq(users.frozen, true),
      context: "count frozen users",
      logger,
    }),
    countTable({
      drizzleDb,
      table: garments,
      where: undefined,
      context: "count garments",
      logger,
    }),
    countTable({
      drizzleDb,
      table: coordinates,
      where: undefined,
      context: "count coordinates",
      logger,
    }),
    countTable({
      drizzleDb,
      table: storageLocations,
      where: undefined,
      context: "count locations",
      logger,
    }),
    countTable({
      drizzleDb,
      table: users,
      where: gte(users.createdAt, sevenDaysAgo),
      context: "count recent signups",
      logger,
    }),
  ]);

  return {
    totalUsers,
    frozenUsers,
    totalGarments,
    totalCoordinates,
    totalLocations,
    signupsLast7d,
  };
};

// freeze / unfreeze は D1 native batch で atomic に実行する。
//
// 1. UPDATE: `WHERE frozen = ?` で先客の race を吸収 (changes()=0 になる)
// 2. INSERT audit: `INSERT ... SELECT ... WHERE changes() > 0` で直前
//    UPDATE が実際に行を flip したときだけ走る。SQLite の changes() は
//    同一コネクション内の直前 UPDATE/INSERT/DELETE の影響行数を返し、
//    D1 batch は同一コネクション・1 トランザクションで sequential 実行
//    されるため、UPDATE → INSERT...SELECT の順番なら changes() は
//    UPDATE の値を保持する
// 3. DELETE sessions: idempotent。flip 成立時にのみ意味があるが、二重実行
//    でも該当 user の session が消えるだけで害はない
//
// この組み立てなら「UPDATE 成功・副作用失敗」で frozen のまま session が
// 残るような不整合は起きない (batch 全体が atomic に rollback)。
//
// 注: drizzle の batch() は raw `sql\`\`` の bind 解決に対応していないため
// (SQLiteRaw に stmt プロパティが無く `Cannot read properties of undefined
// (reading 'bind')` で死ぬ)、ここは drizzleDb.$client.batch() を直接叩く。
// JSON.stringify({ reason }) は reason=undefined のとき "{}" を返すので、
// `null` リテラル直書きは不要 (CLAUDE.md「値の扱い」)。

const FREEZE_INSERT_AUDIT_SQL = `
  INSERT INTO admin_audit_logs (id, actor_user_id, action, target_user_id, metadata, created_at)
  SELECT ?, ?, 'user.freeze', ?, ?, ?
  WHERE changes() > 0
`;

const UNFREEZE_INSERT_AUDIT_SQL = `
  INSERT INTO admin_audit_logs (id, actor_user_id, action, target_user_id, metadata, created_at)
  SELECT ?, ?, 'user.unfreeze', ?, ?, ?
  WHERE changes() > 0
`;

export const freezeUserBatch = async ({
  drizzleDb,
  actorUserId,
  targetUserId,
  reason,
  now,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly actorUserId: string;
  readonly targetUserId: string;
  readonly reason: string | undefined;
  readonly now: number;
  readonly logger: Logger;
}): Promise<{ readonly changed: boolean }> => {
  const d1 = drizzleDb.$client;
  const metadataJson = JSON.stringify({ reason });

  const [updateResult] = await d1
    .batch([
      d1
        .prepare(
          `UPDATE "user" SET frozen = 1, "updatedAt" = ? WHERE id = ? AND frozen = 0`,
        )
        .bind(now, targetUserId),
      d1
        .prepare(FREEZE_INSERT_AUDIT_SQL)
        .bind(createId(), actorUserId, targetUserId, metadataJson, now),
      d1.prepare(`DELETE FROM "session" WHERE "userId" = ?`).bind(targetUserId),
    ])
    .catch(wrapDbError({ context: "freeze user batch", logger }));

  const updateChanges = updateResult?.meta.changes ?? 0;
  return { changed: updateChanges > 0 };
};

export const unfreezeUserBatch = async ({
  drizzleDb,
  actorUserId,
  targetUserId,
  reason,
  now,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly actorUserId: string;
  readonly targetUserId: string;
  readonly reason: string | undefined;
  readonly now: number;
  readonly logger: Logger;
}): Promise<{ readonly changed: boolean }> => {
  const d1 = drizzleDb.$client;
  const metadataJson = JSON.stringify({ reason });

  const [updateResult] = await d1
    .batch([
      d1
        .prepare(
          `UPDATE "user" SET frozen = 0, "updatedAt" = ? WHERE id = ? AND frozen = 1`,
        )
        .bind(now, targetUserId),
      d1
        .prepare(UNFREEZE_INSERT_AUDIT_SQL)
        .bind(createId(), actorUserId, targetUserId, metadataJson, now),
    ])
    .catch(wrapDbError({ context: "unfreeze user batch", logger }));

  const updateChanges = updateResult?.meta.changes ?? 0;
  return { changed: updateChanges > 0 };
};
