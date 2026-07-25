import type {
  Garment,
  GarmentCategory,
  DollSize,
  GarmentStatus,
} from "@/types";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  GARMENT_CATEGORIES,
  DOLL_SIZES,
  GARMENT_STATUSES,
} from "@shared/lib/constants";
import type { Logger } from "../lib/logger";
import type { DrizzleDB } from "../db/client";
import { garments } from "../db/schema";
import { wrapDbError } from "../lib/d1-helpers";
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
  if (validDollSizes.length !== row.dollSizes.length) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Invalid dollSizes: ${JSON.stringify(row.dollSizes)}`,
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

export const findGarmentsByUserPaged = async ({
  drizzleDb,
  userId,
  limit,
  offset,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly limit: number;
  readonly offset: number;
  readonly logger: Logger;
}): Promise<{
  readonly items: readonly Garment[];
  readonly total: number;
}> => {
  const where = eq(garments.userId, userId);

  const rows = await drizzleDb
    .select()
    .from(garments)
    .where(where)
    .orderBy(desc(garments.updatedAt))
    .limit(limit)
    .offset(offset)
    .catch(wrapDbError({ context: "fetch garments paged", logger }));

  const total = await drizzleDb
    .$count(garments, where)
    .catch(wrapDbError({ context: "count garments paged", logger }));

  return { items: rows.map(toGarment), total };
};

export const findGarmentsByIds = async ({
  drizzleDb,
  ids,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly ids: readonly string[];
  readonly userId: string;
  readonly logger: Logger;
}): Promise<readonly Garment[]> => {
  if (ids.length === 0) {
    return [];
  }

  const rows = await drizzleDb
    .select()
    .from(garments)
    .where(and(eq(garments.userId, userId), inArray(garments.id, [...ids])))
    .catch(wrapDbError({ context: "fetch garments by ids", logger }));

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
