import type { Digest, DigestUnknownItem, DigestOrphanedItem } from "@/types";
import {
  CONFIDENCE_THRESHOLD,
  GARMENT_STATUS,
  ORPHAN_CHECKOUT_THRESHOLD_DAYS,
} from "@shared/lib/constants";
import { getConfidence, getOrphanedCheckouts } from "@/lib/confidence";
import { createId } from "@paralleldrive/cuid2";
import type { Logger } from "../lib/logger";
import type { DrizzleDB } from "../db/client";
import * as garmentRepo from "../repositories/garment-repository";
import * as locationRepo from "../repositories/location-repository";
import * as digestRepo from "../repositories/digest-repository";
import { type ServiceResult, serviceError, serviceOk } from "./types";

export const generateDigestForUser = async ({
  drizzleDb,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<ServiceResult<Digest>> => {
  const garments = await garmentRepo.findGarments({
    drizzleDb,
    userId,
    filters: {},
    logger,
  });

  const locations = await locationRepo.findLocationsByUserId({
    drizzleDb,
    userId,
  });
  const visitedAtByLocationId = new Map(
    locations.map((l) => [l.id, l.lastVisitedAt]),
  );
  const getGarmentConfidence = (g: (typeof garments)[number]): number =>
    getConfidence({
      ...g,
      lastLocationVisitedAt:
        g.locationId !== undefined
          ? visitedAtByLocationId.get(g.locationId)
          : undefined,
    });

  const unknownItems: readonly DigestUnknownItem[] = garments
    .filter((g) => {
      if (g.status !== GARMENT_STATUS.STORED) {
        return false;
      }
      return getGarmentConfidence(g) < CONFIDENCE_THRESHOLD.UNCERTAIN;
    })
    .map((g) => ({
      garmentId: g.id,
      garmentName: g.name,
      confidence: getGarmentConfidence(g),
    }));

  const orphanedGarments = getOrphanedCheckouts(
    garments,
    ORPHAN_CHECKOUT_THRESHOLD_DAYS,
  );
  const orphanedItems: readonly DigestOrphanedItem[] = orphanedGarments.map(
    (g) => ({
      garmentId: g.id,
      garmentName: g.name,
      checkedOutAt: g.checkedOutAt ?? 0,
    }),
  );

  const now = Date.now();
  const id = createId();

  const digestData = {
    id,
    userId,
    unknownItems,
    orphanedItems,
    unknownCount: unknownItems.length,
    orphanedCount: orphanedItems.length,
    totalGarments: garments.length,
    isRead: false,
    generatedAt: now,
    createdAt: now,
  };

  await digestRepo.insertDigest({
    drizzleDb,
    digest: digestData,
    logger,
  });

  logger.info("digest generated", {
    userId,
    unknownCount: unknownItems.length,
    orphanedCount: orphanedItems.length,
    totalGarments: garments.length,
  });

  return serviceOk(digestData);
};

export const getLatestDigest = async ({
  drizzleDb,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<ServiceResult<Digest | undefined>> => {
  const digest = await digestRepo.findLatestDigest({
    drizzleDb,
    userId,
    logger,
  });
  return serviceOk(digest);
};

export const listDigests = async ({
  drizzleDb,
  userId,
  limit,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly limit: number;
  readonly logger: Logger;
}): Promise<ServiceResult<readonly Digest[]>> => {
  const items = await digestRepo.findDigests({
    drizzleDb,
    userId,
    limit,
    logger,
  });
  return serviceOk(items);
};

export const markAsRead = async ({
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
  const changes = await digestRepo.markDigestRead({
    drizzleDb,
    id,
    userId,
    logger,
  });

  if (changes === 0) {
    return serviceError("NOT_FOUND", `Digest not found: ${id}`);
  }

  return serviceOk({ success: true });
};

export const checkUnreadDigest = async ({
  drizzleDb,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<ServiceResult<{ readonly hasUnread: boolean }>> => {
  const hasUnread = await digestRepo.hasUnreadDigest({
    drizzleDb,
    userId,
    logger,
  });
  return serviceOk({ hasUnread });
};
