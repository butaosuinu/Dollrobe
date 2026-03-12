import { z } from "zod";

const MIN_ID_LENGTH = 1;
const MIN_GARMENT_IDS_LENGTH = 1;
const MIN_CONFIRMATIONS_LENGTH = 1;

const idSchema = z.string().min(MIN_ID_LENGTH);

export const checkinInputSchema = z.object({
  locationId: idSchema,
  garmentIds: z.array(idSchema).min(MIN_GARMENT_IDS_LENGTH),
});

export const checkoutInputSchema = z.object({
  garmentId: idSchema,
});

export const confirmAllInputSchema = z.object({
  locationId: idSchema,
});

export const confirmPartialInputSchema = z.object({
  confirmations: z
    .array(
      z.object({
        garmentId: idSchema,
        confirmed: z.boolean(),
      }),
    )
    .min(MIN_CONFIRMATIONS_LENGTH),
});

const ORPHAN_RESOLUTIONS = ["stored_back", "still_using", "lost"] as const;

export const orphanResolveInputSchema = z
  .object({
    garmentId: idSchema,
    resolution: z.enum(ORPHAN_RESOLUTIONS),
    locationId: idSchema.optional(),
  })
  .refine(
    (data) =>
      data.resolution !== "stored_back" || data.locationId !== undefined,
    {
      message: "stored_back の場合は locationId が必要です",
      path: ["locationId"],
    },
  );
