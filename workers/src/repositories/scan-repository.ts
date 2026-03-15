import { eq, and } from "drizzle-orm";
import { GARMENT_STATUS } from "@shared/lib/constants";
import type { DrizzleDB } from "../db/client";
import { garments } from "../db/schema";

const buildCheckinUpdate = ({
  drizzleDb,
  userId,
  locationId,
  garmentId,
  now,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly locationId: string;
  readonly garmentId: string;
  readonly now: number;
}) =>
  drizzleDb
    .update(garments)
    .set({
      locationId,
      status: GARMENT_STATUS.STORED,
      lastScannedAt: now,
      checkedOutAt: null,
      updatedAt: now,
    })
    .where(and(eq(garments.id, garmentId), eq(garments.userId, userId)));

export const batchCheckin = async ({
  drizzleDb,
  userId,
  locationId,
  garmentIds,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly locationId: string;
  readonly garmentIds: readonly string[];
}): Promise<number> => {
  if (garmentIds.length === 0) {
    return 0;
  }

  const now = Date.now();
  const firstId = garmentIds[0];
  if (firstId === undefined) {
    return 0;
  }
  const restIds = garmentIds.slice(1);
  const firstStatement = buildCheckinUpdate({
    drizzleDb,
    userId,
    locationId,
    garmentId: firstId,
    now,
  });
  const restStatements = restIds.map((garmentId) =>
    buildCheckinUpdate({ drizzleDb, userId, locationId, garmentId, now }),
  );

  const results = await drizzleDb.batch([firstStatement, ...restStatements]);
  const changesPerResult: readonly number[] = results.map((result) =>
    Number(result.meta.changes),
  );
  return changesPerResult.reduce((sum, changes) => sum + changes, 0);
};

export const checkout = async ({
  drizzleDb,
  userId,
  garmentId,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly garmentId: string;
}): Promise<void> => {
  const now = Date.now();

  await drizzleDb
    .update(garments)
    .set({
      locationId: null,
      status: GARMENT_STATUS.CHECKED_OUT,
      checkedOutAt: now,
      updatedAt: now,
    })
    .where(and(eq(garments.id, garmentId), eq(garments.userId, userId)));
};

export const findGarmentIdAndStatus = async ({
  drizzleDb,
  userId,
  garmentId,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly garmentId: string;
}): Promise<{ readonly id: string; readonly status: string } | undefined> => {
  const row = await drizzleDb
    .select({ id: garments.id, status: garments.status })
    .from(garments)
    .where(and(eq(garments.id, garmentId), eq(garments.userId, userId)))
    .get();

  return row ?? undefined;
};

export const confirmAllAtLocation = async ({
  drizzleDb,
  userId,
  locationId,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly locationId: string;
}): Promise<number> => {
  const now = Date.now();

  const result = await drizzleDb
    .update(garments)
    .set({
      lastScannedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(garments.locationId, locationId),
        eq(garments.userId, userId),
        eq(garments.status, GARMENT_STATUS.STORED),
      ),
    );

  const changes: number = result.meta.changes;
  return changes;
};

type Confirmation = {
  readonly garmentId: string;
  readonly confirmed: boolean;
};

const buildConfirmUpdate = ({
  drizzleDb,
  userId,
  confirmation,
  now,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly confirmation: Confirmation;
  readonly now: number;
}) => {
  if (confirmation.confirmed) {
    return drizzleDb
      .update(garments)
      .set({
        lastScannedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(garments.id, confirmation.garmentId),
          eq(garments.userId, userId),
        ),
      );
  }
  return drizzleDb
    .update(garments)
    .set({
      locationId: null,
      status: GARMENT_STATUS.CHECKED_OUT,
      checkedOutAt: now,
      updatedAt: now,
    })
    .where(
      and(eq(garments.id, confirmation.garmentId), eq(garments.userId, userId)),
    );
};

export const batchConfirmPartial = async ({
  drizzleDb,
  userId,
  confirmations,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly confirmations: readonly Confirmation[];
}): Promise<void> => {
  if (confirmations.length === 0) {
    return;
  }

  const now = Date.now();
  const firstConfirmation = confirmations[0];
  if (firstConfirmation === undefined) {
    return;
  }
  const restConfirmations = confirmations.slice(1);
  const firstStatement = buildConfirmUpdate({
    drizzleDb,
    userId,
    confirmation: firstConfirmation,
    now,
  });
  const restStatements = restConfirmations.map((confirmation) =>
    buildConfirmUpdate({ drizzleDb, userId, confirmation, now }),
  );

  await drizzleDb.batch([firstStatement, ...restStatements]);
};

export const resolveOrphan = async ({
  drizzleDb,
  userId,
  garmentId,
  resolution,
  locationId,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly garmentId: string;
  readonly resolution: "stored_back" | "still_using" | "lost";
  readonly locationId?: string;
}): Promise<void> => {
  const now = Date.now();
  const whereClause = and(
    eq(garments.id, garmentId),
    eq(garments.userId, userId),
  );

  if (resolution === "stored_back") {
    await drizzleDb
      .update(garments)
      .set({
        locationId: locationId ?? null,
        status: GARMENT_STATUS.STORED,
        lastScannedAt: now,
        checkedOutAt: null,
        updatedAt: now,
      })
      .where(whereClause);
    return;
  }

  if (resolution === "still_using") {
    await drizzleDb
      .update(garments)
      .set({
        checkedOutAt: now,
        updatedAt: now,
      })
      .where(whereClause);
    return;
  }

  await drizzleDb
    .update(garments)
    .set({
      status: GARMENT_STATUS.LOST,
      locationId: null,
      checkedOutAt: null,
      updatedAt: now,
    })
    .where(whereClause);
};
