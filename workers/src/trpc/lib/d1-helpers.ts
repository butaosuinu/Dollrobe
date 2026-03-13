import { z } from "zod";
import type { Garment, StorageCase, StorageLocation } from "@/types/index";
import type { TRPCContext } from "../index";

export const TEMP_USER_ID = "temp-user-001";

const ASCII_UPPER_A = 65;
const MAX_LABEL_ROWS = 26;

export const getUserId = (_ctx: TRPCContext): string => TEMP_USER_ID;

// --- StorageCase / StorageLocation helpers (from PR #25) ---

export type StorageCaseRow = {
  readonly id: string;
  readonly user_id: string;
  readonly name: string;
  readonly rows: number;
  readonly cols: number;
  readonly created_at: number;
};

export type StorageLocationRow = {
  readonly id: string;
  readonly user_id: string;
  readonly case_id: string;
  readonly label: string;
  readonly row_num: number;
  readonly col_num: number;
  readonly created_at: number;
};

export const toStorageCase = (row: StorageCaseRow): StorageCase => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  rows: row.rows,
  cols: row.cols,
  createdAt: row.created_at,
});

export const toStorageLocation = (
  row: StorageLocationRow,
): StorageLocation => ({
  id: row.id,
  userId: row.user_id,
  caseId: row.case_id,
  label: row.label,
  row: row.row_num,
  col: row.col_num,
  createdAt: row.created_at,
});

export const generateLabel = ({
  row,
  col,
}: {
  readonly row: number;
  readonly col: number;
}): string => {
  if (row >= MAX_LABEL_ROWS) {
    throw new Error(`row must be less than ${MAX_LABEL_ROWS}, got ${row}`);
  }
  return `${String.fromCharCode(ASCII_UPPER_A + row)}-${col + 1}`;
};

// --- Garment helpers (from PR #26) ---

const GARMENT_CATEGORIES = [
  "tops",
  "bottoms",
  "dress",
  "outer",
  "shoes",
  "accessory",
  "other",
] as const;
const DOLL_SIZES = ["1/3", "MSD", "SD", "YoSD", "1/6", "other"] as const;
const GARMENT_STATUSES = ["stored", "checked_out", "lost"] as const;

const jsonStringArraySchema = z
  .string()
  .transform((val: string) => JSON.parse(val) as unknown)
  .pipe(z.array(z.string()));

const garmentRowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  category: z.enum(GARMENT_CATEGORIES),
  doll_size: z.enum(DOLL_SIZES),
  colors: jsonStringArraySchema,
  tags: jsonStringArraySchema,
  image_url: z.string().nullable(),
  location_id: z.string().nullable(),
  status: z.enum(GARMENT_STATUSES),
  last_scanned_at: z.number(),
  confidence_decay_days: z.number(),
  checked_out_at: z.number().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
});

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

export const toGarment = (row: GarmentRow): Garment => {
  const parsed = garmentRowSchema.parse(row);
  return {
    id: parsed.id,
    userId: parsed.user_id,
    name: parsed.name,
    category: parsed.category,
    dollSize: parsed.doll_size,
    colors: parsed.colors,
    tags: parsed.tags,
    imageUrl: parsed.image_url ?? undefined,
    locationId: parsed.location_id ?? undefined,
    status: parsed.status,
    lastScannedAt: parsed.last_scanned_at,
    confidenceDecayDays: parsed.confidence_decay_days,
    checkedOutAt: parsed.checked_out_at ?? undefined,
    createdAt: parsed.created_at,
    updatedAt: parsed.updated_at,
  };
};
