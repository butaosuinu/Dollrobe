import { GARMENT_STATUS } from "@shared/lib/constants";
import type { DrizzleDB } from "../db/client";
import * as locationRepo from "../repositories/location-repository";
import * as scanRepo from "../repositories/scan-repository";
import { type ServiceResult, serviceError, serviceOk } from "./types";

export const checkin = async ({
  drizzleDb,
  userId,
  locationId,
  garmentIds,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly locationId: string;
  readonly garmentIds: readonly string[];
}): Promise<
  ServiceResult<{ readonly success: true; readonly checkedInCount: number }>
> => {
  const totalChanges = await scanRepo.batchCheckin({
    drizzleDb,
    userId,
    locationId,
    garmentIds,
  });

  if (totalChanges < garmentIds.length) {
    return serviceError(
      "NOT_FOUND",
      `${String(garmentIds.length - totalChanges)}件の服が見つかりませんでした`,
    );
  }

  await locationRepo.updateLastVisitedAt({
    drizzleDb,
    id: locationId,
    userId,
    visitedAt: Date.now(),
  });

  return serviceOk({ success: true, checkedInCount: totalChanges });
};

export const checkout = async ({
  drizzleDb,
  userId,
  garmentId,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly garmentId: string;
}): Promise<ServiceResult<{ readonly success: true }>> => {
  const existing = await scanRepo.findGarmentIdAndStatus({
    drizzleDb,
    userId,
    garmentId,
  });
  if (existing === undefined) {
    return serviceError("NOT_FOUND", "指定された服が見つかりません");
  }

  await scanRepo.checkout({ drizzleDb, userId, garmentId });
  return serviceOk({ success: true });
};

export const confirmAll = async ({
  drizzleDb,
  userId,
  locationId,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly locationId: string;
}): Promise<
  ServiceResult<{ readonly success: true; readonly confirmedCount: number }>
> => {
  const confirmedCount = await scanRepo.confirmAllAtLocation({
    drizzleDb,
    userId,
    locationId,
  });
  await locationRepo.updateLastVisitedAt({
    drizzleDb,
    id: locationId,
    userId,
    visitedAt: Date.now(),
  });
  return serviceOk({ success: true, confirmedCount });
};

type Confirmation = {
  readonly garmentId: string;
  readonly confirmed: boolean;
};

export const confirmPartial = async ({
  drizzleDb,
  userId,
  confirmations,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly confirmations: readonly Confirmation[];
}): Promise<
  ServiceResult<{
    readonly success: true;
    readonly confirmedCount: number;
    readonly deniedCount: number;
  }>
> => {
  await scanRepo.batchConfirmPartial({ drizzleDb, userId, confirmations });

  const confirmedCount = confirmations.filter((c) => c.confirmed).length;
  const deniedCount = confirmations.length - confirmedCount;

  return serviceOk({ success: true, confirmedCount, deniedCount });
};

export const orphanResolve = async ({
  drizzleDb,
  userId,
  garmentId,
  resolution,
  locationId,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly garmentId: string;
  readonly resolution: "stored_back" | "still_using" | "lost";
  readonly locationId?: string;
}): Promise<ServiceResult<{ readonly success: true }>> => {
  const existing = await scanRepo.findGarmentIdAndStatus({
    drizzleDb,
    userId,
    garmentId,
  });
  if (existing === undefined) {
    return serviceError("NOT_FOUND", "指定された服が見つかりません");
  }

  if (existing.status !== GARMENT_STATUS.CHECKED_OUT) {
    return serviceError(
      "BAD_REQUEST",
      "チェックアウト状態の服のみ解決できます",
    );
  }

  await scanRepo.resolveOrphan({
    drizzleDb,
    userId,
    garmentId,
    resolution,
    locationId,
  });
  return serviceOk({ success: true });
};
