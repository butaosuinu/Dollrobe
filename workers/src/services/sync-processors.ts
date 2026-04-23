import { z } from "zod";
import type { DrizzleDB } from "../db/client";
import type { Logger } from "../lib/logger";
import * as syncRepo from "../repositories/sync-repository";
import { type ServiceResult, serviceError, serviceOk } from "./types";

type ProcessContext = {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly logger: Logger;
};

type ProcessResult = ServiceResult<{ readonly processed: true }>;

export type ActionProcessor = (
  ctx: ProcessContext,
  payload: unknown,
) => Promise<ProcessResult>;

const legacyDollSizeShape = z.object({ dollSize: z.string().min(1) }).loose();

const normalizeDollSizes = (val: unknown): unknown => {
  if (typeof val !== "object" || val === null) return val;
  if ("dollSizes" in val && Array.isArray(val.dollSizes)) return val;
  const legacy = legacyDollSizeShape.safeParse(val);
  if (legacy.success) {
    const { dollSize, ...rest } = legacy.data;
    return { ...rest, dollSizes: [dollSize] };
  }
  return val;
};

const garmentPayloadSchema = z.preprocess(
  normalizeDollSizes,
  z.object({
    id: z.string().min(1),
    userId: z.string().min(1),
    name: z.string().min(1),
    category: z.string(),
    dollSizes: z.array(z.string()),
    colors: z.array(z.string()),
    tags: z.array(z.string()),
    imageUrl: z.string().optional(),
    locationId: z.string().optional(),
    status: z.string(),
    lastScannedAt: z.number(),
    confidenceDecayDays: z.number(),
    confidenceDecayDaysOverride: z.number().nullable().optional(),
    brand: z.string().optional(),
    checkedOutAt: z.number().optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
    archivedAt: z.number().optional(),
  }),
);

const deletePayloadSchema = z.object({
  id: z.string().min(1),
});

const storageCaseSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  type: z.string().optional(),
  description: z.string().optional(),
  rows: z.number().int(),
  cols: z.number().int(),
  createdAt: z.number(),
});

const storageLocationSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  caseId: z.string().min(1),
  label: z.string().min(1),
  customName: z.string().optional(),
  description: z.string().optional(),
  row: z.number().int(),
  col: z.number().int(),
  lastVisitedAt: z.number().optional(),
  confirmAllCount: z.number().int().nonnegative().optional(),
  correctionCount: z.number().int().nonnegative().optional(),
  createdAt: z.number(),
});

const storageCaseCreateWithLocationsSchema = z.object({
  storageCase: storageCaseSchema,
  locations: z.array(storageLocationSchema),
});

const dollPayloadSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  headModel: z.string().optional(),
  bodySize: z.string(),
  maker: z.string().optional(),
  customizer: z.string().optional(),
  imageUrl: z.string().optional(),
  memo: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  archivedAt: z.number().optional(),
});

const toGarmentInsertValues = ({
  parsed,
  authenticatedUserId,
}: {
  readonly parsed: z.infer<typeof garmentPayloadSchema>;
  readonly authenticatedUserId: string;
}) => ({
  id: parsed.id,
  userId: authenticatedUserId,
  name: parsed.name,
  category: parsed.category,
  dollSizes: parsed.dollSizes,
  colors: parsed.colors,
  tags: parsed.tags,
  imageUrl: parsed.imageUrl ?? null,
  locationId: parsed.locationId ?? null,
  status: parsed.status,
  lastScannedAt: parsed.lastScannedAt,
  confidenceDecayDays: parsed.confidenceDecayDays,
  confidenceDecayDaysOverride: parsed.confidenceDecayDaysOverride ?? null,
  brand: parsed.brand ?? null,
  checkedOutAt: parsed.checkedOutAt ?? null,
  archivedAt: parsed.archivedAt ?? null,
  createdAt: parsed.createdAt,
  updatedAt: parsed.updatedAt,
});

const toCaseInsertValues = ({
  parsed,
  authenticatedUserId,
}: {
  readonly parsed: z.infer<typeof storageCaseSchema>;
  readonly authenticatedUserId: string;
}) => ({
  id: parsed.id,
  userId: authenticatedUserId,
  name: parsed.name,
  type: parsed.type ?? "grid",
  description: parsed.description ?? null,
  rows: parsed.rows,
  cols: parsed.cols,
  createdAt: parsed.createdAt,
});

const toLocationInsertValues = ({
  parsed,
  authenticatedUserId,
}: {
  readonly parsed: z.infer<typeof storageLocationSchema>;
  readonly authenticatedUserId: string;
}) => ({
  id: parsed.id,
  userId: authenticatedUserId,
  caseId: parsed.caseId,
  label: parsed.label,
  customName: parsed.customName ?? null,
  description: parsed.description ?? null,
  row: parsed.row,
  col: parsed.col,
  lastVisitedAt: parsed.lastVisitedAt ?? null,
  confirmAllCount: parsed.confirmAllCount ?? 0,
  correctionCount: parsed.correctionCount ?? 0,
  createdAt: parsed.createdAt,
});

