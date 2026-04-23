import type { Coordinate } from "@/types";
import { desc, eq } from "drizzle-orm";
import type { Logger } from "../lib/logger";
import type { DrizzleDB } from "../db/client";
import { coordinates } from "../db/schema";
import { wrapDbError } from "../trpc/lib/d1-helpers";

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

export const listByUser = async ({
  drizzleDb,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<readonly Coordinate[]> => {
  const rows = await drizzleDb
    .select()
    .from(coordinates)
    .where(eq(coordinates.userId, userId))
    .orderBy(desc(coordinates.updatedAt))
    .catch(wrapDbError({ context: "fetch coordinates", logger }));

  return rows.map(toCoordinate);
};
