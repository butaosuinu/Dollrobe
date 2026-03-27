import { and, eq, lte, sql } from "drizzle-orm";
import { GARMENT_STATUS } from "@shared/lib/constants";
import type { Logger } from "../lib/logger";
import type { DrizzleDB } from "../db/client";
import { garments, storageCases, storageLocations } from "../db/schema";
import { wrapDbError } from "../trpc/lib/d1-helpers";
import * as locationRepo from "./location-repository";

export const upsertGarment = async ({
  drizzleDb,
  garmentValues,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly garmentValues: typeof garments.$inferInsert;
  readonly logger: Logger;
}): Promise<void> => {
  await drizzleDb
    .insert(garments)
    .values(garmentValues)
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
