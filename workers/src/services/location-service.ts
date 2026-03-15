import type { StorageCase, StorageLocation } from "@/types";
import { GARMENT_STATUS } from "@shared/lib/constants";
import type { DrizzleDB } from "../db/client";
import * as locationRepo from "../repositories/location-repository";
import { type ServiceResult, serviceError, serviceOk } from "./types";

export const listCases = async ({
  drizzleDb,
  userId,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
}): Promise<ServiceResult<{ readonly cases: readonly StorageCase[] }>> => {
  const cases = await locationRepo.findCasesByUserId({ drizzleDb, userId });
  return serviceOk({ cases });
};

export const getCase = async ({
  drizzleDb,
  id,
  userId,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
}): Promise<
  ServiceResult<{
    readonly storageCase: StorageCase;
    readonly locations: readonly StorageLocation[];
  }>
> => {
  const storageCase = await locationRepo.findCaseById({
    drizzleDb,
    id,
    userId,
  });
  if (storageCase === undefined) {
    return serviceError("NOT_FOUND", "ケースが見つかりません");
  }

  const locations = await locationRepo.findLocationsByCaseId({
    drizzleDb,
    caseId: id,
    userId,
  });
  return serviceOk({ storageCase, locations });
};

export const createCase = async ({
  drizzleDb,
  userId,
  input,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly input: {
    readonly name: string;
    readonly rows: number;
    readonly cols: number;
  };
}): Promise<ServiceResult<{ readonly id: string }>> => {
  const id = await locationRepo.insertCaseWithLocations({
    drizzleDb,
    userId,
    name: input.name,
    rows: input.rows,
    cols: input.cols,
  });
  return serviceOk({ id });
};

export const updateCase = async ({
  drizzleDb,
  userId,
  input,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly input: {
    readonly id: string;
    readonly name: string;
  };
}): Promise<ServiceResult<{ readonly id: string }>> => {
  const existing = await locationRepo.findCaseById({
    drizzleDb,
    id: input.id,
    userId,
  });
  if (existing === undefined) {
    return serviceError("NOT_FOUND", "ケースが見つかりません");
  }

  await locationRepo.updateCaseName({
    drizzleDb,
    id: input.id,
    userId,
    name: input.name,
  });
  return serviceOk({ id: input.id });
};

export const deleteCase = async ({
  drizzleDb,
  id,
  userId,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
}): Promise<ServiceResult<{ readonly id: string }>> => {
  const existing = await locationRepo.findCaseById({ drizzleDb, id, userId });
  if (existing === undefined) {
    return serviceError("NOT_FOUND", "ケースが見つかりません");
  }

  await locationRepo.deleteCaseWithCascade({
    drizzleDb,
    id,
    userId,
    garmentStatus: GARMENT_STATUS.CHECKED_OUT,
  });
  return serviceOk({ id });
};

export const createLocation = async ({
  drizzleDb,
  userId,
  input,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly input: {
    readonly caseId: string;
    readonly label: string;
    readonly row: number;
    readonly col: number;
  };
}): Promise<ServiceResult<{ readonly id: string }>> => {
  const caseExists = await locationRepo.findCaseById({
    drizzleDb,
    id: input.caseId,
    userId,
  });
  if (caseExists === undefined) {
    return serviceError("NOT_FOUND", "ケースが見つかりません");
  }

  const duplicate = await locationRepo.findLocationByPosition({
    drizzleDb,
    caseId: input.caseId,
    row: input.row,
    col: input.col,
  });
  if (duplicate !== undefined) {
    return serviceError("CONFLICT", "同じ行・列のロケーションが既に存在します");
  }

  const id = await locationRepo.insertLocation({
    drizzleDb,
    userId,
    caseId: input.caseId,
    label: input.label,
    row: input.row,
    col: input.col,
  });
  return serviceOk({ id });
};

export const deleteLocation = async ({
  drizzleDb,
  id,
  userId,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly userId: string;
}): Promise<ServiceResult<{ readonly id: string }>> => {
  const existing = await locationRepo.findLocationById({
    drizzleDb,
    id,
    userId,
  });
  if (existing === undefined) {
    return serviceError("NOT_FOUND", "ロケーションが見つかりません");
  }

  await locationRepo.deleteLocationWithCascade({
    drizzleDb,
    id,
    userId,
    garmentStatus: GARMENT_STATUS.CHECKED_OUT,
  });
  return serviceOk({ id });
};
