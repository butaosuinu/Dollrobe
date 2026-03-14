import type { D1Database } from "@cloudflare/workers-types";
import type { StorageCase, StorageLocation } from "@/types";
import { createId } from "@paralleldrive/cuid2";
import {
  type StorageCaseRow,
  type StorageLocationRow,
  toStorageCase,
  toStorageLocation,
  generateLabel,
  wrapDbError,
} from "../trpc/lib/d1-helpers";

export const findCasesByUserId = async ({
  db,
  userId,
}: {
  readonly db: D1Database;
  readonly userId: string;
}): Promise<readonly StorageCase[]> => {
  const { results } = await db
    .prepare(
      "SELECT * FROM storage_cases WHERE user_id = ? ORDER BY created_at DESC",
    )
    .bind(userId)
    .all<StorageCaseRow>()
    .catch(wrapDbError("fetch storage cases"));

  return results.map(toStorageCase);
};

export const findCaseById = async ({
  db,
  id,
  userId,
}: {
  readonly db: D1Database;
  readonly id: string;
  readonly userId: string;
}): Promise<StorageCase | undefined> => {
  const row = await db
    .prepare("SELECT * FROM storage_cases WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<StorageCaseRow>()
    .catch(wrapDbError("fetch storage case"));

  if (row == null) {
    return undefined;
  }

  return toStorageCase(row);
};

export const findLocationsByCaseId = async ({
  db,
  caseId,
  userId,
}: {
  readonly db: D1Database;
  readonly caseId: string;
  readonly userId: string;
}): Promise<readonly StorageLocation[]> => {
  const { results } = await db
    .prepare(
      "SELECT * FROM storage_locations WHERE case_id = ? AND user_id = ? ORDER BY row_num, col_num",
    )
    .bind(caseId, userId)
    .all<StorageLocationRow>()
    .catch(wrapDbError("fetch storage locations"));

  return results.map(toStorageLocation);
};

export const findLocationByPosition = async ({
  db,
  caseId,
  row,
  col,
}: {
  readonly db: D1Database;
  readonly caseId: string;
  readonly row: number;
  readonly col: number;
}): Promise<StorageLocation | undefined> => {
  const locationRow = await db
    .prepare(
      "SELECT * FROM storage_locations WHERE case_id = ? AND row_num = ? AND col_num = ?",
    )
    .bind(caseId, row, col)
    .first<StorageLocationRow>()
    .catch(wrapDbError("check duplicate location"));

  if (locationRow == null) {
    return undefined;
  }

  return toStorageLocation(locationRow);
};

export const findLocationById = async ({
  db,
  id,
  userId,
}: {
  readonly db: D1Database;
  readonly id: string;
  readonly userId: string;
}): Promise<StorageLocation | undefined> => {
  const row = await db
    .prepare("SELECT * FROM storage_locations WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<StorageLocationRow>()
    .catch(wrapDbError("fetch storage location"));

  if (row == null) {
    return undefined;
  }

  return toStorageLocation(row);
};

export const insertCaseWithLocations = async ({
  db,
  userId,
  name,
  rows,
  cols,
}: {
  readonly db: D1Database;
  readonly userId: string;
  readonly name: string;
  readonly rows: number;
  readonly cols: number;
}): Promise<string> => {
  const caseId = createId();
  const now = Date.now();

  const locationStatements = Array.from({ length: rows * cols }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const label = generateLabel({ row, col });

    return db
      .prepare(
        "INSERT INTO storage_locations (id, user_id, case_id, label, row_num, col_num, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(createId(), userId, caseId, label, row, col, now);
  });

  const caseStatement = db
    .prepare(
      "INSERT INTO storage_cases (id, user_id, name, rows, cols, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(caseId, userId, name, rows, cols, now);

  await db
    .batch([caseStatement, ...locationStatements])
    .catch(wrapDbError("create case with locations"));

  return caseId;
};

export const updateCaseName = async ({
  db,
  id,
  userId,
  name,
}: {
  readonly db: D1Database;
  readonly id: string;
  readonly userId: string;
  readonly name: string;
}): Promise<void> => {
  await db
    .prepare("UPDATE storage_cases SET name = ? WHERE id = ? AND user_id = ?")
    .bind(name, id, userId)
    .run()
    .catch(wrapDbError("update case name"));
};

export const deleteCaseWithCascade = async ({
  db,
  id,
  userId,
  garmentStatus,
}: {
  readonly db: D1Database;
  readonly id: string;
  readonly userId: string;
  readonly garmentStatus: string;
}): Promise<void> => {
  const now = Date.now();

  const clearGarments = db
    .prepare(
      `UPDATE garments SET location_id = NULL, status = ?, checked_out_at = ?
       WHERE location_id IN (SELECT id FROM storage_locations WHERE case_id = ? AND user_id = ?)
       AND user_id = ?`,
    )
    .bind(garmentStatus, now, id, userId, userId);

  const deleteLocations = db
    .prepare("DELETE FROM storage_locations WHERE case_id = ? AND user_id = ?")
    .bind(id, userId);

  const deleteCase = db
    .prepare("DELETE FROM storage_cases WHERE id = ? AND user_id = ?")
    .bind(id, userId);

  await db
    .batch([clearGarments, deleteLocations, deleteCase])
    .catch(wrapDbError("delete case with cascade"));
};

export const insertLocation = async ({
  db,
  userId,
  caseId,
  label,
  row,
  col,
}: {
  readonly db: D1Database;
  readonly userId: string;
  readonly caseId: string;
  readonly label: string;
  readonly row: number;
  readonly col: number;
}): Promise<string> => {
  const locationId = createId();
  const now = Date.now();

  await db
    .prepare(
      "INSERT INTO storage_locations (id, user_id, case_id, label, row_num, col_num, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(locationId, userId, caseId, label, row, col, now)
    .run()
    .catch(wrapDbError("create location"));

  return locationId;
};

export const deleteLocationWithCascade = async ({
  db,
  id,
  userId,
  garmentStatus,
}: {
  readonly db: D1Database;
  readonly id: string;
  readonly userId: string;
  readonly garmentStatus: string;
}): Promise<void> => {
  const now = Date.now();

  const clearGarments = db
    .prepare(
      `UPDATE garments SET location_id = NULL, status = ?, checked_out_at = ?
       WHERE location_id = ? AND user_id = ?`,
    )
    .bind(garmentStatus, now, id, userId);

  const deleteLocation = db
    .prepare("DELETE FROM storage_locations WHERE id = ? AND user_id = ?")
    .bind(id, userId);

  await db
    .batch([clearGarments, deleteLocation])
    .catch(wrapDbError("delete location with cascade"));
};
