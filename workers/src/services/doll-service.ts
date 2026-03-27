import type { Doll } from "@/types";
import type { R2Bucket } from "@cloudflare/workers-types";
import { createId } from "@paralleldrive/cuid2";
import type { Logger } from "../lib/logger";
import type { DrizzleDB } from "../db/client";
import * as dollRepo from "../repositories/doll-repository";
import * as imageService from "./image-service";
import { type ServiceResult, serviceError, serviceOk } from "./types";

export const listDolls = async ({
  drizzleDb,
  userId,
  filters,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly filters: {
    readonly bodySize?: string;
  };
  readonly logger: Logger;
}): Promise<ServiceResult<readonly Doll[]>> => {
  const dolls = await dollRepo.findDolls({
    drizzleDb,
    userId,
    filters,
    logger,
  });
  return serviceOk(dolls);
};

export const getDoll = async ({
  drizzleDb,
  id,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<ServiceResult<Doll>> => {
  const doll = await dollRepo.findDollById({
    drizzleDb,
    id,
    userId,
    logger,
  });
  if (doll === undefined) {
    return serviceError("NOT_FOUND", `Doll not found: ${id}`);
  }
  return serviceOk(doll);
};

export const createDoll = async ({
  drizzleDb,
  userId,
  input,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly input: {
    readonly name: string;
    readonly bodySize: string;
    readonly headModel?: string;
    readonly imageUrl?: string;
    readonly memo?: string;
  };
  readonly logger: Logger;
}): Promise<ServiceResult<Doll>> => {
  const id = createId();
  const now = Date.now();

  await dollRepo.insertDoll({
    drizzleDb,
    logger,
    doll: {
      id,
      userId,
      name: input.name,
      headModel: input.headModel,
      bodySize: input.bodySize,
      imageUrl: input.imageUrl,
      memo: input.memo,
      createdAt: now,
      updatedAt: now,
    },
  });

  const doll = await dollRepo.findDollById({
    drizzleDb,
    id,
    userId,
    logger,
  });
  if (doll === undefined) {
    return serviceError("INTERNAL_ERROR", "Created doll not found");
  }
  return serviceOk(doll);
};

export const updateDoll = async ({
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
    readonly headModel?: string;
    readonly bodySize?: string;
    readonly imageUrl?: string;
    readonly memo?: string;
  };
  readonly logger: Logger;
}): Promise<ServiceResult<Doll>> => {
  const existing = await dollRepo.findDollById({
    drizzleDb,
    id: input.id,
    userId,
    logger,
  });
  if (existing === undefined) {
    return serviceError("NOT_FOUND", `Doll not found: ${input.id}`);
  }

  const doll = await dollRepo.updateDollFields({
    drizzleDb,
    id: input.id,
    userId,
    fields: {
      name: input.name,
      headModel: input.headModel,
      bodySize: input.bodySize,
      imageUrl: input.imageUrl,
      memo: input.memo,
    },
    logger,
  });
  if (doll === undefined) {
    return serviceError("INTERNAL_ERROR", "Updated doll not found");
  }
  return serviceOk(doll);
};

export const deleteDoll = async ({
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
  const doll = await dollRepo.findDollById({
    drizzleDb,
    id,
    userId,
    logger,
  });
  if (doll === undefined) {
    return serviceError("NOT_FOUND", `Doll not found: ${id}`);
  }

  const changes = await dollRepo.deleteDollById({
    drizzleDb,
    id,
    userId,
    logger,
  });
  if (changes === 0) {
    return serviceError("NOT_FOUND", `Doll not found: ${id}`);
  }

  if (doll.imageUrl !== undefined) {
    const r2Key = imageService.extractR2KeyFromUrl({
      r2PublicUrl,
      imageUrl: doll.imageUrl,
    });
    if (r2Key !== undefined) {
      const deleteResult = await imageService.deleteImage({
        bucket,
        key: r2Key,
        logger,
      });
      if (!deleteResult.ok) {
        logger.warn("R2 image cleanup failed after doll deletion", {
          dollId: id,
          r2Key,
          error: deleteResult.error.message,
        });
      }
    }
  }

  return serviceOk({ success: true });
};
