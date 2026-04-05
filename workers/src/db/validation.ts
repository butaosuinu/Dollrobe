import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  GARMENT_CATEGORIES,
  DOLL_SIZES,
  GARMENT_STATUSES,
  STORAGE_CASE_TYPES,
  GARMENT_NAME_MAX_LENGTH,
  CONFIDENCE_DECAY_MIN,
  CONFIDENCE_DECAY_MAX,
  DEFAULT_CONFIDENCE_DECAY_DAYS,
  CASE_NAME_MAX_LENGTH,
  DOLL_NAME_MAX_LENGTH,
  MAX_LABEL_LENGTH,
  DOLL_MEMO_MAX_LENGTH,
  GRID_SIZE_MAX,
  GRID_SIZE_MIN,
  CASE_DESCRIPTION_MAX_LENGTH,
  LOCATION_CUSTOM_NAME_MAX_LENGTH,
  LOCATION_DESCRIPTION_MAX_LENGTH,
} from "@shared/lib/constants";
import {
  garments,
  storageCases,
  storageLocations,
  coordinates,
  digests,
  dolls,
} from "./schema";
import { toNonEmptyTuple } from "../lib/to-non-empty-tuple";

export const cuidSchema = z.string().min(1);
export const storageCaseTypeSchema = z.enum(
  toNonEmptyTuple(STORAGE_CASE_TYPES),
);
export const dollSizeSchema = z.enum(toNonEmptyTuple(DOLL_SIZES));
export const garmentCategorySchema = z.enum(
  toNonEmptyTuple(GARMENT_CATEGORIES),
);
export const garmentStatusSchema = z.enum(toNonEmptyTuple(GARMENT_STATUSES));

export const garmentSelectSchema = createSelectSchema(garments, {
  category: garmentCategorySchema,
  status: garmentStatusSchema,
});

export const storageCaseSelectSchema = createSelectSchema(storageCases);
export const storageLocationSelectSchema = createSelectSchema(storageLocations);
export const coordinateSelectSchema = createSelectSchema(coordinates);

export const garmentInsertSchema = createInsertSchema(garments, {
  name: z.string().min(1).max(GARMENT_NAME_MAX_LENGTH),
  category: garmentCategorySchema,
  status: garmentStatusSchema,
  confidenceDecayDays: z
    .number()
    .int()
    .min(CONFIDENCE_DECAY_MIN)
    .max(CONFIDENCE_DECAY_MAX),
});

export const storageCaseInsertSchema = createInsertSchema(storageCases, {
  name: z.string().min(1).max(CASE_NAME_MAX_LENGTH),
  rows: z.number().int().min(GRID_SIZE_MIN).max(GRID_SIZE_MAX),
  cols: z.number().int().min(GRID_SIZE_MIN).max(GRID_SIZE_MAX),
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
    dollSizes: z.array(dollSizeSchema).min(1),
    colors: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    imageUrl: z.url().optional(),
    locationId: z.string().optional(),
    brand: z.string().max(GARMENT_NAME_MAX_LENGTH).optional(),
    description: z.string().max(DOLL_MEMO_MAX_LENGTH).optional(),
    setContents: z.string().max(DOLL_MEMO_MAX_LENGTH).optional(),
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
  dollSizes: z.array(dollSizeSchema).min(1).optional(),
  colors: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.url().optional(),
  locationId: z.string().optional(),
  brand: z.string().max(GARMENT_NAME_MAX_LENGTH).optional(),
  description: z.string().max(DOLL_MEMO_MAX_LENGTH).optional(),
  setContents: z.string().max(DOLL_MEMO_MAX_LENGTH).optional(),
  confidenceDecayDays: z
    .number()
    .int()
    .min(CONFIDENCE_DECAY_MIN)
    .max(CONFIDENCE_DECAY_MAX)
    .optional(),
});
export type UpdateGarmentInput = z.infer<typeof updateGarmentInputSchema>;

const BULK_CREATE_MAX_ITEMS = 50;

export const bulkCreateGarmentItemSchema = garmentInsertSchema
  .omit({
    id: true,
    userId: true,
    status: true,
    lastScannedAt: true,
    checkedOutAt: true,
    createdAt: true,
    updatedAt: true,
    imageUrl: true,
    locationId: true,
  })
  .extend({
    dollSizes: z.array(dollSizeSchema).min(1),
    colors: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    brand: z.string().max(GARMENT_NAME_MAX_LENGTH).optional(),
    confidenceDecayDays: z
      .number()
      .int()
      .min(CONFIDENCE_DECAY_MIN)
      .max(CONFIDENCE_DECAY_MAX)
      .default(DEFAULT_CONFIDENCE_DECAY_DAYS),
  });
