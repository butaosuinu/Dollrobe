import { z } from "zod";
import {
  GARMENT_CATEGORIES,
  DOLL_SIZES,
  GARMENT_STATUSES,
} from "@/lib/constants";

const GARMENT_NAME_MAX_LENGTH = 100;
const CONFIDENCE_DECAY_MIN = 1;
const CONFIDENCE_DECAY_MAX = 365;
const DEFAULT_CONFIDENCE_DECAY_DAYS = 30;

const MIN_GARMENT_IDS_LENGTH = 1;
const MIN_CONFIRMATIONS_LENGTH = 1;
const MAX_NAME_LENGTH = 100;
const MAX_LABEL_LENGTH = 20;
const MAX_GRID_SIZE = 20;
const MIN_GRID_SIZE = 1;

const toNonEmptyTuple = <T extends string>(arr: readonly T[]): [T, ...T[]] => {
  const [first, ...rest] = arr;
  if (first === undefined) {
    throw new Error("Array must not be empty");
  }
  return [first, ...rest];
};

export const cuidSchema = z.string().min(1);

export const dollSizeSchema = z.enum(toNonEmptyTuple(DOLL_SIZES));
export const garmentCategorySchema = z.enum(
  toNonEmptyTuple(GARMENT_CATEGORIES),
);
export const garmentStatusSchema = z.enum(toNonEmptyTuple(GARMENT_STATUSES));

export const listGarmentsInputSchema = z.object({
  category: garmentCategorySchema.optional(),
  status: garmentStatusSchema.optional(),
  dollSize: dollSizeSchema.optional(),
  locationId: z.string().optional(),
});

export const createGarmentInputSchema = z.object({
  name: z.string().min(1).max(GARMENT_NAME_MAX_LENGTH),
  category: garmentCategorySchema,
  dollSize: dollSizeSchema,
  colors: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  imageUrl: z.url().optional(),
  locationId: z.string().optional(),
  confidenceDecayDays: z
    .number()
    .int()
    .min(CONFIDENCE_DECAY_MIN)
    .max(CONFIDENCE_DECAY_MAX)
    .default(DEFAULT_CONFIDENCE_DECAY_DAYS),
});

export const updateGarmentInputSchema = z.object({
  id: cuidSchema,
  name: z.string().min(1).max(GARMENT_NAME_MAX_LENGTH).optional(),
  category: garmentCategorySchema.optional(),
  dollSize: dollSizeSchema.optional(),
  colors: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.url().optional(),
  locationId: z.string().optional(),
  confidenceDecayDays: z
    .number()
    .int()
    .min(CONFIDENCE_DECAY_MIN)
    .max(CONFIDENCE_DECAY_MAX)
    .optional(),
});

export const createCaseInputSchema = z.object({
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  rows: z.number().int().min(MIN_GRID_SIZE).max(MAX_GRID_SIZE),
  cols: z.number().int().min(MIN_GRID_SIZE).max(MAX_GRID_SIZE),
});

export const updateCaseInputSchema = z.object({
  id: cuidSchema,
  name: z.string().min(1).max(MAX_NAME_LENGTH),
});

export const createLocationInputSchema = z.object({
  caseId: cuidSchema,
  label: z.string().min(1).max(MAX_LABEL_LENGTH),
  row: z.number().int().min(0),
  col: z.number().int().min(0),
});

export const checkinInputSchema = z.object({
  locationId: cuidSchema,
  garmentIds: z.array(cuidSchema).min(MIN_GARMENT_IDS_LENGTH),
});

export const checkoutInputSchema = z.object({
  garmentId: cuidSchema,
});

export const confirmAllInputSchema = z.object({
  locationId: cuidSchema,
});

export const confirmPartialInputSchema = z.object({
  confirmations: z
    .array(
      z.object({
        garmentId: cuidSchema,
        confirmed: z.boolean(),
      }),
    )
    .min(MIN_CONFIRMATIONS_LENGTH),
});

const ORPHAN_RESOLUTIONS = ["stored_back", "still_using", "lost"] as const;

export const orphanResolveInputSchema = z
  .object({
    garmentId: cuidSchema,
    resolution: z.enum(ORPHAN_RESOLUTIONS),
    locationId: cuidSchema.optional(),
  })
  .refine(
    (data) =>
      data.resolution !== "stored_back" || data.locationId !== undefined,
    {
      message: "stored_back の場合は locationId が必要です",
      path: ["locationId"],
    },
  );
