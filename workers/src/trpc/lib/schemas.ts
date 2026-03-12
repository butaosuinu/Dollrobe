import { z } from "zod";

const GARMENT_NAME_MAX_LENGTH = 100;
const CONFIDENCE_DECAY_MIN = 1;
const CONFIDENCE_DECAY_MAX = 365;
const DEFAULT_CONFIDENCE_DECAY_DAYS = 30;

export const cuidSchema = z.string().min(1);

export const dollSizeSchema = z.enum([
  "1/3",
  "MSD",
  "SD",
  "YoSD",
  "1/6",
  "other",
]);
export const garmentCategorySchema = z.enum([
  "tops",
  "bottoms",
  "dress",
  "outer",
  "shoes",
  "accessory",
  "other",
]);
export const garmentStatusSchema = z.enum(["stored", "checked_out", "lost"]);

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