export type BulkCreateGarmentItem = z.infer<typeof bulkCreateGarmentItemSchema>;

export const bulkCreateGarmentInputSchema = z.object({
  items: z.array(bulkCreateGarmentItemSchema).min(1).max(BULK_CREATE_MAX_ITEMS),
});
export type BulkCreateGarmentInput = z.infer<
  typeof bulkCreateGarmentInputSchema
>;

export const listGarmentsInputSchema = z.object({
  category: garmentCategorySchema.optional(),
  status: garmentStatusSchema.optional(),
  dollSize: dollSizeSchema.optional(),
  locationId: z.string().optional(),
});

export const dollSelectSchema = createSelectSchema(dolls, {
  bodySize: dollSizeSchema,
});

export const dollInsertSchema = createInsertSchema(dolls, {
  name: z.string().min(1).max(DOLL_NAME_MAX_LENGTH),
  bodySize: dollSizeSchema,
});

export const createDollInputSchema = dollInsertSchema
  .omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    headModel: z.string().max(DOLL_NAME_MAX_LENGTH).optional(),
    maker: z.string().max(DOLL_NAME_MAX_LENGTH).optional(),
    customizer: z.string().max(DOLL_NAME_MAX_LENGTH).optional(),
    imageUrl: z.url().optional(),
    memo: z.string().max(DOLL_MEMO_MAX_LENGTH).optional(),
  });
export type CreateDollInput = z.infer<typeof createDollInputSchema>;

export const updateDollInputSchema = z.object({
  id: cuidSchema,
  name: z.string().min(1).max(DOLL_NAME_MAX_LENGTH).optional(),
  headModel: z.string().max(DOLL_NAME_MAX_LENGTH).optional(),
  bodySize: dollSizeSchema.optional(),
  maker: z.string().max(DOLL_NAME_MAX_LENGTH).optional(),
  customizer: z.string().max(DOLL_NAME_MAX_LENGTH).optional(),
  imageUrl: z.url().optional(),
  memo: z.string().max(DOLL_MEMO_MAX_LENGTH).optional(),
});
export type UpdateDollInput = z.infer<typeof updateDollInputSchema>;

export const listDollsInputSchema = z.object({
  bodySize: dollSizeSchema.optional(),
});

const caseDescriptionSchema = z
  .string()
  .max(CASE_DESCRIPTION_MAX_LENGTH)
  .optional()
  .transform((v) => v ?? undefined);

export const createCaseInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("grid"),
    name: z.string().min(1).max(CASE_NAME_MAX_LENGTH),
    description: caseDescriptionSchema,
    rows: z.number().int().min(GRID_SIZE_MIN).max(GRID_SIZE_MAX),
    cols: z.number().int().min(GRID_SIZE_MIN).max(GRID_SIZE_MAX),
  }),
  z.object({
    type: z.literal("unit"),
    name: z.string().min(1).max(CASE_NAME_MAX_LENGTH),
    description: caseDescriptionSchema,
  }),
]);
export type CreateCaseInput = z.infer<typeof createCaseInputSchema>;

export const updateCaseInputSchema = z.object({
  id: cuidSchema,
  name: z.string().min(1).max(CASE_NAME_MAX_LENGTH),
  description: caseDescriptionSchema,
});

export const updateLocationInputSchema = z.object({
  id: cuidSchema,
  customName: z
    .string()
    .max(LOCATION_CUSTOM_NAME_MAX_LENGTH)
    .optional()
    .transform((v) => v ?? undefined),
  description: z
    .string()
    .max(LOCATION_DESCRIPTION_MAX_LENGTH)
    .optional()
    .transform((v) => v ?? undefined),
});
export type UpdateLocationInput = z.infer<typeof updateLocationInputSchema>;

export const createLocationInputSchema = storageLocationInsertSchema.pick({
  caseId: true,
  label: true,
  row: true,
  col: true,
});

export const digestSelectSchema = createSelectSchema(digests);
export const digestInsertSchema = createInsertSchema(digests);

const DIGEST_LIST_MAX_LIMIT = 50;
const DIGEST_LIST_DEFAULT_LIMIT = 10;

export const listDigestsInputSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(DIGEST_LIST_MAX_LIMIT)
    .default(DIGEST_LIST_DEFAULT_LIMIT),
});

export const markDigestReadInputSchema = z.object({
  id: cuidSchema,
});
