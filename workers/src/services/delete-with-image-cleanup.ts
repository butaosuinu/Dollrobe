import type { R2Bucket } from "@cloudflare/workers-types";
import type { Logger } from "../lib/logger";
import * as imageService from "./image-service";
import { type ServiceResult, serviceError, serviceOk } from "./types";

type EntityFinders<T> = {
  readonly findById: () => Promise<T | undefined>;
  readonly deleteById: () => Promise<number>;
};

type ImageCleanupContext = {
  readonly entityName: string;
  readonly entityId: string;
  readonly bucket: R2Bucket;
  readonly r2PublicUrl: string;
  readonly logger: Logger;
};

export const deleteEntityWithImageCleanup = async <
  T extends { readonly imageUrl?: string },
>({
  finders,
  context,
}: {
  readonly finders: EntityFinders<T>;
  readonly context: ImageCleanupContext;
}): Promise<ServiceResult<{ readonly success: true }>> => {
  const entity = await finders.findById();
  if (entity === undefined) {
    return serviceError(
      "NOT_FOUND",
      `${context.entityName} not found: ${context.entityId}`,
    );
  }

  const changes = await finders.deleteById();
  if (changes === 0) {
    return serviceError(
      "NOT_FOUND",
      `${context.entityName} not found: ${context.entityId}`,
    );
  }

  if (entity.imageUrl !== undefined) {
    const r2Key = imageService.extractR2KeyFromUrl({
      r2PublicUrl: context.r2PublicUrl,
      imageUrl: entity.imageUrl,
    });
    if (r2Key !== undefined) {
      const deleteResult = await imageService.deleteImage({
        bucket: context.bucket,
        key: r2Key,
        logger: context.logger,
      });
      if (!deleteResult.ok) {
        context.logger.warn(
          `R2 image cleanup failed after ${context.entityName} deletion`,
          {
            [`${context.entityName}Id`]: context.entityId,
            r2Key,
            error: deleteResult.error.message,
          },
        );
      }
    }
  }

  return serviceOk({ success: true });
};
