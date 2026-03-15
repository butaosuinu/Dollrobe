import type { StorageCase, StorageLocation } from "@/types";
import { createId } from "@paralleldrive/cuid2";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { DrizzleDB } from "../db/client";
import { garments, storageCases, storageLocations } from "../db/schema";
import { generateLabel } from "../trpc/lib/d1-helpers";

const toStorageCase = (row: typeof storageCases.$inferSelect): StorageCase => ({
  id: row.id,
  userId: row.userId,
  name: row.name,
  rows: row.rows,
  cols: row.cols,
  createdAt: row.createdAt,
});

const toStorageLocation = (
  row: typeof storageLocations.$inferSelect,
): StorageLocation => ({
  id: row.id,
  userId: row.userId,
  caseId: row.caseId,
  label: row.label,
  row: row.row,
  col: row.col,
  createdAt: row.createdAt,
});

export const findCasesByUserId = async ({
  drizzleDb,
  userId,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
}): Promise<readonly StorageCase[]> => {
  const rows = await drizzleDb
    .select()
    .from(storageCases)
    .where(eq(storageCases.userId, userId))
    .orderBy(desc(storageCases.createdAt));

  return rows.map(toStorageCase);
};

export const findCaseById = async ({
  drizzleDb,
  id,
  userId,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
}): Promise<StorageCase | undefined> => {
  const rows = await drizzleDb
    .select()
    .from(storageCases)
    .where(and(eq(storageCases.id, id), eq(storageCases.userId, userId)));

  const first = rows[0];
  if (first === undefined) {
    return undefined;
  }

  return toStorageCase(first);
};

export const findLocationsByCaseId = async ({
  drizzleDb,
  caseId,
  userId,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly caseId: string;
  readonly userId: string;
}): Promise<readonly StorageLocation[]> => {
  const rows = await drizzleDb
    .select()
    .from(storageLocations)
    .where(
      and(
        eq(storageLocations.caseId, caseId),
        eq(storageLocations.userId, userId),
      ),
    )
    .orderBy(asc(storageLocations.row), asc(storageLocations.col));

  return rows.map(toStorageLocation);
};

export const findLocationByPosition = async ({
  drizzleDb,
  caseId,
  row,
  col,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly caseId: string;
  readonly row: number;
  readonly col: number;
}): Promise<StorageLocation | undefined> => {
  const rows = await drizzleDb
    .select()
    .from(storageLocations)
    .where(
      and(
        eq(storageLocations.caseId, caseId),
        eq(storageLocations.row, row),
        eq(storageLocations.col, col),
      ),
    );

  const first = rows[0];
  if (first === undefined) {
    return undefined;
  }

  return toStorageLocation(first);
};

export const findLocationById = async ({
  drizzleDb,
  id,
  userId,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
}): Promise<StorageLocation | undefined> => {
  const rows = await drizzleDb
    .select()
    .from(storageLocations)
    .where(
      and(eq(storageLocations.id, id), eq(storageLocations.userId, userId)),
    );

  const first = rows[0];
  if (first === undefined) {
    return undefined;
  }

  return toStorageLocation(first);
};

export const insertCaseWithLocations = async ({
  drizzleDb,
  userId,
  name,
  rows,
  cols,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly name: string;
  readonly rows: number;
  readonly cols: number;
}): Promise<string> => {
  const caseId = createId();
  const now = Date.now();

  const locationValues = Array.from({ length: rows * cols }, (_, i) => {
    const rowIdx = Math.floor(i / cols);
    const colIdx = i % cols;
    return {
      id: createId(),
      userId,
      caseId,
      label: generateLabel({ row: rowIdx, col: colIdx }),
      row: rowIdx,
      col: colIdx,
      createdAt: now,
    };
  });

  const insertCase = drizzleDb.insert(storageCases).values({
    id: caseId,
    userId,
    name,
    rows,
    cols,
    createdAt: now,
  });

  const insertLocations = drizzleDb
    .insert(storageLocations)
    .values(locationValues);

  await drizzleDb.batch([insertCase, insertLocations]);

  return caseId;
};

export const updateCaseName = async ({
  drizzleDb,
  id,
  userId,
  name,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
  readonly name: string;
}): Promise<void> => {
  await drizzleDb
    .update(storageCases)
    .set({ name })
    .where(and(eq(storageCases.id, id), eq(storageCases.userId, userId)));
};

export const deleteCaseWithCascade = async ({
  drizzleDb,
  id,
  userId,
  garmentStatus,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
  readonly garmentStatus: string;
}): Promise<void> => {
  const now = Date.now();

  const locationSubquery = drizzleDb
    .select({ id: storageLocations.id })
    .from(storageLocations)
    .where(
      and(eq(storageLocations.caseId, id), eq(storageLocations.userId, userId)),
    );

  const clearGarments = drizzleDb
    .update(garments)
    .set({ locationId: null, status: garmentStatus, checkedOutAt: now })
    .where(
      and(
        inArray(garments.locationId, locationSubquery),
        eq(garments.userId, userId),
      ),
    );

  const deleteLocations = drizzleDb
    .delete(storageLocations)
    .where(
      and(eq(storageLocations.caseId, id), eq(storageLocations.userId, userId)),
    );

  const deleteCase = drizzleDb
    .delete(storageCases)
    .where(and(eq(storageCases.id, id), eq(storageCases.userId, userId)));

  await drizzleDb.batch([clearGarments, deleteLocations, deleteCase]);
};

export const insertLocation = async ({
  drizzleDb,
  userId,
  caseId,
  label,
  row,
  col,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly caseId: string;
  readonly label: string;
  readonly row: number;
  readonly col: number;
}): Promise<string> => {
  const locationId = createId();
  const now = Date.now();

  await drizzleDb.insert(storageLocations).values({
    id: locationId,
    userId,
    caseId,
    label,
    row,
    col,
    createdAt: now,
  });

  return locationId;
};

export const deleteLocationWithCascade = async ({
  drizzleDb,
  id,
  userId,
  garmentStatus,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
  readonly garmentStatus: string;
}): Promise<void> => {
  const now = Date.now();

  const clearGarments = drizzleDb
    .update(garments)
    .set({
      locationId: null,
      status: garmentStatus,
      checkedOutAt: now,
    })
    .where(and(eq(garments.locationId, id), eq(garments.userId, userId)));

  const deleteLocation = drizzleDb
    .delete(storageLocations)
    .where(
      and(eq(storageLocations.id, id), eq(storageLocations.userId, userId)),
    );

  await drizzleDb.batch([clearGarments, deleteLocation]);
};
