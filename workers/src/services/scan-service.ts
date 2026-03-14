import type { D1Database } from "@cloudflare/workers-types";
import { GARMENT_STATUS } from "@shared/lib/constants";
import * as scanRepo from "../repositories/scan-repository";
import { type ServiceResult, serviceError, serviceOk } from "./types";

export const checkin = async ({
  db,
  userId,
  locationId,
  garmentIds,
}: {
  readonly db: D1Database;
  readonly userId: string;
  readonly locationId: string;
  readonly garmentIds: readonly string[];
}): Promise<
  ServiceResult<{ readonly success: true; readonly checkedInCount: number }>
> => {
  const totalChanges = await scanRepo.batchCheckin({
    db,
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

  return serviceOk({ success: true, checkedInCount: totalChanges });
};

export const checkout = async ({
  db,
  userId,
  garmentId,
}: {
  readonly db: D1Database;
  readonly userId: string;
  readonly garmentId: string;
}): Promise<ServiceResult<{ readonly success: true }>> => {
  const existing = await scanRepo.findGarmentIdAndStatus({
    db,
    userId,
    garmentId,
  });
  if (existing === undefined) {
    return serviceError("NOT_FOUND", "指定された服が見つかりません");
  }

  await scanRepo.checkout({ db, userId, garmentId });
  return serviceOk({ success: true });
};

export const confirmAll = async ({
  db,
  userId,
  locationId,
}: {
  readonly db: D1Database;
  readonly userId: string;
  readonly locationId: string;
}): Promise<
  ServiceResult<{ readonly success: true; readonly confirmedCount: number }>
> => {
  const confirmedCount = await scanRepo.confirmAllAtLocation({
    db,
    userId,
    locationId,
  });
  return serviceOk({ success: true, confirmedCount });
};

type Confirmation = {
  readonly garmentId: string;
  readonly confirmed: boolean;
};

export const confirmPartial = async ({
  db,
  userId,
  confirmations,
}: {
  readonly db: D1Database;
  readonly userId: string;
  readonly confirmations: readonly Confirmation[];
}): Promise<
  ServiceResult<{
    readonly success: true;
    readonly confirmedCount: number;
    readonly deniedCount: number;
  }>
> => {
  await scanRepo.batchConfirmPartial({ db, userId, confirmations });

  const confirmedCount = confirmations.filter((c) => c.confirmed).length;
  const deniedCount = confirmations.length - confirmedCount;

  return serviceOk({ success: true, confirmedCount, deniedCount });
};

export const orphanResolve = async ({
  db,
  userId,
  garmentId,
  resolution,
  locationId,
}: {
  readonly db: D1Database;
  readonly userId: string;
  readonly garmentId: string;
  readonly resolution: "stored_back" | "still_using" | "lost";
  readonly locationId?: string;
}): Promise<ServiceResult<{ readonly success: true }>> => {
  const existing = await scanRepo.findGarmentIdAndStatus({
    db,
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
    db,
    userId,
    garmentId,
    resolution,
    locationId,
  });
  return serviceOk({ success: true });
};
