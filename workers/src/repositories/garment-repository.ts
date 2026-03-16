import type {
  Garment,
  GarmentCategory,
  DollSize,
  GarmentStatus,
} from "@/types";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import {
  GARMENT_CATEGORIES,
  DOLL_SIZES,
  GARMENT_STATUSES,
} from "@shared/lib/constants";
import type { Logger } from "../lib/logger";
import type { DrizzleDB } from "../db/client";
import { garments } from "../db/schema";
import { wrapDbError } from "../trpc/lib/d1-helpers";

type GarmentSelectRow = typeof garments.$inferSelect;

const isGarmentCategory = (value: string): value is GarmentCategory =>
  GARMENT_CATEGORIES.some((c) => c === value);

const isDollSize = (value: string): value is DollSize =>
  DOLL_SIZES.some((s) => s === value);

const isGarmentStatus = (value: string): value is GarmentStatus =>
  GARMENT_STATUSES.some((s) => s === value);

const toGarment = (row: GarmentSelectRow): Garment => {
  if (!isGarmentCategory(row.category)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Invalid category: ${row.category}`,
    });
  }

  if (!isDollSize(row.dollSize)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Invalid doll_size: ${row.dollSize}`,
    });
  }

  if (!isGarmentStatus(row.status)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Invalid status: ${row.status}`,
    });
  }

  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    category: row.category,
    dollSize: row.dollSize,
    colors: row.colors,
    tags: row.tags,
    imageUrl: row.imageUrl ?? undefined,
    locationId: row.locationId ?? undefined,
    status: row.status,
    lastScannedAt: row.lastScannedAt,
    confidenceDecayDays: row.confidenceDecayDays,
    brand: row.brand ?? undefined,
    checkedOutAt: row.checkedOutAt ?? undefined,
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
      ? [eq(garments.dollSize, filters.dollSize)]
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

type GarmentUpdatableFields = {
  readonly name?: string;
  readonly category?: string;
  readonly dollSize?: string;
  readonly colors?: readonly string[];
  readonly tags?: readonly string[];
  readonly imageUrl?: string;
  readonly locationId?: string;
  readonly brand?: string;
  readonly confidenceDecayDays?: number;
};

const UPDATABLE_FIELD_KEYS = [
  "name",
  "category",
  "dollSize",
  "colors",
  "tags",
  "imageUrl",
  "locationId",
  "brand",
  "confidenceDecayDays",
] as const;

const buildSetObject = (
  fields: GarmentUpdatableFields,
): Record<string, string | number | readonly string[]> => {
  const entries = UPDATABLE_FIELD_KEYS.flatMap((key) => {
    const value = fields[key];
    if (value === undefined) {
      return [];
    }
    return [[key, value]] as const;
  });
  return Object.fromEntries(entries);
};

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
    ...buildSetObject(fields),
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
