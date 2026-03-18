import { z } from "zod";
import type { Garment, StorageCase, StorageLocation } from "@/types";
import type { Logger } from "../lib/logger";
import type { DrizzleDB } from "../db/client";
import * as syncRepo from "../repositories/sync-repository";
import * as garmentRepo from "../repositories/garment-repository";
import * as locationRepo from "../repositories/location-repository";
import { type ServiceResult, serviceError, serviceOk } from "./types";

const garmentPayloadSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  category: z.string(),
  dollSize: z.string(),
  colors: z.array(z.string()),
  tags: z.array(z.string()),
  imageUrl: z.string().optional(),
  locationId: z.string().optional(),
  status: z.string(),
  lastScannedAt: z.number(),
  confidenceDecayDays: z.number(),
  brand: z.string().optional(),
  checkedOutAt: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const deletePayloadSchema = z.object({
  id: z.string().min(1),
});

const storageCaseSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  rows: z.number().int(),
  cols: z.number().int(),
  createdAt: z.number(),
});

const storageLocationSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  caseId: z.string().min(1),
  label: z.string().min(1),
  row: z.number().int(),
  col: z.number().int(),
  createdAt: z.number(),
});

const storageCaseCreateWithLocationsSchema = z.object({
  storageCase: storageCaseSchema,
  locations: z.array(storageLocationSchema),
});

type SyncItem = {
  readonly type: string;
  readonly payload: unknown;
  readonly createdAt: number;
};

type ProcessContext = {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly logger: Logger;
};

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
  dollSize: parsed.dollSize,
  colors: parsed.colors,
  tags: parsed.tags,
  imageUrl: parsed.imageUrl ?? null,
  locationId: parsed.locationId ?? null,
  status: parsed.status,
  lastScannedAt: parsed.lastScannedAt,
  confidenceDecayDays: parsed.confidenceDecayDays,
  brand: parsed.brand ?? null,
  checkedOutAt: parsed.checkedOutAt ?? null,
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
  row: parsed.row,
  col: parsed.col,
  createdAt: parsed.createdAt,
});

type ProcessResult = ServiceResult<{ readonly processed: true }>;

const processGarmentUpsert = async (
  ctx: ProcessContext,
  payload: unknown,
): Promise<ProcessResult> => {
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

const processGarmentDelete = async (
  ctx: ProcessContext,
  payload: unknown,
): Promise<ProcessResult> => {
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

const processStorageCaseCreate = async (
  ctx: ProcessContext,
  payload: unknown,
): Promise<ProcessResult> => {
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

const processStorageCaseUpdate = async (
  ctx: ProcessContext,
  payload: unknown,
): Promise<ProcessResult> => {
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

const processStorageCaseDelete = async (
  ctx: ProcessContext,
  payload: unknown,
): Promise<ProcessResult> => {
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

const processStorageLocationCreate = async (
  ctx: ProcessContext,
  payload: unknown,
): Promise<ProcessResult> => {
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
    logger: ctx.logger,
  });
  return serviceOk({ processed: true });
};

type ActionHandler = (
  ctx: ProcessContext,
  payload: unknown,
) => Promise<ProcessResult>;

const ACTION_HANDLERS: Readonly<Record<string, ActionHandler>> = {
  "garment:create": processGarmentUpsert,
  "garment:update": processGarmentUpsert,
  "garment:delete": processGarmentDelete,
  "storageCase:create": processStorageCaseCreate,
  "storageCase:update": processStorageCaseUpdate,
  "storageCase:delete": processStorageCaseDelete,
  "storageLocation:create": processStorageLocationCreate,
};

const processItem = async (
  ctx: ProcessContext,
  item: SyncItem,
): Promise<ProcessResult> => {
  const handler = ACTION_HANDLERS[item.type];
  if (handler === undefined) {
    return serviceError(
      "BAD_REQUEST",
      `Unknown sync action type: ${item.type}`,
    );
  }
  return await handler(
    { ...ctx, logger: ctx.logger.child({ syncActionType: item.type }) },
    item.payload,
  );
};

const processItemsSequentially = async (
  ctx: ProcessContext,
  items: readonly SyncItem[],
): Promise<ServiceResult<{ readonly processedCount: number }>> => {
  if (items.length === 0) {
    return serviceOk({ processedCount: 0 });
  }
  const [first, ...rest] = items;
  if (first === undefined) {
    return serviceOk({ processedCount: 0 });
  }
  const firstResult = await processItem(ctx, first);
  if (!firstResult.ok) {
    return firstResult;
  }

  const restResults = await rest.reduce<
    Promise<ServiceResult<{ readonly processedCount: number }>>
  >(
    async (accPromise, item) => {
      const acc = await accPromise;
      if (!acc.ok) {
        return acc;
      }
      const result = await processItem(ctx, item);
      if (!result.ok) {
        return result;
      }
      return serviceOk({ processedCount: acc.data.processedCount + 1 });
    },
    Promise.resolve(serviceOk({ processedCount: 1 })),
  );

  return restResults;
};

export const push = async ({
  drizzleDb,
  userId,
  items,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly items: readonly SyncItem[];
  readonly logger: Logger;
}): Promise<
  ServiceResult<{ readonly success: true; readonly processedCount: number }>
> => {
  logger.info("Sync push started", { itemCount: items.length });

  const result = await processItemsSequentially(
    { drizzleDb, userId, logger },
    items,
  );
  if (!result.ok) {
    return result;
  }

  logger.info("Sync push completed", {
    processedCount: result.data.processedCount,
  });
  return serviceOk({
    success: true,
    processedCount: result.data.processedCount,
  });
};

export const pull = async ({
  drizzleDb,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<
  ServiceResult<{
    readonly garments: readonly Garment[];
    readonly storageCases: readonly StorageCase[];
    readonly storageLocations: readonly StorageLocation[];
  }>
> => {
  logger.info("Sync pull started");

  const [pulledGarments, pulledCases, pulledLocations] = await Promise.all([
    garmentRepo.findGarments({
      drizzleDb,
      userId,
      filters: {},
      logger,
    }),
    locationRepo.findCasesByUserId({ drizzleDb, userId }),
    locationRepo.findLocationsByUserId({ drizzleDb, userId }),
  ]);

  logger.info("Sync pull completed", {
    garmentCount: pulledGarments.length,
    caseCount: pulledCases.length,
    locationCount: pulledLocations.length,
  });

  return serviceOk({
    garments: pulledGarments,
    storageCases: pulledCases,
    storageLocations: pulledLocations,
  });
};
