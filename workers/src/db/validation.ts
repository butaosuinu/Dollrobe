import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  GARMENT_CATEGORIES,
  DOLL_SIZES,
  GARMENT_STATUSES,
} from "@shared/lib/constants";
import {
  garments,
  storageCases,
  storageLocations,
  coordinates,
} from "./schema";

const GARMENT_NAME_MAX_LENGTH = 100;
const CONFIDENCE_DECAY_MIN = 1;
const CONFIDENCE_DECAY_MAX = 365;
const DEFAULT_CONFIDENCE_DECAY_DAYS = 30;
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

export const garmentSelectSchema = createSelectSchema(garments, {
  category: garmentCategorySchema,
  dollSize: dollSizeSchema,
  status: garmentStatusSchema,
});

export const storageCaseSelectSchema = createSelectSchema(storageCases);
export const storageLocationSelectSchema = createSelectSchema(storageLocations);
export const coordinateSelectSchema = createSelectSchema(coordinates);

export const garmentInsertSchema = createInsertSchema(garments, {
  name: z.string().min(1).max(GARMENT_NAME_MAX_LENGTH),
  category: garmentCategorySchema,
  dollSize: dollSizeSchema,
  status: garmentStatusSchema,
  confidenceDecayDays: z
    .number()
    .int()
    .min(CONFIDENCE_DECAY_MIN)
    .max(CONFIDENCE_DECAY_MAX),
});

export const storageCaseInsertSchema = createInsertSchema(storageCases, {
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  rows: z.number().int().min(MIN_GRID_SIZE).max(MAX_GRID_SIZE),
  cols: z.number().int().min(MIN_GRID_SIZE).max(MAX_GRID_SIZE),
});

export const storageLocationInsertSchema = createInsertSchema(
  storageLocations,
  {
    label: z.string().min(1).max(MAX_LABEL_LENGTH),
    row: z.number().int().min(0),
    col: z.number().int().min(0),
  },
);

export const createGarmentInputSchema = garmentInsertSchema
  .omit({
    id: true,
    userId: true,
    status: true,
    lastScannedAt: true,
    checkedOutAt: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
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
export type CreateGarmentInput = z.infer<typeof createGarmentInputSchema>;

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
export type UpdateGarmentInput = z.infer<typeof updateGarmentInputSchema>;

export const listGarmentsInputSchema = z.object({
  category: garmentCategorySchema.optional(),
  status: garmentStatusSchema.optional(),
  dollSize: dollSizeSchema.optional(),
  locationId: z.string().optional(),
});

export const createCaseInputSchema = storageCaseInsertSchema.pick({
  name: true,
  rows: true,
  cols: true,
});
export type CreateCaseInput = z.infer<typeof createCaseInputSchema>;

export const updateCaseInputSchema = z.object({
  id: cuidSchema,
  name: z.string().min(1).max(MAX_NAME_LENGTH),
});

export const createLocationInputSchema = storageLocationInsertSchema.pick({
  caseId: true,
  label: true,
  row: true,
  col: true,
});
