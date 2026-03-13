import type {
  Garment,
  GarmentCategory,
  DollSize,
  GarmentStatus,
} from "@/types";
import {
  GARMENT_CATEGORY_LABEL,
  DOLL_SIZE_LABEL,
  GARMENT_STATUS_LABEL,
} from "@shared/lib/constants";
import { TRPCError } from "@trpc/server";

export const TEMP_USER_ID = "temp-user-001";

export const wrapDbError =
  (context: string) =>
  (err: unknown): never => {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: err instanceof Error ? err.message : `Failed to ${context}`,
    });
  };

export type GarmentRow = {
  readonly id: string;
  readonly user_id: string;
  readonly name: string;
  readonly category: string;
  readonly doll_size: string;
  readonly colors: string;
  readonly tags: string;
  readonly image_url: string | null;
  readonly location_id: string | null;
  readonly status: string;
  readonly last_scanned_at: number;
  readonly confidence_decay_days: number;
  readonly checked_out_at: number | null;
  readonly created_at: number;
  readonly updated_at: number;
};

const isGarmentCategory = (value: string): value is GarmentCategory =>
  Object.hasOwn(GARMENT_CATEGORY_LABEL, value);

const isDollSize = (value: string): value is DollSize =>
  Object.hasOwn(DOLL_SIZE_LABEL, value);

const isGarmentStatus = (value: string): value is GarmentStatus =>
  Object.hasOwn(GARMENT_STATUS_LABEL, value);

const isJsonArraySyntax = (str: string): boolean => {
  const trimmed = str.trim();
  return trimmed.startsWith("[") && trimmed.endsWith("]");
};

const parseJsonArray = (json: string, fieldName: string): readonly string[] => {
  if (!isJsonArraySyntax(json)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Invalid JSON array in field "${fieldName}": ${json}`,
    });
  }
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(
    (item: unknown): item is string => typeof item === "string",
  );
};

export const toGarment = (row: GarmentRow): Garment => {
  if (!isGarmentCategory(row.category)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Invalid category: ${row.category}`,
    });
  }

  if (!isDollSize(row.doll_size)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Invalid doll_size: ${row.doll_size}`,
    });
  }

  if (!isGarmentStatus(row.status)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Invalid status: ${row.status}`,
    });
  }

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    dollSize: row.doll_size,
    colors: parseJsonArray(row.colors, "colors"),
    tags: parseJsonArray(row.tags, "tags"),
    imageUrl: row.image_url ?? undefined,
    locationId: row.location_id ?? undefined,
    status: row.status,
    lastScannedAt: row.last_scanned_at,
    confidenceDecayDays: row.confidence_decay_days,
    checkedOutAt: row.checked_out_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};
