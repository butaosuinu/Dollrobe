import type {
  Garment,
  GarmentCategory,
  DollSize,
  GarmentStatus,
} from "@/types";
import { TRPCError } from "@trpc/server";
import {
  and,
  desc,
  eq,
  gt,
  lt,
  or,
  sql,
  count as drizzleCount,
} from "drizzle-orm";
import {
  GARMENT_CATEGORIES,
  DOLL_SIZES,
  GARMENT_STATUSES,
} from "@shared/lib/constants";
import type { Logger } from "../lib/logger";
import type { DrizzleDB } from "../db/client";
import { createId } from "@paralleldrive/cuid2";
import { garments, tombstones } from "../db/schema";
import { wrapDbError } from "../trpc/lib/d1-helpers";
import { buildSetObject } from "./build-set-object";

type GarmentSelectRow = typeof garments.$inferSelect;

const isGarmentCategory = (value: string): value is GarmentCategory =>
  GARMENT_CATEGORIES.some((c) => c === value);

const isDollSize = (value: string): value is DollSize =>
  DOLL_SIZES.some((s) => s === value);

const isGarmentStatus = (value: string): value is GarmentStatus =>
  GARMENT_STATUSES.some((s) => s === value);

const validateGarmentRow = (
  row: GarmentSelectRow,
): {
  readonly category: GarmentCategory;
  readonly dollSizes: readonly DollSize[];
  readonly status: GarmentStatus;
} => {
  if (!isGarmentCategory(row.category)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Invalid category: ${row.category}`,
    });
  }

  const validDollSizes = row.dollSizes.filter(isDollSize);
  if (validDollSizes.length === 0) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Invalid or empty dollSizes: ${JSON.stringify(row.dollSizes)}`,
    });
  }

  if (!isGarmentStatus(row.status)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Invalid status: ${row.status}`,
    });
  }

  return {
    category: row.category,
    dollSizes: validDollSizes,
    status: row.status,
  };
};

const toGarment = (row: GarmentSelectRow): Garment => {
  const { category, dollSizes, status } = validateGarmentRow(row);

  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    category,
    dollSizes,
    colors: row.colors,
    tags: row.tags,
    imageUrl: row.imageUrl ?? undefined,
    locationId: row.locationId ?? undefined,
    status,
    lastScannedAt: row.lastScannedAt,
    confidenceDecayDays: row.confidenceDecayDays,
    confidenceDecayDaysOverride: row.confidenceDecayDaysOverride ?? undefined,
    recentCheckoutCount: row.recentCheckoutCount,
    brand: row.brand ?? undefined,
    description: row.description ?? undefined,
    setContents: row.setContents ?? undefined,
    checkedOutAt: row.checkedOutAt ?? undefined,
    archivedAt: row.archivedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

type GarmentFilters = {
  readonly category?: string;
  readonly status?: string;
  readonly dollSize?: string;
  readonly locationId?: string;
};

export const findGarments = async ({
  drizzleDb,
  userId,
  filters,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly filters: GarmentFilters;
  readonly logger: Logger;
}): Promise<readonly Garment[]> => {
  const conditions = [
    eq(garments.userId, userId),
    ...(filters.category !== undefined
      ? [eq(garments.category, filters.category)]
      : []),
    ...(filters.status !== undefined
      ? [eq(garments.status, filters.status)]
      : []),
    ...(filters.dollSize !== undefined
      ? [
          sql`EXISTS (SELECT 1 FROM json_each(${garments.dollSizes}) WHERE value = ${filters.dollSize})`,
        ]
      : []),
    ...(filters.locationId !== undefined
      ? [eq(garments.locationId, filters.locationId)]
      : []),
  ];

  const rows = await drizzleDb
    .select()
    .from(garments)
    .where(and(...conditions))
    .orderBy(desc(garments.updatedAt))
    .catch(wrapDbError({ context: "fetch garments", logger }));

  return rows.map(toGarment);
};

export const findGarmentById = async ({
  drizzleDb,
  id,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<Garment | undefined> => {
  const rows = await drizzleDb
    .select()
    .from(garments)
    .where(and(eq(garments.id, id), eq(garments.userId, userId)))
    .catch(wrapDbError({ context: "fetch garment", logger }));

  const row = rows[0];
  if (row === undefined) {
    return undefined;
  }

  return toGarment(row);
};

export const insertGarment = async ({
  drizzleDb,
  garment,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly garment: typeof garments.$inferInsert;
  readonly logger: Logger;
}): Promise<void> => {
  await drizzleDb
    .insert(garments)
    .values(garment)
    .catch(wrapDbError({ context: "create garment", logger }));
};

export const insertGarmentsBatch = async ({
  drizzleDb,
  garmentRows,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly garmentRows: ReadonlyArray<typeof garments.$inferInsert>;
  readonly logger: Logger;
}): Promise<void> => {
  await drizzleDb
    .insert(garments)
    .values([...garmentRows])
    .catch(wrapDbError({ context: "bulk create garments", logger }));
};

type GarmentUpdatableFields = {
  readonly name?: string;
  readonly category?: string;
  readonly dollSizes?: readonly string[];
  readonly colors?: readonly string[];
  readonly tags?: readonly string[];
  readonly imageUrl?: string;
  readonly locationId?: string;
  readonly brand?: string;
  readonly description?: string;
  readonly setContents?: string;
  readonly confidenceDecayDays?: number;
  readonly confidenceDecayDaysOverride?: number | null;
};

const UPDATABLE_FIELD_KEYS = [
  "name",
  "category",
  "dollSizes",
  "colors",
  "tags",
  "imageUrl",
  "locationId",
  "brand",
  "description",
  "setContents",
  "confidenceDecayDays",
  "confidenceDecayDaysOverride",
] as const;

const buildGarmentSetObject = (fields: GarmentUpdatableFields) =>
  buildSetObject({ fields, keys: UPDATABLE_FIELD_KEYS });

export const updateGarmentFields = async ({
  drizzleDb,
  id,
  userId,
  fields,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
  readonly fields: GarmentUpdatableFields;
  readonly logger: Logger;
}): Promise<Garment | undefined> => {
  const setObject = {
    ...buildGarmentSetObject(fields),
    updatedAt: Date.now(),
  };

  await drizzleDb
    .update(garments)
    .set(setObject)
    .where(and(eq(garments.id, id), eq(garments.userId, userId)))
    .catch(wrapDbError({ context: "update garment", logger }));

  const rows = await drizzleDb
    .select()
    .from(garments)
    .where(and(eq(garments.id, id), eq(garments.userId, userId)))
    .catch(wrapDbError({ context: "fetch updated garment", logger }));

  const row = rows[0];
  if (row === undefined) {
    return undefined;
  }

  return toGarment(row);
};

type CursorParts = {
  readonly updatedAt: number;
  readonly id: string;
};

const parseCursor = (cursor: string): CursorParts | undefined => {
  const [updatedAtStr, id] = cursor.split(":");
  const updatedAt = Number(updatedAtStr);
  return id !== undefined && !Number.isNaN(updatedAt)
    ? { updatedAt, id }
    : undefined;
};

const buildCursor = (g: Garment): string => `${g.updatedAt}:${g.id}`;

export type PaginatedGarments = {
  readonly garments: readonly Garment[];
  readonly nextCursor: string | undefined;
  readonly totalCount: number;
};

export const findGarmentsPaginated = async ({
  drizzleDb,
  userId,
  since,
  cursor,
  limit,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly since?: number;
  readonly cursor?: string;
  readonly limit: number;
  readonly logger: Logger;
}): Promise<PaginatedGarments> => {
  const cursorParts = cursor !== undefined ? parseCursor(cursor) : undefined;

  const sinceCondition =
    since !== undefined ? [gt(garments.updatedAt, since)] : [];
  const cursorCondition =
    cursorParts !== undefined
      ? [
          or(
            lt(garments.updatedAt, cursorParts.updatedAt),
            and(
              eq(garments.updatedAt, cursorParts.updatedAt),
              lt(garments.id, cursorParts.id),
            ),
          ),
        ]
      : [];

  const conditions = [
    eq(garments.userId, userId),
    ...sinceCondition,
    ...cursorCondition,
  ];
  const countConditions = [eq(garments.userId, userId), ...sinceCondition];

  const [rows, countResult] = await Promise.all([
    drizzleDb
      .select()
      .from(garments)
      .where(and(...conditions))
      .orderBy(desc(garments.updatedAt), desc(garments.id))
      .limit(limit + 1)
      .catch(wrapDbError({ context: "fetch garments paginated", logger })),
    drizzleDb
      .select({ count: drizzleCount() })
      .from(garments)
      .where(and(...countConditions))
      .catch(wrapDbError({ context: "count garments", logger })),
  ]);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const pageGarments = pageRows.map(toGarment);
  const lastItem = pageGarments[pageGarments.length - 1];
  const nextCursor =
    hasMore && lastItem !== undefined ? buildCursor(lastItem) : undefined;

  return {
    garments: pageGarments,
    nextCursor,
    totalCount: countResult[0]?.count ?? 0,
  };
};

export const deleteGarmentById = async ({
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
    .delete(garments)
    .where(and(eq(garments.id, id), eq(garments.userId, userId)))
    .catch(wrapDbError({ context: "delete garment", logger }));

  return Number(result.meta.changes);
};

export const deleteGarmentWithTombstone = async ({
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
  const deleteStatement = drizzleDb
    .delete(garments)
    .where(and(eq(garments.id, id), eq(garments.userId, userId)));

  const tombstoneStatement = drizzleDb.insert(tombstones).values({
    id: createId(),
    userId,
    entityType: "garment",
    entityId: id,
    deletedAt: Date.now(),
  });

  const [deleteResult] = await drizzleDb
    .batch([deleteStatement, tombstoneStatement])
    .catch(wrapDbError({ context: "delete garment with tombstone", logger }));

  return Number(deleteResult.meta.changes);
};

export const decrementAllRecentCheckoutCounts = async ({
  drizzleDb,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<number> => {
  const result = await drizzleDb
    .update(garments)
    .set({
      recentCheckoutCount: sql`MAX(0, ${garments.recentCheckoutCount} - 1)`,
    })
    .where(
      and(
        eq(garments.userId, userId),
        sql`${garments.recentCheckoutCount} > 0`,
      ),
    )
    .catch(
      wrapDbError({ context: "decrement recent checkout counts", logger }),
    );

  return Number(result.meta.changes);
};