const hasLocationCounters = (
  parsed: z.infer<typeof storageLocationSchema>,
): boolean =>
  parsed.confirmAllCount !== undefined ||
  parsed.correctionCount !== undefined ||
  parsed.lastVisitedAt !== undefined;

const toDollInsertValues = ({
  parsed,
  authenticatedUserId,
}: {
  readonly parsed: z.infer<typeof dollPayloadSchema>;
  readonly authenticatedUserId: string;
}) => ({
  id: parsed.id,
  userId: authenticatedUserId,
  name: parsed.name,
  headModel: parsed.headModel ?? null,
  bodySize: parsed.bodySize,
  maker: parsed.maker ?? null,
  customizer: parsed.customizer ?? null,
  imageUrl: parsed.imageUrl ?? null,
  memo: parsed.memo ?? null,
  archivedAt: parsed.archivedAt ?? null,
  createdAt: parsed.createdAt,
  updatedAt: parsed.updatedAt,
});

const processGarmentUpsert: ActionProcessor = async (ctx, payload) => {
  const parsed = garmentPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return serviceError(
      "BAD_REQUEST",
      `Invalid garment payload: ${parsed.error.message}`,
    );
  }
  await syncRepo.upsertGarment({
    drizzleDb: ctx.drizzleDb,
    garmentValues: toGarmentInsertValues({
      parsed: parsed.data,
      authenticatedUserId: ctx.userId,
    }),
    logger: ctx.logger,
  });
  return serviceOk({ processed: true });
};

const processGarmentDelete: ActionProcessor = async (ctx, payload) => {
  const parsed = deletePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return serviceError(
      "BAD_REQUEST",
      `Invalid delete payload: ${parsed.error.message}`,
    );
  }
  await syncRepo.deleteGarment({
    drizzleDb: ctx.drizzleDb,
    userId: ctx.userId,
    garmentId: parsed.data.id,
    logger: ctx.logger,
  });
  return serviceOk({ processed: true });
};

const processStorageCaseCreate: ActionProcessor = async (ctx, payload) => {
  const withLocations = storageCaseCreateWithLocationsSchema.safeParse(payload);
  if (withLocations.success) {
    await syncRepo.upsertStorageCase({
      drizzleDb: ctx.drizzleDb,
      caseValues: toCaseInsertValues({
        parsed: withLocations.data.storageCase,
        authenticatedUserId: ctx.userId,
      }),
      logger: ctx.logger,
    });
    await Promise.all(
      withLocations.data.locations.map(async (loc) => {
        await syncRepo.upsertStorageLocation({
          drizzleDb: ctx.drizzleDb,
          locationValues: toLocationInsertValues({
            parsed: loc,
            authenticatedUserId: ctx.userId,
          }),
          includeCounters: hasLocationCounters(loc),
          logger: ctx.logger,
        });
      }),
    );
    return serviceOk({ processed: true });
  }

  const caseOnly = storageCaseSchema.safeParse(payload);
  if (!caseOnly.success) {
    return serviceError(
      "BAD_REQUEST",
      `Invalid storageCase:create payload: ${caseOnly.error.message}`,
    );
  }
  await syncRepo.upsertStorageCase({
    drizzleDb: ctx.drizzleDb,
    caseValues: toCaseInsertValues({
      parsed: caseOnly.data,
      authenticatedUserId: ctx.userId,
    }),
    logger: ctx.logger,
  });
  return serviceOk({ processed: true });
};

const processStorageCaseUpdate: ActionProcessor = async (ctx, payload) => {
  const parsed = storageCaseSchema.safeParse(payload);
  if (!parsed.success) {
    return serviceError(
      "BAD_REQUEST",
      `Invalid storageCase payload: ${parsed.error.message}`,
    );
  }
  await syncRepo.upsertStorageCase({
    drizzleDb: ctx.drizzleDb,
    caseValues: toCaseInsertValues({
      parsed: parsed.data,
      authenticatedUserId: ctx.userId,
    }),
    logger: ctx.logger,
  });
  return serviceOk({ processed: true });
};

const processStorageCaseDelete: ActionProcessor = async (ctx, payload) => {
  const parsed = deletePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return serviceError(
      "BAD_REQUEST",
      `Invalid delete payload: ${parsed.error.message}`,
    );
  }
  await syncRepo.deleteStorageCaseWithCascade({
    drizzleDb: ctx.drizzleDb,
    userId: ctx.userId,
    caseId: parsed.data.id,
    logger: ctx.logger,
  });
  return serviceOk({ processed: true });
};

