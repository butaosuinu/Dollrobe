import type { Coordinate } from "@/types";
import { and, desc, eq } from "drizzle-orm";
import type { Logger } from "../lib/logger";
import type { DrizzleDB } from "../db/client";
import { coordinates } from "../db/schema";
import { wrapDbError } from "../lib/d1-helpers";
import { buildSetObject } from "./build-set-object";

type CoordinateSelectRow = typeof coordinates.$inferSelect;

const toCoordinate = (row: CoordinateSelectRow): Coordinate => ({
  id: row.id,
  userId: row.userId,
  name: row.name,
  garmentIds: row.garmentIds,
  isAiGenerated: row.isAiGenerated,
  memo: row.memo ?? undefined,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

type CoordinateFilters = {
  readonly isAiGenerated?: boolean;
};

export const findCoordinates = async ({
  drizzleDb,
  userId,
  filters,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly filters: CoordinateFilters;
  readonly logger: Logger;
}): Promise<readonly Coordinate[]> => {
  const conditions = [
    eq(coordinates.userId, userId),
    ...(filters.isAiGenerated !== undefined
      ? [eq(coordinates.isAiGenerated, filters.isAiGenerated)]
      : []),
  ];

  const rows = await drizzleDb
    .select()
    .from(coordinates)
    .where(and(...conditions))
    .orderBy(desc(coordinates.updatedAt))
    .catch(wrapDbError({ context: "fetch coordinates", logger }));

  return rows.map(toCoordinate);
};

export const findCoordinatesByUserPaged = async ({
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
  readonly items: readonly Coordinate[];
  readonly total: number;
}> => {
  const where = eq(coordinates.userId, userId);

  const rows = await drizzleDb
    .select()
    .from(coordinates)
    .where(where)
    .orderBy(desc(coordinates.updatedAt))
    .limit(limit)
    .offset(offset)
    .catch(wrapDbError({ context: "fetch coordinates paged", logger }));

  const total = await drizzleDb
    .$count(coordinates, where)
    .catch(wrapDbError({ context: "count coordinates paged", logger }));

  return { items: rows.map(toCoordinate), total };
};

export const findCoordinateById = async ({
  drizzleDb,
  id,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<Coordinate | undefined> => {
  const rows = await drizzleDb
    .select()
    .from(coordinates)
    .where(and(eq(coordinates.id, id), eq(coordinates.userId, userId)))
    .catch(wrapDbError({ context: "fetch coordinate", logger }));

  const row = rows[0];
  if (row === undefined) {
    return undefined;
  }

  return toCoordinate(row);
};

export const insertCoordinate = async ({
  drizzleDb,
  coordinate,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly coordinate: typeof coordinates.$inferInsert;
  readonly logger: Logger;
}): Promise<void> => {
  await drizzleDb
    .insert(coordinates)
    .values(coordinate)
    .catch(wrapDbError({ context: "create coordinate", logger }));
};

type CoordinateUpdatableFields = {
  readonly name?: string;
  readonly garmentIds?: readonly string[];
  readonly memo?: string;
};

const UPDATABLE_FIELD_KEYS = ["name", "garmentIds", "memo"] as const;

const buildCoordinateSetObject = (fields: CoordinateUpdatableFields) =>
  buildSetObject({ fields, keys: UPDATABLE_FIELD_KEYS });

export const updateCoordinateFields = async ({
  drizzleDb,
  id,
  userId,
  fields,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
  readonly fields: CoordinateUpdatableFields;
  readonly logger: Logger;
}): Promise<Coordinate | undefined> => {
  const setObject = {
    ...buildCoordinateSetObject(fields),
    updatedAt: Date.now(),
  };

  await drizzleDb
    .update(coordinates)
    .set(setObject)
    .where(and(eq(coordinates.id, id), eq(coordinates.userId, userId)))
    .catch(wrapDbError({ context: "update coordinate", logger }));

  const rows = await drizzleDb
    .select()
    .from(coordinates)
    .where(and(eq(coordinates.id, id), eq(coordinates.userId, userId)))
    .catch(wrapDbError({ context: "fetch updated coordinate", logger }));

  const row = rows[0];
  if (row === undefined) {
    return undefined;
  }

  return toCoordinate(row);
};

export const deleteCoordinateById = async ({
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
    .delete(coordinates)
    .where(and(eq(coordinates.id, id), eq(coordinates.userId, userId)))
    .catch(wrapDbError({ context: "delete coordinate", logger }));

  return Number(result.meta.changes);
};
