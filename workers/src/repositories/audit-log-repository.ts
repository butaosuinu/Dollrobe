import { and, desc, eq, sql } from "drizzle-orm";
import type { DrizzleDB } from "../db/client";
import { adminAuditLogs } from "../db/schema";
import { wrapDbError } from "../trpc/lib/d1-helpers";
import type { Logger } from "../lib/logger";

export type AdminAuditLog = {
  readonly id: string;
  readonly actorUserId: string;
  readonly action: string;
  readonly targetUserId: string | undefined;
  readonly metadata: string | undefined;
  readonly createdAt: number;
};

const toAuditLog = (
  row: typeof adminAuditLogs.$inferSelect,
): AdminAuditLog => ({
  id: row.id,
  actorUserId: row.actorUserId,
  action: row.action,
  targetUserId: row.targetUserId ?? undefined,
  metadata: row.metadata ?? undefined,
  createdAt: row.createdAt,
});

export const findAuditLogs = async ({
  drizzleDb,
  filters,
  limit,
  offset,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly filters: {
    readonly action?: string;
    readonly actorUserId?: string;
    readonly targetUserId?: string;
  };
  readonly limit: number;
  readonly offset: number;
  readonly logger: Logger;
}): Promise<{
  readonly items: readonly AdminAuditLog[];
  readonly total: number;
}> => {
  const conditions = [
    filters.action !== undefined
      ? eq(adminAuditLogs.action, filters.action)
      : undefined,
    filters.actorUserId !== undefined
      ? eq(adminAuditLogs.actorUserId, filters.actorUserId)
      : undefined,
    filters.targetUserId !== undefined
      ? eq(adminAuditLogs.targetUserId, filters.targetUserId)
      : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  const where = conditions.length === 0 ? undefined : and(...conditions);

  const rows = await drizzleDb
    .select()
    .from(adminAuditLogs)
    .where(where)
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(limit)
    .offset(offset)
    .catch(wrapDbError({ context: "find audit logs", logger }));

  const countRows = await drizzleDb
    .select({ count: sql<number>`count(*)` })
    .from(adminAuditLogs)
    .where(where)
    .catch(wrapDbError({ context: "count audit logs", logger }));

  const total = countRows[0]?.count ?? 0;

  return {
    items: rows.map(toAuditLog),
    total,
  };
};
