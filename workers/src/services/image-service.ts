import type { R2Bucket } from "@cloudflare/workers-types";
import { IMAGE_UPLOAD, MIME_TO_EXTENSION } from "@shared/lib/constants";
import type { Logger } from "../lib/logger";
import { type ServiceResult, serviceError, serviceOk } from "./types";

type ValidMimeType = (typeof IMAGE_UPLOAD.ALLOWED_MIME_TYPES)[number];

const isValidMimeType = (mime: string): mime is ValidMimeType =>
  IMAGE_UPLOAD.ALLOWED_MIME_TYPES.some((t) => t === mime);

export const buildR2Key = ({
  userId,
  garmentId,
  mimeType,
}: {
  readonly userId: string;
  readonly garmentId: string;
  readonly mimeType: ValidMimeType;
}): string => {
  const ext = MIME_TO_EXTENSION[mimeType];
  const timestamp = Date.now();
  return `garments/${userId}/${garmentId}/${String(timestamp)}.${ext}`;
};

export const buildPublicUrl = ({
  r2PublicUrl,
  key,
}: {
  readonly r2PublicUrl: string;
  readonly key: string;
}): string => {
  const base = r2PublicUrl.endsWith("/")
    ? r2PublicUrl.slice(0, -1)
    : r2PublicUrl;
  return `${base}/${key}`;
};

export const extractR2KeyFromUrl = ({
  r2PublicUrl,
  imageUrl,
}: {
  readonly r2PublicUrl: string;
  readonly imageUrl: string;
}): string | undefined => {
  const base = r2PublicUrl.endsWith("/")
    ? r2PublicUrl.slice(0, -1)
    : r2PublicUrl;
  const prefix = `${base}/`;
  if (imageUrl.startsWith(prefix)) {
    return imageUrl.slice(prefix.length);
  }
  return undefined;
};

export const validateFile = ({
  size,
  mimeType,
}: {
  readonly size: number;
  readonly mimeType: string;
}): ServiceResult<{ readonly validMimeType: ValidMimeType }> => {
  if (!isValidMimeType(mimeType)) {
    return serviceError(
      "BAD_REQUEST",
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- mimeType is narrowed but still string
      `許可されていないファイル形式です: ${mimeType}`,
    );
  }
  if (size > IMAGE_UPLOAD.MAX_UPLOAD_SIZE_BYTES) {
    return serviceError(
      "BAD_REQUEST",
      "ファイルサイズが上限 (5MB) を超えています",
    );
  }
  return serviceOk({ validMimeType: mimeType });
};

export const uploadImage = async ({
  bucket,
  key,
  body,
  mimeType,
  logger,
}: {
  readonly bucket: R2Bucket;
  readonly key: string;
  readonly body: ArrayBuffer;
  readonly mimeType: string;
  readonly logger: Logger;
}): Promise<ServiceResult<{ readonly key: string }>> => {
  await bucket
    .put(key, body, {
      httpMetadata: { contentType: mimeType },
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "R2 upload failed";
      logger.error("R2 upload error", { key, errorMessage: message });
      throw err;
    });

  logger.info("image uploaded to R2", { key });
  return serviceOk({ key });
};

export const deleteImage = async ({
  bucket,
  key,
  logger,
}: {
  readonly bucket: R2Bucket;
  readonly key: string;
  readonly logger: Logger;
}): Promise<ServiceResult<{ readonly success: true }>> => {
  await bucket.delete(key).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : "R2 delete failed";
    logger.error("R2 delete error", { key, errorMessage: message });
    throw err;
  });

  logger.info("image deleted from R2", { key });
  return serviceOk({ success: true });
};
