import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../index";
import {
  listGarmentsInputSchema,
  createGarmentInputSchema,
  updateGarmentInputSchema,
  cuidSchema,
} from "../lib/schemas";
import { type GarmentRow, toGarment, TEMP_USER_ID } from "../lib/d1-helpers";
import { GARMENT_STATUS } from "@shared/lib/constants";

export const garmentRouter = router({
  list: publicProcedure
    .input(listGarmentsInputSchema)
    .query(async ({ ctx, input }) => {
      const userId = TEMP_USER_ID;

      type FilterCandidate = {
        readonly column: string;
        readonly value: string | undefined;
      };

      const isDefinedFilter = (
        f: FilterCandidate,
      ): f is { readonly column: string; readonly value: string } =>
        f.value !== undefined;

      const filterCandidates: readonly FilterCandidate[] = [
        { column: "category", value: input.category },
        { column: "status", value: input.status },
        { column: "doll_size", value: input.dollSize },
        { column: "location_id", value: input.locationId },
      ];

      const activeFilters = filterCandidates.filter(isDefinedFilter);

      const conditions = [
        "user_id = ?1",
        ...activeFilters.map((f, i) => `${f.column} = ?${String(i + 2)}`),
      ];
      const params: ReadonlyArray<string | number> = [
        userId,
        ...activeFilters.map((f) => f.value),
      ];

      const sql = `SELECT * FROM garments WHERE ${conditions.join(" AND ")} ORDER BY updated_at DESC`;

      const result = await ctx.env.DB.prepare(sql)
        .bind(...params)
        .all<GarmentRow>()
        .catch((err: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              err instanceof Error ? err.message : "Failed to fetch garments",
          });
        });

      return result.results.map(toGarment);
    }),

  get: publicProcedure
    .input(z.object({ id: cuidSchema }))
    .query(async ({ ctx, input }) => {
      const userId = TEMP_USER_ID;

      const row = await ctx.env.DB.prepare(
        "SELECT * FROM garments WHERE id = ?1 AND user_id = ?2",
      )
        .bind(input.id, userId)
        .first<GarmentRow>()
        .catch((err: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              err instanceof Error ? err.message : "Failed to fetch garment",
          });
        });

      if (row === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Garment not found: ${input.id}`,
        });
      }

      return toGarment(row);
    }),

  create: publicProcedure
    .input(createGarmentInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = TEMP_USER_ID;
      const id = createId();
      const now = Date.now();
      const status =
        input.locationId !== undefined
          ? GARMENT_STATUS.STORED
          : GARMENT_STATUS.CHECKED_OUT;
      const checkedOutAt = input.locationId !== undefined ? undefined : now;

      await ctx.env.DB.prepare(
        `INSERT INTO garments (id, user_id, name, category, doll_size, colors, tags, image_url, location_id, status, last_scanned_at, confidence_decay_days, checked_out_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`,
      )
        .bind(
          id,
          userId,
          input.name,
          input.category,
          input.dollSize,
          JSON.stringify(input.colors),
          JSON.stringify(input.tags),
          input.imageUrl ?? null,
          input.locationId ?? null,
          status,
          now,
          input.confidenceDecayDays,
          checkedOutAt ?? null,
          now,
          now,
        )
        .run()
        .catch((err: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              err instanceof Error ? err.message : "Failed to create garment",
          });
        });

      const row = await ctx.env.DB.prepare(
        "SELECT * FROM garments WHERE id = ?1",
      )
        .bind(id)
        .first<GarmentRow>()
        .catch((err: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              err instanceof Error
                ? err.message
                : "Failed to fetch created garment",
          });
        });

      if (row === null) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Created garment not found",
        });
      }

      return toGarment(row);
    }),

  update: publicProcedure
    .input(updateGarmentInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = TEMP_USER_ID;

      const existing = await ctx.env.DB.prepare(
        "SELECT * FROM garments WHERE id = ?1 AND user_id = ?2",
      )
        .bind(input.id, userId)
        .first<GarmentRow>()
        .catch((err: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              err instanceof Error ? err.message : "Failed to fetch garment",
          });
        });

      if (existing === null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Garment not found: ${input.id}`,
        });
      }

      type FieldUpdate = {
        readonly column: string;
        readonly value: string | number;
      };

      type FieldCandidate = {
        readonly column: string;
        readonly value: string | number | undefined;
      };

      const fieldCandidates: readonly FieldCandidate[] = [
        { column: "name", value: input.name },
        { column: "category", value: input.category },
        { column: "doll_size", value: input.dollSize },
        {
          column: "colors",
          value:
            input.colors !== undefined
              ? JSON.stringify(input.colors)
              : undefined,
        },
        {
          column: "tags",
          value:
            input.tags !== undefined ? JSON.stringify(input.tags) : undefined,
        },
        { column: "image_url", value: input.imageUrl },
        { column: "location_id", value: input.locationId },
        { column: "confidence_decay_days", value: input.confidenceDecayDays },
      ];

      const isDefinedField = (f: FieldCandidate): f is FieldUpdate =>
        f.value !== undefined;

      const updates = fieldCandidates.filter(isDefinedField);

      const now = Date.now();
      const setClauses = [
        ...updates.map((f, i) => `${f.column} = ?${String(i + 1)}`),
        `updated_at = ?${String(updates.length + 1)}`,
      ];
      const setParams: ReadonlyArray<string | number> = [
        ...updates.map((f) => f.value),
        now,
      ];

      const sql = `UPDATE garments SET ${setClauses.join(", ")} WHERE id = ?${String(setParams.length + 1)} AND user_id = ?${String(setParams.length + 2)}`;
      const allParams = [...setParams, input.id, userId];

      await ctx.env.DB.prepare(sql)
        .bind(...allParams)
        .run()
        .catch((err: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              err instanceof Error ? err.message : "Failed to update garment",
          });
        });

      const row = await ctx.env.DB.prepare(
        "SELECT * FROM garments WHERE id = ?1 AND user_id = ?2",
      )
        .bind(input.id, userId)
        .first<GarmentRow>()
        .catch((err: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              err instanceof Error
                ? err.message
                : "Failed to fetch updated garment",
          });
        });

      if (row === null) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Updated garment not found",
        });
      }

      return toGarment(row);
    }),

  delete: publicProcedure
    .input(z.object({ id: cuidSchema }))
    .mutation(async ({ ctx, input }) => {
      const userId = TEMP_USER_ID;

      await ctx.env.DB.prepare(
        "DELETE FROM garments WHERE id = ?1 AND user_id = ?2",
      )
        .bind(input.id, userId)
        .run()
        .catch((err: unknown) => {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              err instanceof Error ? err.message : "Failed to delete garment",
          });
        });

      return { success: true };
    }),
});
