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

type CreateCaseInput =
  | {
      readonly type: "grid";
      readonly name: string;
      readonly description: string | undefined;
      readonly rows: number;
      readonly cols: number;
    }
  | {
      readonly type: "unit";
      readonly name: string;
      readonly description: string | undefined;
    };

export const createCase = async ({
  drizzleDb,
  userId,
  input,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly input: CreateCaseInput;
}): Promise<ServiceResult<{ readonly id: string }>> => {
  const rows = input.type === "unit" ? 1 : input.rows;
  const cols = input.type === "unit" ? 1 : input.cols;

  const id = await locationRepo.insertCaseWithLocations({
    drizzleDb,
    userId,
    name: input.name,
    type: input.type,
    description: input.description,
    rows,
    cols,
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
    readonly description: string | undefined;
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

  await locationRepo.updateCase({
    drizzleDb,
    id: input.id,
    userId,
    name: input.name,
    description: input.description,
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

export const updateLocation = async ({
  drizzleDb,
  userId,
  input,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly input: {
    readonly id: string;
    readonly customName: string | undefined;
    readonly description: string | undefined;
  };
}): Promise<ServiceResult<{ readonly id: string }>> => {
  const existing = await locationRepo.findLocationById({
    drizzleDb,
    id: input.id,
    userId,
  });
  if (existing === undefined) {
    return serviceError("NOT_FOUND", "ロケーションが見つかりません");
  }

  await locationRepo.updateLocation({
    drizzleDb,
    id: input.id,
    userId,
    customName: input.customName,
    description: input.description,
  });
  return serviceOk({ id: input.id });
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
