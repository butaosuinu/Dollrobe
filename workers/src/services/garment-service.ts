import type { Garment } from "@/types";
import { createId } from "@paralleldrive/cuid2";
import { GARMENT_STATUS } from "@shared/lib/constants";
import type { DrizzleDB } from "../db/client";
import * as garmentRepo from "../repositories/garment-repository";
import { type ServiceResult, serviceError, serviceOk } from "./types";

export const listGarments = async ({
  drizzleDb,
  userId,
  filters,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly filters: {
    readonly category?: string;
    readonly status?: string;
    readonly dollSize?: string;
    readonly locationId?: string;
  };
}): Promise<ServiceResult<readonly Garment[]>> => {
  const garments = await garmentRepo.findGarments({
    drizzleDb,
    userId,
    filters,
  });
  return serviceOk(garments);
};

export const getGarment = async ({
  drizzleDb,
  id,
  userId,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
}): Promise<ServiceResult<Garment>> => {
  const garment = await garmentRepo.findGarmentById({ drizzleDb, id, userId });
  if (garment === undefined) {
    return serviceError("NOT_FOUND", `Garment not found: ${id}`);
  }
  return serviceOk(garment);
};

export const createGarment = async ({
  drizzleDb,
  userId,
  input,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly input: {
    readonly name: string;
    readonly category: string;
    readonly dollSize: string;
    readonly colors: readonly string[];
    readonly tags: readonly string[];
    readonly imageUrl?: string;
    readonly locationId?: string;
    readonly brand?: string;
    readonly confidenceDecayDays: number;
  };
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
    garment: {
      id,
      userId,
      name: input.name,
      category: input.category,
      dollSize: input.dollSize,
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

  const garment = await garmentRepo.findGarmentById({ drizzleDb, id, userId });
  if (garment === undefined) {
    return serviceError("INTERNAL_ERROR", "Created garment not found");
  }
  return serviceOk(garment);
};

export const updateGarment = async ({
  drizzleDb,
  userId,
  input,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly input: {
    readonly id: string;
    readonly name?: string;
    readonly category?: string;
    readonly dollSize?: string;
    readonly colors?: readonly string[];
    readonly tags?: readonly string[];
    readonly imageUrl?: string;
    readonly locationId?: string;
    readonly brand?: string;
    readonly confidenceDecayDays?: number;
  };
}): Promise<ServiceResult<Garment>> => {
  const existing = await garmentRepo.findGarmentById({
    drizzleDb,
    id: input.id,
    userId,
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
      dollSize: input.dollSize,
      colors: input.colors,
      tags: input.tags,
      imageUrl: input.imageUrl,
      locationId: input.locationId,
      brand: input.brand,
      confidenceDecayDays: input.confidenceDecayDays,
    },
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
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
}): Promise<ServiceResult<{ readonly success: true }>> => {
  const changes = await garmentRepo.deleteGarmentById({
    drizzleDb,
    id,
    userId,
  });
  if (changes === 0) {
    return serviceError("NOT_FOUND", `Garment not found: ${id}`);
  }
  return serviceOk({ success: true });
};
