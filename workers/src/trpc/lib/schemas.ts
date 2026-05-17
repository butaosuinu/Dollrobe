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
  createCoordinateInputSchema,
  updateCoordinateInputSchema,
  listCoordinatesInputSchema,
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
  locationId: cuidSchema,
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

const ADMIN_LIST_DEFAULT_LIMIT = 50;
const ADMIN_LIST_MAX_LIMIT = 200;
const ADMIN_REASON_MAX_LENGTH = 500;

const adminUserIdSchema = z.string().min(1);

export const adminUserRoleSchema = z.enum(["admin", "user"]);

export const adminListUsersInputSchema = z.object({
  search: z.string().max(ADMIN_REASON_MAX_LENGTH).optional(),
  role: adminUserRoleSchema.optional(),
  frozen: z.boolean().optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(ADMIN_LIST_MAX_LIMIT)
    .default(ADMIN_LIST_DEFAULT_LIMIT),
  offset: z.number().int().min(0).default(0),
});

export const adminUserDetailInputSchema = z.object({
  id: adminUserIdSchema,
});

export const adminFreezeInputSchema = z.object({
  targetUserId: adminUserIdSchema,
  reason: z.string().max(ADMIN_REASON_MAX_LENGTH).optional(),
});

export const adminListAuditsInputSchema = z.object({
  action: z.string().max(ADMIN_REASON_MAX_LENGTH).optional(),
  actorUserId: adminUserIdSchema.optional(),
  targetUserId: adminUserIdSchema.optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(ADMIN_LIST_MAX_LIMIT)
    .default(ADMIN_LIST_DEFAULT_LIMIT),
  offset: z.number().int().min(0).default(0),
});

export const adminUserDataPagedInputSchema = z.object({
  userId: adminUserIdSchema,
  limit: z
    .number()
    .int()
    .min(1)
    .max(ADMIN_LIST_MAX_LIMIT)
    .default(ADMIN_LIST_DEFAULT_LIMIT),
  offset: z.number().int().min(0).default(0),
});

export const adminUserDataInputSchema = z.object({
  userId: adminUserIdSchema,
});