const processStorageLocationCreate: ActionProcessor = async (ctx, payload) => {
  const parsed = storageLocationSchema.safeParse(payload);
  if (!parsed.success) {
    return serviceError(
      "BAD_REQUEST",
      `Invalid storageLocation payload: ${parsed.error.message}`,
    );
  }
  await syncRepo.upsertStorageLocation({
    drizzleDb: ctx.drizzleDb,
    locationValues: toLocationInsertValues({
      parsed: parsed.data,
      authenticatedUserId: ctx.userId,
    }),
    includeCounters: hasLocationCounters(parsed.data),
    logger: ctx.logger,
  });
  return serviceOk({ processed: true });
};

const processStorageLocationUpdate: ActionProcessor = async (ctx, payload) => {
  const parsed = storageLocationSchema.safeParse(payload);
  if (!parsed.success) {
    return serviceError(
      "BAD_REQUEST",
      `Invalid storageLocation payload: ${parsed.error.message}`,
    );
  }
  await syncRepo.upsertStorageLocation({
    drizzleDb: ctx.drizzleDb,
    locationValues: toLocationInsertValues({
      parsed: parsed.data,
      authenticatedUserId: ctx.userId,
    }),
    includeCounters: hasLocationCounters(parsed.data),
    logger: ctx.logger,
  });
  return serviceOk({ processed: true });
};

const coordinatePayloadSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  garmentIds: z.array(z.string()),
  isAiGenerated: z.boolean(),
  memo: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const toCoordinateInsertValues = ({
  parsed,
  authenticatedUserId,
}: {
  readonly parsed: z.infer<typeof coordinatePayloadSchema>;
  readonly authenticatedUserId: string;
}) => ({
  id: parsed.id,
  userId: authenticatedUserId,
  name: parsed.name,
  garmentIds: parsed.garmentIds,
  isAiGenerated: parsed.isAiGenerated,
  memo: parsed.memo ?? null,
  createdAt: parsed.createdAt,
  updatedAt: parsed.updatedAt,
});

const processCoordinateUpsert: ActionProcessor = async (ctx, payload) => {
  const parsed = coordinatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return serviceError(
      "BAD_REQUEST",
      `Invalid coordinate payload: ${parsed.error.message}`,
    );
  }
  await syncRepo.upsertCoordinate({
    drizzleDb: ctx.drizzleDb,
    coordinateValues: toCoordinateInsertValues({
      parsed: parsed.data,
      authenticatedUserId: ctx.userId,
    }),
    logger: ctx.logger,
  });
  return serviceOk({ processed: true });
};

const processCoordinateDelete: ActionProcessor = async (ctx, payload) => {
  const parsed = deletePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return serviceError(
      "BAD_REQUEST",
      `Invalid delete payload: ${parsed.error.message}`,
    );
  }
  await syncRepo.deleteCoordinate({
    drizzleDb: ctx.drizzleDb,
    userId: ctx.userId,
    coordinateId: parsed.data.id,
    logger: ctx.logger,
  });
  return serviceOk({ processed: true });
};

const processDollUpsert: ActionProcessor = async (ctx, payload) => {
  const parsed = dollPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return serviceError(
      "BAD_REQUEST",
      `Invalid doll payload: ${parsed.error.message}`,
    );
  }
  await syncRepo.upsertDoll({
    drizzleDb: ctx.drizzleDb,
    dollValues: toDollInsertValues({
      parsed: parsed.data,
      authenticatedUserId: ctx.userId,
    }),
    logger: ctx.logger,
  });
  return serviceOk({ processed: true });
};

const processDollDelete: ActionProcessor = async (ctx, payload) => {
  const parsed = deletePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return serviceError(
      "BAD_REQUEST",
      `Invalid delete payload: ${parsed.error.message}`,
    );
  }
  await syncRepo.deleteDoll({
    drizzleDb: ctx.drizzleDb,
    userId: ctx.userId,
    dollId: parsed.data.id,
    logger: ctx.logger,
  });
  return serviceOk({ processed: true });
};

export const ACTION_PROCESSORS: Readonly<Record<string, ActionProcessor>> = {
  "garment:create": processGarmentUpsert,
  "garment:update": processGarmentUpsert,
  "garment:delete": processGarmentDelete,
  "storageCase:create": processStorageCaseCreate,
  "storageCase:update": processStorageCaseUpdate,
  "storageCase:delete": processStorageCaseDelete,
  "storageLocation:create": processStorageLocationCreate,
  "storageLocation:update": processStorageLocationUpdate,
  "doll:create": processDollUpsert,
  "doll:update": processDollUpsert,
  "doll:delete": processDollDelete,
  "coordinate:create": processCoordinateUpsert,
  "coordinate:update": processCoordinateUpsert,
  "coordinate:delete": processCoordinateDelete,
};
