import type { Digest } from "@/types";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Logger } from "../lib/logger";
import type { DrizzleDB } from "../db/client";
import { digests, garments } from "../db/schema";
import { wrapDbError } from "../trpc/lib/d1-helpers";

type DigestSelectRow = typeof digests.$inferSelect;

const toDigest = (row: DigestSelectRow): Digest => ({
  id: row.id,
  userId: row.userId,
  accuracyScore: row.accuracyScore,
  confirmedCount: row.confirmedCount,
  uncertainCount: row.uncertainCount,
  unknownCount: row.unknownCount,
  totalGarments: row.totalGarments,
  isRead: row.isRead,
  generatedAt: row.generatedAt,
  createdAt: row.createdAt,
});

type DigestInsertData = {
  readonly id: string;
  readonly userId: string;
  readonly accuracyScore: number;
  readonly confirmedCount: number;
  readonly uncertainCount: number;
  readonly unknownCount: number;
  readonly totalGarments: number;
  readonly isRead: boolean;
  readonly generatedAt: number;
  readonly createdAt: number;
};

export const insertDigest = async ({
  drizzleDb,
  digest,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly digest: DigestInsertData;
  readonly logger: Logger;
}): Promise<void> => {
  await drizzleDb
    .insert(digests)
    .values(digest)
    .catch(wrapDbError({ context: "insert digest", logger }));
};

export const findLatestDigest = async ({
  drizzleDb,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<Digest | undefined> => {
  const rows = await drizzleDb
    .select()
    .from(digests)
    .where(eq(digests.userId, userId))
    .orderBy(desc(digests.generatedAt))
    .limit(1)
    .catch(wrapDbError({ context: "fetch latest digest", logger }));

  const row = rows[0];
  if (row === undefined) {
    return undefined;
  }

  return toDigest(row);
};

export const findDigests = async ({
  drizzleDb,
  userId,
  limit,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly limit: number;
  readonly logger: Logger;
}): Promise<readonly Digest[]> => {
  const rows = await drizzleDb
    .select()
    .from(digests)
    .where(eq(digests.userId, userId))
    .orderBy(desc(digests.generatedAt))
    .limit(limit)
    .catch(wrapDbError({ context: "fetch digests", logger }));

  return rows.map(toDigest);
};

export const markDigestRead = async ({
  drizzleDb,
  id,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<number> => {
  const result = await drizzleDb
    .update(digests)
    .set({ isRead: true })
    .where(and(eq(digests.id, id), eq(digests.userId, userId)))
    .catch(wrapDbError({ context: "mark digest read", logger }));

  return Number(result.meta.changes);
};

export const hasUnreadDigest = async ({
  drizzleDb,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<boolean> => {
  const rows = await drizzleDb
    .select({ count: sql<number>`count(*)` })
    .from(digests)
    .where(and(eq(digests.userId, userId), eq(digests.isRead, false)))
    .limit(1)
    .catch(wrapDbError({ context: "check unread digest", logger }));

  const row = rows[0];
  return row !== undefined && row.count > 0;
};

export const findAllUserIds = async ({
  drizzleDb,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly logger: Logger;
}): Promise<readonly string[]> => {
  const rows = await drizzleDb
    .selectDistinct({ userId: garments.userId })
    .from(garments)
    .catch(wrapDbError({ context: "fetch all user ids", logger }));

  return rows.map((row) => row.userId);
};
