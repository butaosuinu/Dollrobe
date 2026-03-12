import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../index";
import {
  checkinInputSchema,
  checkoutInputSchema,
  confirmAllInputSchema,
  confirmPartialInputSchema,
  orphanResolveInputSchema,
} from "../lib/schemas";
import { TEMP_USER_ID } from "../lib/d1-helpers";
import type { GarmentRow } from "../lib/d1-helpers";

const GARMENT_STATUS = Object.freeze({
  STORED: "stored",
  CHECKED_OUT: "checked_out",
  LOST: "lost",
});

export const scanRouter = router({
  checkin: publicProcedure
    .input(checkinInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { locationId, garmentIds } = input;
      const db = ctx.env.DB;
      const now = Date.now();

      const statements = garmentIds.map((garmentId) =>
        db
          .prepare(
            `UPDATE garments SET location_id = ?, status = ?, last_scanned_at = ?, checked_out_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?`,
          )
          .bind(
            locationId,
            GARMENT_STATUS.STORED,
            now,
            now,
            garmentId,
            TEMP_USER_ID,
          ),
      );

      await db.batch(statements);

      return { success: true, checkedInCount: garmentIds.length };
    }),

  checkout: publicProcedure
    .input(checkoutInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { garmentId } = input;
      const db = ctx.env.DB;
      const now = Date.now();

      const existing = await db
        .prepare(`SELECT id FROM garments WHERE id = ? AND user_id = ?`)
        .bind(garmentId, TEMP_USER_ID)
        .first<GarmentRow>();

      if (existing === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "指定された服が見つかりません",
        });
      }

      await db
        .prepare(
          `UPDATE garments SET location_id = NULL, status = ?, checked_out_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
        )
        .bind(GARMENT_STATUS.CHECKED_OUT, now, now, garmentId, TEMP_USER_ID)
        .run();

      return { success: true };
    }),

  confirmAll: publicProcedure
    .input(confirmAllInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { locationId } = input;
      const db = ctx.env.DB;
      const now = Date.now();

      const result = await db
        .prepare(
          `UPDATE garments SET last_scanned_at = ?, updated_at = ? WHERE location_id = ? AND user_id = ? AND status = ?`,
        )
        .bind(now, now, locationId, TEMP_USER_ID, GARMENT_STATUS.STORED)
        .run();

      return { success: true, confirmedCount: result.meta.changes };
    }),

  confirmPartial: publicProcedure
    .input(confirmPartialInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { confirmations } = input;
      const db = ctx.env.DB;
      const now = Date.now();

      const statements = confirmations.map((confirmation) => {
        if (confirmation.confirmed) {
          return db
            .prepare(
              `UPDATE garments SET last_scanned_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
            )
            .bind(now, now, confirmation.garmentId, TEMP_USER_ID);
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
            TEMP_USER_ID,
          );
      });

      await db.batch(statements);

      const confirmedCount = confirmations.filter((c) => c.confirmed).length;
      const deniedCount = confirmations.length - confirmedCount;

      return { success: true, confirmedCount, deniedCount };
    }),

  orphanResolve: publicProcedure
    .input(orphanResolveInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { garmentId, resolution, locationId } = input;
      const db = ctx.env.DB;
      const now = Date.now();

      const existing = await db
        .prepare(`SELECT id, status FROM garments WHERE id = ? AND user_id = ?`)
        .bind(garmentId, TEMP_USER_ID)
        .first<Pick<GarmentRow, "id" | "status">>();

      if (existing === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "指定された服が見つかりません",
        });
      }

      if (existing.status !== GARMENT_STATUS.CHECKED_OUT) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "チェックアウト状態の服のみ解決できます",
        });
      }

      if (resolution === "stored_back") {
        await db
          .prepare(
            `UPDATE garments SET location_id = ?, status = ?, last_scanned_at = ?, checked_out_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?`,
          )
          .bind(
            locationId,
            GARMENT_STATUS.STORED,
            now,
            now,
            garmentId,
            TEMP_USER_ID,
          )
          .run();
      } else if (resolution === "still_using") {
        await db
          .prepare(
            `UPDATE garments SET checked_out_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
          )
          .bind(now, now, garmentId, TEMP_USER_ID)
          .run();
      } else {
        await db
          .prepare(
            `UPDATE garments SET status = ?, location_id = NULL, checked_out_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?`,
          )
          .bind(GARMENT_STATUS.LOST, now, garmentId, TEMP_USER_ID)
          .run();
      }

      return { success: true };
    }),
});
