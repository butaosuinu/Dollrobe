import type { Garment } from "@/types";
import type { R2Bucket } from "@cloudflare/workers-types";
import { createId } from "@paralleldrive/cuid2";
import { GARMENT_STATUS } from "@shared/lib/constants";
import type { Logger } from "../lib/logger";
import type { DrizzleDB } from "../db/client";
import * as garmentRepo from "../repositories/garment-repository";
import * as imageService from "./image-service";
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
}): Promise<ServiceResult<{ readonly success: true }>> => {
  const garment = await garmentRepo.findGarmentById({
    drizzleDb,
    id,
    userId,
    logger,
  });
  if (garment === undefined) {
    return serviceError("NOT_FOUND", `Garment not found: ${id}`);
  }

  const changes = await garmentRepo.deleteGarmentById({
    drizzleDb,
    id,
    userId,
    logger,
  });
  if (changes === 0) {
    return serviceError("NOT_FOUND", `Garment not found: ${id}`);
  }

  if (garment.imageUrl !== undefined) {
    const r2Key = imageService.extractR2KeyFromUrl({
      r2PublicUrl,
      imageUrl: garment.imageUrl,
    });
    if (r2Key !== undefined) {
      const deleteResult = await imageService.deleteImage({
        bucket,
        key: r2Key,
        logger,
      });
      if (!deleteResult.ok) {
        logger.warn("R2 image cleanup failed after garment deletion", {
          garmentId: id,
          r2Key,
          error: deleteResult.error.message,
        });
      }
    }
  }

  return serviceOk({ success: true });
};
