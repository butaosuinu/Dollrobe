import type { D1Database } from "@cloudflare/workers-types";
import type { StorageCase, StorageLocation } from "@/types";
import { GARMENT_STATUS } from "@shared/lib/constants";
import * as locationRepo from "../repositories/location-repository";
import { type ServiceResult, serviceError, serviceOk } from "./types";

export const listCases = async ({
  db,
  userId,
}: {
  readonly db: D1Database;
  readonly userId: string;
}): Promise<ServiceResult<{ readonly cases: readonly StorageCase[] }>> => {
  const cases = await locationRepo.findCasesByUserId({ db, userId });
  return serviceOk({ cases });
};

export const getCase = async ({
  db,
  id,
  userId,
}: {
  readonly db: D1Database;
  readonly id: string;
  readonly userId: string;
}): Promise<
  ServiceResult<{
    readonly storageCase: StorageCase;
    readonly locations: readonly StorageLocation[];
  }>
> => {
  const storageCase = await locationRepo.findCaseById({ db, id, userId });
  if (storageCase === undefined) {
    return serviceError("NOT_FOUND", "ケースが見つかりません");
  }

  const locations = await locationRepo.findLocationsByCaseId({
    db,
    caseId: id,
    userId,
  });
  return serviceOk({ storageCase, locations });
};

export const createCase = async ({
  db,
  userId,
  input,
}: {
  readonly db: D1Database;
  readonly userId: string;
  readonly input: {
    readonly name: string;
    readonly rows: number;
    readonly cols: number;
  };
}): Promise<ServiceResult<{ readonly id: string }>> => {
  const id = await locationRepo.insertCaseWithLocations({
    db,
    userId,
    name: input.name,
    rows: input.rows,
    cols: input.cols,
  });
  return serviceOk({ id });
};

export const updateCase = async ({
  db,
  userId,
  input,
}: {
  readonly db: D1Database;
  readonly userId: string;
  readonly input: {
    readonly id: string;
    readonly name: string;
  };
}): Promise<ServiceResult<{ readonly id: string }>> => {
  const existing = await locationRepo.findCaseById({
    db,
    id: input.id,
    userId,
  });
  if (existing === undefined) {
    return serviceError("NOT_FOUND", "ケースが見つかりません");
  }

  await locationRepo.updateCaseName({
    db,
    id: input.id,
    userId,
    name: input.name,
  });
  return serviceOk({ id: input.id });
};

export const deleteCase = async ({
  db,
  id,
  userId,
}: {
  readonly db: D1Database;
  readonly id: string;
  readonly userId: string;
}): Promise<ServiceResult<{ readonly id: string }>> => {
  const existing = await locationRepo.findCaseById({ db, id, userId });
  if (existing === undefined) {
    return serviceError("NOT_FOUND", "ケースが見つかりません");
  }

  await locationRepo.deleteCaseWithCascade({
    db,
    id,
    userId,
    garmentStatus: GARMENT_STATUS.CHECKED_OUT,
  });
  return serviceOk({ id });
};

export const createLocation = async ({
  db,
  userId,
  input,
}: {
  readonly db: D1Database;
  readonly userId: string;
  readonly input: {
    readonly caseId: string;
    readonly label: string;
    readonly row: number;
    readonly col: number;
  };
}): Promise<ServiceResult<{ readonly id: string }>> => {
  const caseExists = await locationRepo.findCaseById({
    db,
    id: input.caseId,
    userId,
  });
  if (caseExists === undefined) {
    return serviceError("NOT_FOUND", "ケースが見つかりません");
  }

  const duplicate = await locationRepo.findLocationByPosition({
    db,
    caseId: input.caseId,
    row: input.row,
    col: input.col,
  });
  if (duplicate !== undefined) {
    return serviceError("CONFLICT", "同じ行・列のロケーションが既に存在します");
  }

  const id = await locationRepo.insertLocation({
    db,
    userId,
    caseId: input.caseId,
    label: input.label,
    row: input.row,
    col: input.col,
  });
  return serviceOk({ id });
};

export const deleteLocation = async ({
  db,
  id,
  userId,
}: {
  readonly db: D1Database;
  readonly id: string;
  readonly userId: string;
}): Promise<ServiceResult<{ readonly id: string }>> => {
  const existing = await locationRepo.findLocationById({ db, id, userId });
  if (existing === undefined) {
    return serviceError("NOT_FOUND", "ロケーションが見つかりません");
  }

  await locationRepo.deleteLocationWithCascade({
    db,
    id,
    userId,
    garmentStatus: GARMENT_STATUS.CHECKED_OUT,
  });
  return serviceOk({ id });
};
