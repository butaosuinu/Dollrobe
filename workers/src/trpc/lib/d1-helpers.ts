import { z } from "zod";
import type { Garment } from "@shared/index";

export const TEMP_USER_ID = "temp-user-001";

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
  .transform((val: string) => JSON.parse(val))
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
