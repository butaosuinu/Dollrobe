import { TRPCError } from "@trpc/server";
import { createId } from "@paralleldrive/cuid2";
import { router, publicProcedure } from "../index";
import {
  cuidSchema,
  createCaseInputSchema,
  updateCaseInputSchema,
  createLocationInputSchema,
} from "../lib/schemas";
import {
  TEMP_USER_ID,
  toStorageCase,
  toStorageLocation,
  generateLabel,
} from "../lib/d1-helpers";
import type { StorageCaseRow, StorageLocationRow } from "../lib/d1-helpers";

const GARMENT_STATUS_CHECKED_OUT = "checked_out";

export const locationRouter = router({
  listCases: publicProcedure.query(async ({ ctx }) => {
    const userId = TEMP_USER_ID;

    const { results } = await ctx.env.DB.prepare(
      "SELECT * FROM storage_cases WHERE user_id = ? ORDER BY created_at DESC",
    )
      .bind(userId)
      .all<StorageCaseRow>()
      .catch((error: unknown) => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "データベースクエリに失敗しました",
          cause: error,
        });
      });

    return { cases: results.map(toStorageCase) };
  }),

  getCase: publicProcedure
    .input(cuidSchema)
    .query(async ({ ctx, input: id }) => {
      const userId = TEMP_USER_ID;

      const caseRow = await ctx.env.DB.prepare(
        "SELECT * FROM storage_cases WHERE id = ? AND user_id = ?",
      )
        .bind(id, userId)
        .first<StorageCaseRow>()
        .catch((error: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "データベースクエリに失敗しました",
            cause: error,
          });
        });

      if (caseRow == null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "ケースが見つかりません",
        });
      }

      const { results: locationRows } = await ctx.env.DB.prepare(
        "SELECT * FROM storage_locations WHERE case_id = ? AND user_id = ? ORDER BY row_num, col_num",
      )
        .bind(id, userId)
        .all<StorageLocationRow>()
        .catch((error: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "データベースクエリに失敗しました",
            cause: error,
          });
        });

      return {
        storageCase: toStorageCase(caseRow),
        locations: locationRows.map(toStorageLocation),
      };
    }),

  createCase: publicProcedure
    .input(createCaseInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = TEMP_USER_ID;
      const caseId = createId();
      const now = Date.now();

      const locationStatements = Array.from(
        { length: input.rows * input.cols },
        (_, i) => {
          const row = Math.floor(i / input.cols);
          const col = i % input.cols;
          const label = generateLabel({ row, col });

          return ctx.env.DB.prepare(
            "INSERT INTO storage_locations (id, user_id, case_id, label, row_num, col_num, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          ).bind(createId(), userId, caseId, label, row, col, now);
        },
      );

      const caseStatement = ctx.env.DB.prepare(
        "INSERT INTO storage_cases (id, user_id, name, rows, cols, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(caseId, userId, input.name, input.rows, input.cols, now);

      await ctx.env.DB.batch([caseStatement, ...locationStatements]).catch(
        (error: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ケースの作成に失敗しました",
            cause: error,
          });
        },
      );

      return { id: caseId };
    }),

  updateCase: publicProcedure
    .input(updateCaseInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = TEMP_USER_ID;

      const existing = await ctx.env.DB.prepare(
        "SELECT * FROM storage_cases WHERE id = ? AND user_id = ?",
      )
        .bind(input.id, userId)
        .first<StorageCaseRow>()
        .catch((error: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "データベースクエリに失敗しました",
            cause: error,
          });
        });

      if (existing == null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "ケースが見つかりません",
        });
      }

      await ctx.env.DB.prepare(
        "UPDATE storage_cases SET name = ? WHERE id = ? AND user_id = ?",
      )
        .bind(input.name, input.id, userId)
        .run()
        .catch((error: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ケースの更新に失敗しました",
            cause: error,
          });
        });

      return { id: input.id };
    }),

  deleteCase: publicProcedure
    .input(cuidSchema)
    .mutation(async ({ ctx, input: id }) => {
      const userId = TEMP_USER_ID;
      const now = Date.now();

      const existing = await ctx.env.DB.prepare(
        "SELECT * FROM storage_cases WHERE id = ? AND user_id = ?",
      )
        .bind(id, userId)
        .first<StorageCaseRow>()
        .catch((error: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "データベースクエリに失敗しました",
            cause: error,
          });
        });

      if (existing == null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "ケースが見つかりません",
        });
      }

      const clearGarments = ctx.env.DB.prepare(
        `UPDATE garments SET location_id = NULL, status = ?, checked_out_at = ?
         WHERE location_id IN (SELECT id FROM storage_locations WHERE case_id = ?)`,
      ).bind(GARMENT_STATUS_CHECKED_OUT, now, id);

      const deleteLocations = ctx.env.DB.prepare(
        "DELETE FROM storage_locations WHERE case_id = ? AND user_id = ?",
      ).bind(id, userId);

      const deleteCase = ctx.env.DB.prepare(
        "DELETE FROM storage_cases WHERE id = ? AND user_id = ?",
      ).bind(id, userId);

      await ctx.env.DB.batch([
        clearGarments,
        deleteLocations,
        deleteCase,
      ]).catch((error: unknown) => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "ケースの削除に失敗しました",
          cause: error,
        });
      });

      return { id };
    }),

  createLocation: publicProcedure
    .input(createLocationInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = TEMP_USER_ID;
      const now = Date.now();

      const caseRow = await ctx.env.DB.prepare(
        "SELECT * FROM storage_cases WHERE id = ? AND user_id = ?",
      )
        .bind(input.caseId, userId)
        .first<StorageCaseRow>()
        .catch((error: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "データベースクエリに失敗しました",
            cause: error,
          });
        });

      if (caseRow == null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "ケースが見つかりません",
        });
      }

      const duplicateRow = await ctx.env.DB.prepare(
        "SELECT * FROM storage_locations WHERE case_id = ? AND row_num = ? AND col_num = ?",
      )
        .bind(input.caseId, input.row, input.col)
        .first<StorageLocationRow>()
        .catch((error: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "データベースクエリに失敗しました",
            cause: error,
          });
        });

      if (duplicateRow != null) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "同じ行・列のロケーションが既に存在します",
        });
      }

      const locationId = createId();

      await ctx.env.DB.prepare(
        "INSERT INTO storage_locations (id, user_id, case_id, label, row_num, col_num, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(
          locationId,
          userId,
          input.caseId,
          input.label,
          input.row,
          input.col,
          now,
        )
        .run()
        .catch((error: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ロケーションの作成に失敗しました",
            cause: error,
          });
        });

      return { id: locationId };
    }),

  deleteLocation: publicProcedure
    .input(cuidSchema)
    .mutation(async ({ ctx, input: id }) => {
      const userId = TEMP_USER_ID;
      const now = Date.now();

      const existing = await ctx.env.DB.prepare(
        "SELECT * FROM storage_locations WHERE id = ? AND user_id = ?",
      )
        .bind(id, userId)
        .first<StorageLocationRow>()
        .catch((error: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "データベースクエリに失敗しました",
            cause: error,
          });
        });

      if (existing == null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "ロケーションが見つかりません",
        });
      }

      const clearGarments = ctx.env.DB.prepare(
        `UPDATE garments SET location_id = NULL, status = ?, checked_out_at = ?
         WHERE location_id = ?`,
      ).bind(GARMENT_STATUS_CHECKED_OUT, now, id);

      const deleteLocation = ctx.env.DB.prepare(
        "DELETE FROM storage_locations WHERE id = ? AND user_id = ?",
      ).bind(id, userId);

      await ctx.env.DB.batch([clearGarments, deleteLocation]).catch(
        (error: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ロケーションの削除に失敗しました",
            cause: error,
          });
        },
      );

      return { id };
    }),
});
