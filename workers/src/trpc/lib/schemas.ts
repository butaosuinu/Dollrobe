import { z } from "zod";
import { SYNC_ACTION_TYPE, ORPHAN_RESOLUTION } from "@shared/lib/constants";
import { cuidSchema } from "../../db/validation";
import { toNonEmptyTuple } from "../../lib/to-non-empty-tuple";

export {
  cuidSchema,
  dollSizeSchema,
  garmentCategorySchema,
  garmentStatusSchema,
  createGarmentInputSchema,
  updateGarmentInputSchema,
  bulkCreateGarmentInputSchema,
  listGarmentsInputSchema,
  createCaseInputSchema,
  updateCaseInputSchema,
  updateLocationInputSchema,
  createLocationInputSchema,
  listDigestsInputSchema,
  markDigestReadInputSchema,
  createDollInputSchema,
  updateDollInputSchema,
  listDollsInputSchema,
} from "../../db/validation";

const MIN_GARMENT_IDS_LENGTH = 1;
const MIN_CONFIRMATIONS_LENGTH = 1;

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

const SYNC_ACTION_TYPES = toNonEmptyTuple(Object.values(SYNC_ACTION_TYPE));

const syncQueueItemSchema = z.object({
  type: z.enum(SYNC_ACTION_TYPES),
  payload: z.unknown(),
  createdAt: z.number(),
});

const MIN_SYNC_ITEMS_LENGTH = 1;

export const syncPushInputSchema = z.object({
  items: z.array(syncQueueItemSchema).min(MIN_SYNC_ITEMS_LENGTH),
});

const SYNC_PULL_DEFAULT_LIMIT = 500;
const SYNC_PULL_MAX_LIMIT = 1000;

export const syncPullInputSchema = z.object({
  since: z.number().optional(),
  cursor: z.string().optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(SYNC_PULL_MAX_LIMIT)
    .default(SYNC_PULL_DEFAULT_LIMIT),
});

const ORPHAN_RESOLUTIONS = toNonEmptyTuple(Object.values(ORPHAN_RESOLUTION));

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
