import { and, eq, lte, sql } from "drizzle-orm";
import { GARMENT_STATUS } from "@shared/lib/constants";
import type { Logger } from "../lib/logger";
import type { DrizzleDB } from "../db/client";
import { dolls, garments, storageCases, storageLocations } from "../db/schema";
import { wrapDbError } from "../trpc/lib/d1-helpers";
import * as locationRepo from "./location-repository";

const resolveLocationId = async ({
  drizzleDb,
  locationId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly locationId: string | null | undefined;
  readonly logger: Logger;
}): Promise<string | null> => {
  if (locationId === null || locationId === undefined) return null;
  const rows = await drizzleDb
    .select({ id: storageLocations.id })
    .from(storageLocations)
    .where(eq(storageLocations.id, locationId));
  if (rows[0] === undefined) {
    logger.warn("location_id not found in D1, setting to null", { locationId });
    return null;
  }
  return locationId;
};

export const upsertGarment = async ({
  drizzleDb,
  garmentValues,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly garmentValues: typeof garments.$inferInsert;
  readonly logger: Logger;
}): Promise<void> => {
  const resolvedLocationId = await resolveLocationId({
    drizzleDb,
    locationId: garmentValues.locationId,
    logger,
  });
  await drizzleDb
    .insert(garments)
    .values({ ...garmentValues, locationId: resolvedLocationId })
    .onConflictDoUpdate({
      target: garments.id,
      set: {
        name: sql`excluded.name`,
        category: sql`excluded.category`,
        dollSizes: sql`excluded.doll_sizes`,
        colors: sql`excluded.colors`,
        tags: sql`excluded.tags`,
        imageUrl: sql`excluded.image_url`,
        locationId: sql`excluded.location_id`,
        status: sql`excluded.status`,
        lastScannedAt: sql`excluded.last_scanned_at`,
        confidenceDecayDays: sql`excluded.confidence_decay_days`,
        brand: sql`excluded.brand`,
        checkedOutAt: sql`excluded.checked_out_at`,
        updatedAt: sql`excluded.updated_at`,
      },
      setWhere: and(
        eq(garments.userId, sql`excluded.user_id`),
        lte(garments.updatedAt, sql`excluded.updated_at`),
      ),
    })
    .catch(wrapDbError({ context: "upsert garment", logger }));
};

export const deleteGarment = async ({
  drizzleDb,
  userId,
  garmentId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly garmentId: string;
  readonly logger: Logger;
}): Promise<void> => {
  await drizzleDb
    .delete(garments)
    .where(and(eq(garments.id, garmentId), eq(garments.userId, userId)))
    .catch(wrapDbError({ context: "delete garment (sync)", logger }));
};

export const upsertStorageCase = async ({
  drizzleDb,
  caseValues,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly caseValues: typeof storageCases.$inferInsert;
  readonly logger: Logger;
}): Promise<void> => {
  await drizzleDb
    .insert(storageCases)
    .values(caseValues)
    .onConflictDoUpdate({
      target: storageCases.id,
      set: {
        name: sql`excluded.name`,
        rows: sql`excluded.rows`,
        cols: sql`excluded.cols`,
      },
      setWhere: eq(storageCases.userId, sql`excluded.user_id`),
    })
    .catch(wrapDbError({ context: "upsert storage case", logger }));
};

export const upsertStorageLocation = async ({
  drizzleDb,
  locationValues,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly locationValues: typeof storageLocations.$inferInsert;
  readonly logger: Logger;
}): Promise<void> => {
  await drizzleDb
    .insert(storageLocations)
    .values(locationValues)
    .onConflictDoNothing({ target: storageLocations.id })
    .catch(wrapDbError({ context: "upsert storage location", logger }));
};

export const upsertDoll = async ({
  drizzleDb,
  dollValues,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly dollValues: typeof dolls.$inferInsert;
  readonly logger: Logger;
}): Promise<void> => {
  await drizzleDb
    .insert(dolls)
    .values(dollValues)
    .onConflictDoUpdate({
      target: dolls.id,
      set: {
        name: sql`excluded.name`,
        headModel: sql`excluded.head_model`,
        bodySize: sql`excluded.body_size`,
        imageUrl: sql`excluded.image_url`,
        memo: sql`excluded.memo`,
        updatedAt: sql`excluded.updated_at`,
      },
      setWhere: and(
        eq(dolls.userId, sql`excluded.user_id`),
        lte(dolls.updatedAt, sql`excluded.updated_at`),
      ),
    })
    .catch(wrapDbError({ context: "upsert doll", logger }));
};

export const deleteDoll = async ({
  drizzleDb,
  userId,
  dollId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly dollId: string;
  readonly logger: Logger;
}): Promise<void> => {
  await drizzleDb
    .delete(dolls)
    .where(and(eq(dolls.id, dollId), eq(dolls.userId, userId)))
    .catch(wrapDbError({ context: "delete doll (sync)", logger }));
};

export const deleteStorageCaseWithCascade = async ({
  drizzleDb,
  userId,
  caseId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly caseId: string;
  readonly logger: Logger;
}): Promise<void> => {
  await locationRepo
    .deleteCaseWithCascade({
      drizzleDb,
      id: caseId,
      userId,
      garmentStatus: GARMENT_STATUS.CHECKED_OUT,
    })
    .catch(
      wrapDbError({ context: "delete storage case cascade (sync)", logger }),
    );
};
