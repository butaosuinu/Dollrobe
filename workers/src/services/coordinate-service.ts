import type { Coordinate } from "@/types";
import { createId } from "@paralleldrive/cuid2";
import type { Logger } from "../lib/logger";
import type { DrizzleDB } from "../db/client";
import * as coordinateRepo from "../repositories/coordinate-repository";
import * as garmentRepo from "../repositories/garment-repository";
import { type ServiceResult, serviceError, serviceOk } from "./types";

const verifyGarmentOwnership = async ({
  drizzleDb,
  garmentIds,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly garmentIds: readonly string[];
  readonly userId: string;
  readonly logger: Logger;
}): Promise<ServiceResult<true>> => {
  if (garmentIds.length === 0) {
    return serviceOk(true);
  }

  const uniqueIds = Array.from(new Set(garmentIds));
  const owned = await garmentRepo.findGarmentsByIds({
    drizzleDb,
    ids: uniqueIds,
    userId,
    logger,
  });

  if (owned.length !== uniqueIds.length) {
    return serviceError(
      "BAD_REQUEST",
      "指定された服の一部が存在しないか、このユーザーのものではありません",
    );
  }
  return serviceOk(true);
};

export const listCoordinates = async ({
  drizzleDb,
  userId,
  filters,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly filters: {
    readonly isAiGenerated?: boolean;
  };
  readonly logger: Logger;
}): Promise<ServiceResult<readonly Coordinate[]>> => {
  const items = await coordinateRepo.findCoordinates({
    drizzleDb,
    userId,
    filters,
    logger,
  });
  return serviceOk(items);
};

export const getCoordinate = async ({
  drizzleDb,
  id,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<ServiceResult<Coordinate>> => {
  const coordinate = await coordinateRepo.findCoordinateById({
    drizzleDb,
    id,
    userId,
    logger,
  });
  if (coordinate === undefined) {
    return serviceError("NOT_FOUND", `Coordinate not found: ${id}`);
  }
  return serviceOk(coordinate);
};

export const createCoordinate = async ({
  drizzleDb,
  userId,
  input,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly input: {
    readonly name: string;
    readonly garmentIds: readonly string[];
    readonly isAiGenerated: boolean;
    readonly memo?: string;
  };
  readonly logger: Logger;
}): Promise<ServiceResult<Coordinate>> => {
  const ownership = await verifyGarmentOwnership({
    drizzleDb,
    garmentIds: input.garmentIds,
    userId,
    logger,
  });
  if (!ownership.ok) {
    return ownership;
  }

  const id = createId();
  const now = Date.now();

  await coordinateRepo.insertCoordinate({
    drizzleDb,
    logger,
    coordinate: {
      id,
      userId,
      name: input.name,
      garmentIds: input.garmentIds,
      isAiGenerated: input.isAiGenerated,
      memo: input.memo,
      createdAt: now,
      updatedAt: now,
    },
  });

  const coordinate = await coordinateRepo.findCoordinateById({
    drizzleDb,
    id,
    userId,
    logger,
  });
  if (coordinate === undefined) {
    return serviceError("INTERNAL_ERROR", "Created coordinate not found");
  }
  return serviceOk(coordinate);
};

export const updateCoordinate = async ({
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
    readonly garmentIds?: readonly string[];
    readonly memo?: string;
  };
  readonly logger: Logger;
}): Promise<ServiceResult<Coordinate>> => {
  const existing = await coordinateRepo.findCoordinateById({
    drizzleDb,
    id: input.id,
    userId,
    logger,
  });
  if (existing === undefined) {
    return serviceError("NOT_FOUND", `Coordinate not found: ${input.id}`);
  }

  if (input.garmentIds !== undefined) {
    const ownership = await verifyGarmentOwnership({
      drizzleDb,
      garmentIds: input.garmentIds,
      userId,
      logger,
    });
    if (!ownership.ok) {
      return ownership;
    }
  }

  const coordinate = await coordinateRepo.updateCoordinateFields({
    drizzleDb,
    id: input.id,
    userId,
    fields: {
      name: input.name,
      garmentIds: input.garmentIds,
      memo: input.memo,
    },
    logger,
  });
  if (coordinate === undefined) {
    return serviceError("INTERNAL_ERROR", "Updated coordinate not found");
  }
  return serviceOk(coordinate);
};

export const deleteCoordinate = async ({
  drizzleDb,
  id,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<ServiceResult<{ readonly success: true }>> => {
  const existing = await coordinateRepo.findCoordinateById({
    drizzleDb,
    id,
    userId,
    logger,
  });
  if (existing === undefined) {
    return serviceError("NOT_FOUND", `Coordinate not found: ${id}`);
  }

  await coordinateRepo.deleteCoordinateById({
    drizzleDb,
    id,
    userId,
    logger,
  });

  return serviceOk({ success: true });
};
