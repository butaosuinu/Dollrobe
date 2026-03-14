import type { D1Database } from "@cloudflare/workers-types";
import { GARMENT_STATUS } from "@shared/lib/constants";
import type { GarmentRow } from "../trpc/lib/d1-helpers";

export const batchCheckin = async ({
  db,
  userId,
  locationId,
  garmentIds,
}: {
  readonly db: D1Database;
  readonly userId: string;
  readonly locationId: string;
  readonly garmentIds: readonly string[];
}): Promise<number> => {
  const now = Date.now();

  const statements = garmentIds.map((garmentId) =>
    db
      .prepare(
        `UPDATE garments SET location_id = ?, status = ?, last_scanned_at = ?, checked_out_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?`,
      )
      .bind(locationId, GARMENT_STATUS.STORED, now, now, garmentId, userId),
  );

  const results = await db.batch(statements);
  return results.reduce((sum, result) => sum + result.meta.changes, 0);
};

export const checkout = async ({
  db,
  userId,
  garmentId,
}: {
  readonly db: D1Database;
  readonly userId: string;
  readonly garmentId: string;
}): Promise<void> => {
  const now = Date.now();

  await db
    .prepare(
      `UPDATE garments SET location_id = NULL, status = ?, checked_out_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
    )
    .bind(GARMENT_STATUS.CHECKED_OUT, now, now, garmentId, userId)
    .run();
};

export const findGarmentIdAndStatus = async ({
  db,
  userId,
  garmentId,
}: {
  readonly db: D1Database;
  readonly userId: string;
  readonly garmentId: string;
}): Promise<Pick<GarmentRow, "id" | "status"> | undefined> => {
  const row = await db
    .prepare(`SELECT id, status FROM garments WHERE id = ? AND user_id = ?`)
    .bind(garmentId, userId)
    .first<Pick<GarmentRow, "id" | "status">>();

  if (row === null) {
    return undefined;
  }
  return row;
};

export const confirmAllAtLocation = async ({
  db,
  userId,
  locationId,
}: {
  readonly db: D1Database;
  readonly userId: string;
  readonly locationId: string;
}): Promise<number> => {
  const now = Date.now();

  const result = await db
    .prepare(
      `UPDATE garments SET last_scanned_at = ?, updated_at = ? WHERE location_id = ? AND user_id = ? AND status = ?`,
    )
    .bind(now, now, locationId, userId, GARMENT_STATUS.STORED)
    .run();

  return result.meta.changes;
};

type Confirmation = {
  readonly garmentId: string;
  readonly confirmed: boolean;
};

export const batchConfirmPartial = async ({
  db,
  userId,
  confirmations,
}: {
  readonly db: D1Database;
  readonly userId: string;
  readonly confirmations: readonly Confirmation[];
}): Promise<void> => {
  const now = Date.now();

  const statements = confirmations.map((confirmation) => {
    if (confirmation.confirmed) {
      return db
        .prepare(
          `UPDATE garments SET last_scanned_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
        )
        .bind(now, now, confirmation.garmentId, userId);
    }
    return db
      .prepare(
        `UPDATE garments SET location_id = NULL, status = ?, checked_out_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
      )
      .bind(
        GARMENT_STATUS.CHECKED_OUT,
        now,
        now,
        confirmation.garmentId,
        userId,
      );
  });

  await db.batch(statements);
};

export const resolveOrphan = async ({
  db,
  userId,
  garmentId,
  resolution,
  locationId,
}: {
  readonly db: D1Database;
  readonly userId: string;
  readonly garmentId: string;
  readonly resolution: "stored_back" | "still_using" | "lost";
  readonly locationId?: string;
}): Promise<void> => {
  const now = Date.now();

  if (resolution === "stored_back") {
    await db
      .prepare(
        `UPDATE garments SET location_id = ?, status = ?, last_scanned_at = ?, checked_out_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?`,
      )
      .bind(locationId, GARMENT_STATUS.STORED, now, now, garmentId, userId)
      .run();
  } else if (resolution === "still_using") {
    await db
      .prepare(
        `UPDATE garments SET checked_out_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
      )
      .bind(now, now, garmentId, userId)
      .run();
  } else {
    await db
      .prepare(
        `UPDATE garments SET status = ?, location_id = NULL, checked_out_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?`,
      )
      .bind(GARMENT_STATUS.LOST, now, garmentId, userId)
      .run();
  }
};
