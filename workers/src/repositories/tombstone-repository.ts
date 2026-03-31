import { createId } from "@paralleldrive/cuid2";
import { and, eq, gt } from "drizzle-orm";
import type { DrizzleDB } from "../db/client";
import { tombstones } from "../db/schema";
import type { Logger } from "../lib/logger";
import { wrapDbError } from "../trpc/lib/d1-helpers";

type TombstoneRecord = {
  readonly entityType: string;
  readonly entityId: string;
};

export const insertTombstone = async ({
  drizzleDb,
  userId,
  entityType,
  entityId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly logger: Logger;
}): Promise<void> => {
  await drizzleDb
    .insert(tombstones)
    .values({
      id: createId(),
      userId,
      entityType,
      entityId,
      deletedAt: Date.now(),
    })
    .catch(wrapDbError({ context: "insert tombstone", logger }));
};

export const findTombstones = async ({
  drizzleDb,
  userId,
  since,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly since?: number;
  readonly logger: Logger;
}): Promise<readonly TombstoneRecord[]> => {
  const sinceCondition =
    since !== undefined ? [gt(tombstones.deletedAt, since)] : [];
  const conditions = [eq(tombstones.userId, userId), ...sinceCondition];

  const rows = await drizzleDb
    .select({
      entityType: tombstones.entityType,
      entityId: tombstones.entityId,
    })
    .from(tombstones)
    .where(and(...conditions))
    .catch(wrapDbError({ context: "fetch tombstones", logger }));

  return rows;
};
