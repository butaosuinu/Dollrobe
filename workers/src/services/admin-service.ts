import type { Garment, Coordinate, StorageLocation } from "@/types";
import { MS_PER_DAY } from "@shared/lib/constants";
import type { DrizzleDB } from "../db/client";
import type { Logger } from "../lib/logger";
import * as adminRepo from "../repositories/admin-repository";
import type {
  AdminMetricsSummary,
  AdminUser,
  AdminUserRole,
} from "../repositories/admin-repository";
import * as auditLogRepo from "../repositories/audit-log-repository";
import type { AdminAuditLog } from "../repositories/audit-log-repository";
import * as coordinateRepo from "../repositories/coordinate-repository";
import * as garmentRepo from "../repositories/garment-repository";
import * as locationRepo from "../repositories/location-repository";
import { type ServiceResult, serviceError, serviceOk } from "./types";

const SEVEN_DAYS = 7;
const SEVEN_DAYS_MS = SEVEN_DAYS * MS_PER_DAY;

export type AdminFreezeOk = {
  readonly ok: true;
  readonly noop: boolean;
};

const listFilters = (input: {
  readonly search?: string;
  readonly role?: AdminUserRole;
  readonly frozen?: boolean;
}) => ({
  search: input.search,
  role: input.role,
  frozen: input.frozen,
});

export const listUsers = async ({
  drizzleDb,
  input,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly input: {
    readonly search?: string;
    readonly role?: AdminUserRole;
    readonly frozen?: boolean;
    readonly limit: number;
    readonly offset: number;
  };
  readonly logger: Logger;
}): Promise<
  ServiceResult<{
    readonly items: readonly AdminUser[];
    readonly total: number;
  }>
> => {
  const result = await adminRepo.findUsers({
    drizzleDb,
    filters: listFilters(input),
    limit: input.limit,
    offset: input.offset,
    logger,
  });
  return serviceOk(result);
};

export const getUserDetail = async ({
  drizzleDb,
  id,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly id: string;
  readonly logger: Logger;
}): Promise<ServiceResult<AdminUser>> => {
  const user = await adminRepo.findUserById({ drizzleDb, id, logger });
  if (user === undefined) {
    return serviceError("NOT_FOUND", `User not found: ${id}`);
  }
  return serviceOk(user);
};

export const freezeUser = async ({
  drizzleDb,
  actorUserId,
  targetUserId,
  reason,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly actorUserId: string;
  readonly targetUserId: string;
  readonly reason: string | undefined;
  readonly logger: Logger;
}): Promise<ServiceResult<AdminFreezeOk>> => {
  if (actorUserId === targetUserId) {
    return serviceError("BAD_REQUEST", "Cannot freeze yourself");
  }

  const target = await adminRepo.findUserById({
    drizzleDb,
    id: targetUserId,
    logger,
  });
  if (target === undefined) {
    return serviceError("NOT_FOUND", `User not found: ${targetUserId}`);
  }
  if (target.role === "admin") {
    return serviceError(
      "FORBIDDEN",
      "Cannot freeze another admin (admin→admin is disallowed in MVP)",
    );
  }
  if (target.frozen) {
    return serviceOk({ ok: true, noop: true });
  }

  // 並行リクエストが先にフリーズを成立させていた race を弾くため、
  // UPDATE 実行後の changes を確認して noop を判定する。
  const result = await adminRepo.freezeUserBatch({
    drizzleDb,
    actorUserId,
    targetUserId,
    reason,
    now: Date.now(),
    logger,
  });

  return serviceOk({ ok: true, noop: !result.changed });
};

export const unfreezeUser = async ({
  drizzleDb,
  actorUserId,
  targetUserId,
  reason,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly actorUserId: string;
  readonly targetUserId: string;
  readonly reason: string | undefined;
  readonly logger: Logger;
}): Promise<ServiceResult<AdminFreezeOk>> => {
  if (actorUserId === targetUserId) {
    return serviceError("BAD_REQUEST", "Cannot unfreeze yourself");
  }

  const target = await adminRepo.findUserById({
    drizzleDb,
    id: targetUserId,
    logger,
  });
  if (target === undefined) {
    return serviceError("NOT_FOUND", `User not found: ${targetUserId}`);
  }
  if (!target.frozen) {
    return serviceOk({ ok: true, noop: true });
  }

  const result = await adminRepo.unfreezeUserBatch({
    drizzleDb,
    actorUserId,
    targetUserId,
    reason,
    now: Date.now(),
    logger,
  });

  return serviceOk({ ok: true, noop: !result.changed });
};

export const getMetricsSummary = async ({
  drizzleDb,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly logger: Logger;
}): Promise<ServiceResult<AdminMetricsSummary>> => {
  const summary = await adminRepo.getMetricsSummary({
    drizzleDb,
    sevenDaysAgo: Date.now() - SEVEN_DAYS_MS,
    logger,
  });
  return serviceOk(summary);
};

export const listAudits = async ({
  drizzleDb,
  input,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly input: {
    readonly action?: string;
    readonly actorUserId?: string;
    readonly targetUserId?: string;
    readonly limit: number;
    readonly offset: number;
  };
  readonly logger: Logger;
}): Promise<
  ServiceResult<{
    readonly items: readonly AdminAuditLog[];
    readonly total: number;
  }>
> => {
  const result = await auditLogRepo.findAuditLogs({
    drizzleDb,
    filters: {
      action: input.action,
      actorUserId: input.actorUserId,
      targetUserId: input.targetUserId,
    },
    limit: input.limit,
    offset: input.offset,
    logger,
  });
  return serviceOk(result);
};

const paginate = <T>(
  items: readonly T[],
  limit: number,
  offset: number,
): { readonly items: readonly T[]; readonly total: number } => ({
  items: items.slice(offset, offset + limit),
  total: items.length,
});

export const getUserGarments = async ({
  drizzleDb,
  userId,
  limit,
  offset,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly limit: number;
  readonly offset: number;
  readonly logger: Logger;
}): Promise<
  ServiceResult<{
    readonly items: readonly Garment[];
    readonly total: number;
  }>
> => {
  const items = await garmentRepo.findGarments({
    drizzleDb,
    userId,
    filters: {},
    logger,
  });
  return serviceOk(paginate(items, limit, offset));
};

export const getUserLocations = async ({
  drizzleDb,
  userId,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly logger: Logger;
}): Promise<ServiceResult<readonly StorageLocation[]>> => {
  const items = await locationRepo.findLocationsByUserId({
    drizzleDb,
    userId,
  });
  logger.info("admin viewed locations", { targetUserId: userId });
  return serviceOk(items);
};

export const getUserCoordinates = async ({
  drizzleDb,
  userId,
  limit,
  offset,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly limit: number;
  readonly offset: number;
  readonly logger: Logger;
}): Promise<
  ServiceResult<{
    readonly items: readonly Coordinate[];
    readonly total: number;
  }>
> => {
  const items = await coordinateRepo.findCoordinates({
    drizzleDb,
    userId,
    filters: {},
    logger,
  });
  return serviceOk(paginate(items, limit, offset));
};
