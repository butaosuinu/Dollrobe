import type { Doll, DollSize } from "@/types";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { DOLL_SIZES } from "@shared/lib/constants";
import type { Logger } from "../lib/logger";
import type { DrizzleDB } from "../db/client";
import { dolls } from "../db/schema";
import { wrapDbError } from "../trpc/lib/d1-helpers";

type DollSelectRow = typeof dolls.$inferSelect;

const isDollSize = (value: string): value is DollSize =>
  DOLL_SIZES.some((s) => s === value);

const toDoll = (row: DollSelectRow): Doll => {
  if (!isDollSize(row.bodySize)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Invalid body_size: ${row.bodySize}`,
    });
  }

  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    headModel: row.headModel ?? undefined,
    bodySize: row.bodySize,
    imageUrl: row.imageUrl ?? undefined,
    memo: row.memo ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

type DollFilters = {
  readonly bodySize?: string;
};

export const findDolls = async ({
  drizzleDb,
  userId,
  filters,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly filters: DollFilters;
  readonly logger: Logger;
}): Promise<readonly Doll[]> => {
  const conditions = [
    eq(dolls.userId, userId),
    ...(filters.bodySize !== undefined
      ? [eq(dolls.bodySize, filters.bodySize)]
      : []),
  ];

  const rows = await drizzleDb
    .select()
    .from(dolls)
    .where(and(...conditions))
    .orderBy(desc(dolls.updatedAt))
    .catch(wrapDbError({ context: "fetch dolls", logger }));

  return rows.map(toDoll);
};

export const findDollById = async ({
  drizzleDb,
  id,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<Doll | undefined> => {
  const rows = await drizzleDb
    .select()
    .from(dolls)
    .where(and(eq(dolls.id, id), eq(dolls.userId, userId)))
    .catch(wrapDbError({ context: "fetch doll", logger }));

  const row = rows[0];
  if (row === undefined) {
    return undefined;
  }

  return toDoll(row);
};

export const insertDoll = async ({
  drizzleDb,
  doll,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly doll: typeof dolls.$inferInsert;
  readonly logger: Logger;
}): Promise<void> => {
  await drizzleDb
    .insert(dolls)
    .values(doll)
    .catch(wrapDbError({ context: "create doll", logger }));
};

type DollUpdatableFields = {
  readonly name?: string;
  readonly headModel?: string;
  readonly bodySize?: string;
  readonly imageUrl?: string;
  readonly memo?: string;
};

const UPDATABLE_FIELD_KEYS = [
  "name",
  "headModel",
  "bodySize",
  "imageUrl",
  "memo",
] as const;

const buildSetObject = (
  fields: DollUpdatableFields,
): Record<string, string> => {
  const entries = UPDATABLE_FIELD_KEYS.flatMap((key) => {
    const value = fields[key];
    if (value === undefined) {
      return [];
    }
    return [[key, value]] as const;
  });
  return Object.fromEntries(entries);
};

export const updateDollFields = async ({
  drizzleDb,
  id,
  userId,
  fields,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
  readonly fields: DollUpdatableFields;
  readonly logger: Logger;
}): Promise<Doll | undefined> => {
  const setObject = {
    ...buildSetObject(fields),
    updatedAt: Date.now(),
  };

  await drizzleDb
    .update(dolls)
    .set(setObject)
    .where(and(eq(dolls.id, id), eq(dolls.userId, userId)))
    .catch(wrapDbError({ context: "update doll", logger }));

  const rows = await drizzleDb
    .select()
    .from(dolls)
    .where(and(eq(dolls.id, id), eq(dolls.userId, userId)))
    .catch(wrapDbError({ context: "fetch updated doll", logger }));

  const row = rows[0];
  if (row === undefined) {
    return undefined;
  }

  return toDoll(row);
};

export const deleteDollById = async ({
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
    .delete(dolls)
    .where(and(eq(dolls.id, id), eq(dolls.userId, userId)))
    .catch(wrapDbError({ context: "delete doll", logger }));

  return Number(result.meta.changes);
};
