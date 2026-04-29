import type { ConfidenceLabel, Digest, Garment } from "@/types";
import { DIGEST_SKIP_THRESHOLD, GARMENT_STATUS } from "@shared/lib/constants";
import { getConfidence, getConfidenceLabel } from "@/lib/confidence";
import { createId } from "@paralleldrive/cuid2";
import type { Logger } from "../lib/logger";
import type { DrizzleDB } from "../db/client";
import * as garmentRepo from "../repositories/garment-repository";
import * as locationRepo from "../repositories/location-repository";
import * as digestRepo from "../repositories/digest-repository";
import { type ServiceResult, serviceError, serviceOk } from "./types";

export type GenerateDigestResult = {
  readonly digest: Digest | undefined;
  readonly skipped: boolean;
};

type ZoneCounts = {
  readonly confirmedCount: number;
  readonly uncertainCount: number;
  readonly unknownCount: number;
};

const countZones = (
  garments: readonly Garment[],
  visitedAtByLocationId: ReadonlyMap<string, number | undefined>,
): ZoneCounts => {
  const zeroed = { confirmedCount: 0, uncertainCount: 0, unknownCount: 0 };
  return garments.reduce<ZoneCounts>((acc, g) => {
    if (g.status !== GARMENT_STATUS.STORED) {
      return acc;
    }
    const confidence = getConfidence({
      ...g,
      lastLocationVisitedAt:
        g.locationId !== undefined
          ? visitedAtByLocationId.get(g.locationId)
          : undefined,
    });
    const label: ConfidenceLabel = getConfidenceLabel(confidence);
    return label === "confirmed"
      ? { ...acc, confirmedCount: acc.confirmedCount + 1 }
      : label === "uncertain"
        ? { ...acc, uncertainCount: acc.uncertainCount + 1 }
        : { ...acc, unknownCount: acc.unknownCount + 1 };
  }, zeroed);
};

export const generateDigestForUser = async ({
  drizzleDb,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<ServiceResult<GenerateDigestResult>> => {
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

  const { confirmedCount, uncertainCount, unknownCount } = countZones(
    garments,
    visitedAtByLocationId,
  );
  const storedTotal = confirmedCount + uncertainCount + unknownCount;
  const accuracyScore = storedTotal === 0 ? 1 : confirmedCount / storedTotal;
  const shouldSkip =
    storedTotal === 0 || accuracyScore >= DIGEST_SKIP_THRESHOLD;

  const now = Date.now();
  const digest: Digest | undefined = shouldSkip
    ? undefined
    : {
        id: createId(),
        userId,
        accuracyScore,
        confirmedCount,
        uncertainCount,
        unknownCount,
        totalGarments: garments.length,
        isRead: false,
        generatedAt: now,
        createdAt: now,
      };

  if (digest !== undefined) {
    await digestRepo.insertDigest({ drizzleDb, digest, logger });
  }

  const decrementedCount = await garmentRepo.decrementAllRecentCheckoutCounts({
    drizzleDb,
    userId,
    logger,
  });

  logger.info("digest generation finished", {
    userId,
    skipped: shouldSkip,
    accuracyScore,
    confirmedCount,
    uncertainCount,
    unknownCount,
    totalGarments: garments.length,
    recentCheckoutCountDecremented: decrementedCount,
  });

  return serviceOk({ digest, skipped: shouldSkip });
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
