import { z } from "zod";

const MIN_GARMENT_IDS_LENGTH = 1;
const MIN_CONFIRMATIONS_LENGTH = 1;
const MAX_NAME_LENGTH = 100;
const MAX_LABEL_LENGTH = 20;
const MAX_GRID_SIZE = 20;
const MIN_GRID_SIZE = 1;

export const cuidSchema = z.string().min(1);

// --- Location schemas (from PR #25) ---

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

// --- Scan schemas (from PR #26) ---

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
