import type { Garment } from "@/types";
import type { R2Bucket } from "@cloudflare/workers-types";
import { createId } from "@paralleldrive/cuid2";
import { GARMENT_STATUS } from "@shared/lib/constants";
import type { Logger } from "../lib/logger";
import type { DrizzleDB } from "../db/client";
import * as garmentRepo from "../repositories/garment-repository";
import { deleteEntityWithImageCleanup } from "./delete-with-image-cleanup";
import { type ServiceResult, serviceError, serviceOk } from "./types";

export const listGarments = async ({
  drizzleDb,
  userId,
  filters,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly filters: {
    readonly category?: string;
    readonly status?: string;
    readonly dollSize?: string;
    readonly locationId?: string;
  };
  readonly logger: Logger;
}): Promise<ServiceResult<readonly Garment[]>> => {
  const garments = await garmentRepo.findGarments({
    drizzleDb,
    userId,
    filters,
    logger,
  });
  return serviceOk(garments);
};

export const getGarment = async ({
  drizzleDb,
  id,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<ServiceResult<Garment>> => {
  const garment = await garmentRepo.findGarmentById({
    drizzleDb,
    id,
    userId,
    logger,
  });
  if (garment === undefined) {
    return serviceError("NOT_FOUND", `Garment not found: ${id}`);
  }
  return serviceOk(garment);
};

export const createGarment = async ({
  drizzleDb,
  userId,
  input,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly input: {
    readonly name: string;
    readonly category: string;
    readonly dollSizes: readonly string[];
    readonly colors: readonly string[];
    readonly tags: readonly string[];
    readonly imageUrl?: string;
    readonly locationId?: string;
    readonly brand?: string;
    readonly description?: string;
    readonly setContents?: string;
    readonly confidenceDecayDays: number;
  };
  readonly logger: Logger;
}): Promise<ServiceResult<Garment>> => {
  const id = createId();
  const now = Date.now();
  const status =
    input.locationId !== undefined
      ? GARMENT_STATUS.STORED
      : GARMENT_STATUS.CHECKED_OUT;
  const checkedOutAt = input.locationId !== undefined ? undefined : now;

  await garmentRepo.insertGarment({
    drizzleDb,
    logger,
    garment: {
      id,
      userId,
      name: input.name,
      category: input.category,
      dollSizes: input.dollSizes,
      colors: input.colors,
      tags: input.tags,
      imageUrl: input.imageUrl,
      locationId: input.locationId,
      brand: input.brand,
      description: input.description,
      setContents: input.setContents,
      status,
      lastScannedAt: now,
      confidenceDecayDays: input.confidenceDecayDays,
      checkedOutAt,
      createdAt: now,
      updatedAt: now,
    },
  });

  const garment = await garmentRepo.findGarmentById({
    drizzleDb,
    id,
    userId,
    logger,
  });
  if (garment === undefined) {
    return serviceError("INTERNAL_ERROR", "Created garment not found");
  }
  return serviceOk(garment);
};

export const bulkCreateGarments = async ({
  drizzleDb,
  userId,
  items,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly items: ReadonlyArray<{
    readonly name: string;
    readonly category: string;
    readonly dollSizes: readonly string[];
    readonly colors: readonly string[];
    readonly tags: readonly string[];
    readonly brand?: string;
    readonly confidenceDecayDays: number;
  }>;
  readonly logger: Logger;
}): Promise<ServiceResult<{ readonly count: number }>> => {
  const now = Date.now();
  const garmentRows = items.map((item) => ({
    id: createId(),
    userId,
    name: item.name,
    category: item.category,
    dollSizes: item.dollSizes,
    colors: item.colors,
    tags: item.tags,
    brand: item.brand,
    status: GARMENT_STATUS.CHECKED_OUT,
    lastScannedAt: now,
    confidenceDecayDays: item.confidenceDecayDays,
    checkedOutAt: now,
    createdAt: now,
    updatedAt: now,
  }));

  await garmentRepo.insertGarmentsBatch({ drizzleDb, garmentRows, logger });

  logger.info("bulk created garments", { count: garmentRows.length });
  return serviceOk({ count: garmentRows.length });
};

export const updateGarment = async ({
  drizzleDb,
  userId,
  input,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly input: {
    readonly id: string;
    readonly name?: string;
    readonly category?: string;
    readonly dollSizes?: readonly string[];
    readonly colors?: readonly string[];
    readonly tags?: readonly string[];
    readonly imageUrl?: string;
    readonly locationId?: string;
    readonly brand?: string;
    readonly description?: string;
    readonly setContents?: string;
    readonly confidenceDecayDays?: number;
  };
  readonly logger: Logger;
}): Promise<ServiceResult<Garment>> => {
  const existing = await garmentRepo.findGarmentById({
    drizzleDb,
    id: input.id,
    userId,
    logger,
  });
  if (existing === undefined) {
    return serviceError("NOT_FOUND", `Garment not found: ${input.id}`);
  }

  const garment = await garmentRepo.updateGarmentFields({
    drizzleDb,
    id: input.id,
    userId,
    fields: {
      name: input.name,
      category: input.category,
      dollSizes: input.dollSizes,
      colors: input.colors,
      tags: input.tags,
      imageUrl: input.imageUrl,
      locationId: input.locationId,
      brand: input.brand,
      description: input.description,
      setContents: input.setContents,
      confidenceDecayDays: input.confidenceDecayDays,
    },
    logger,
  });
  if (garment === undefined) {
    return serviceError("INTERNAL_ERROR", "Updated garment not found");
  }
  return serviceOk(garment);
};

export const deleteGarment = async ({
  drizzleDb,
  id,
  userId,
  bucket,
  r2PublicUrl,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
  readonly bucket: R2Bucket;
  readonly r2PublicUrl: string;
  readonly logger: Logger;
}): Promise<ServiceResult<{ readonly success: true }>> =>
  await deleteEntityWithImageCleanup({
    finders: {
      findById: async () =>
        await garmentRepo.findGarmentById({ drizzleDb, id, userId, logger }),
      deleteById: async () =>
        await garmentRepo.deleteGarmentWithTombstone({
          drizzleDb,
          id,
          userId,
          logger,
        }),
    },
    context: {
      entityName: "Garment",
      entityId: id,
      bucket,
      r2PublicUrl,
      logger,
    },
  });
