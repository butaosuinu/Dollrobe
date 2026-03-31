import type { Doll, Garment, StorageCase, StorageLocation } from "@/types";
import type { Logger } from "../lib/logger";
import type { DrizzleDB } from "../db/client";
import * as dollRepo from "../repositories/doll-repository";
import * as garmentRepo from "../repositories/garment-repository";
import * as locationRepo from "../repositories/location-repository";
import * as tombstoneRepo from "../repositories/tombstone-repository";
import { type ServiceResult, serviceError, serviceOk } from "./types";
import { ACTION_PROCESSORS } from "./sync-processors";

type SyncItem = {
  readonly type: string;
  readonly payload: unknown;
  readonly createdAt: number;
};

type ProcessContext = {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly logger: Logger;
};

const SYNC_TYPE_PRIORITY: ReadonlyMap<string, number> = new Map([
  ["storageCase:create", 0],
  ["storageCase:update", 1],
  ["storageLocation:create", 2],
  ["storageLocation:update", 3],
  ["doll:create", 4],
  ["doll:update", 5],
  ["garment:create", 6],
  ["garment:update", 7],
  ["garment:delete", 8],
  ["doll:delete", 9],
  ["storageCase:delete", 10],
]);

const DEFAULT_PRIORITY = 100;

const getSyncTypePriority = (type: string): number =>
  SYNC_TYPE_PRIORITY.get(type) ?? DEFAULT_PRIORITY;

const sortByDependencyOrder = (
  items: readonly SyncItem[],
): readonly SyncItem[] =>
  [...items].sort((a, b) => {
    const priorityDiff =
      getSyncTypePriority(a.type) - getSyncTypePriority(b.type);
    return priorityDiff !== 0 ? priorityDiff : a.createdAt - b.createdAt;
  });

type ProcessResult = ServiceResult<{ readonly processed: true }>;

const processItem = async (
  ctx: ProcessContext,
  item: SyncItem,
): Promise<ProcessResult> => {
  const processor = ACTION_PROCESSORS[item.type];
  if (processor === undefined) {
    return serviceError(
      "BAD_REQUEST",
      `Unknown sync action type: ${item.type}`,
    );
  }
  return await processor(
    { ...ctx, logger: ctx.logger.child({ syncActionType: item.type }) },
    item.payload,
  );
};

const processItemsSequentially = async (
  ctx: ProcessContext,
  items: readonly SyncItem[],
): Promise<ServiceResult<{ readonly processedCount: number }>> => {
  if (items.length === 0) {
    return serviceOk({ processedCount: 0 });
  }
  const [first, ...rest] = items;
  if (first === undefined) {
    return serviceOk({ processedCount: 0 });
  }
  const firstResult = await processItem(ctx, first);
  if (!firstResult.ok) {
    return firstResult;
  }

  const restResults = await rest.reduce<
    Promise<ServiceResult<{ readonly processedCount: number }>>
  >(
    async (accPromise, item) => {
      const acc = await accPromise;
      if (!acc.ok) {
        return acc;
      }
      const result = await processItem(ctx, item);
      if (!result.ok) {
        return result;
      }
      return serviceOk({ processedCount: acc.data.processedCount + 1 });
    },
    Promise.resolve(serviceOk({ processedCount: 1 })),
  );

  return restResults;
};

export const push = async ({
  drizzleDb,
  userId,
  items,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly items: readonly SyncItem[];
  readonly logger: Logger;
}): Promise<
  ServiceResult<{ readonly success: true; readonly processedCount: number }>
> => {
  logger.info("Sync push started", { itemCount: items.length });

  const orderedItems = sortByDependencyOrder(items);
  const result = await processItemsSequentially(
    { drizzleDb, userId, logger },
    orderedItems,
  );
  if (!result.ok) {
    return result;
  }

  logger.info("Sync push completed", {
    processedCount: result.data.processedCount,
  });
  return serviceOk({
    success: true,
    processedCount: result.data.processedCount,
  });
};

type DeletedId = {
  readonly entityType: string;
  readonly entityId: string;
};

type PullResult = {
  readonly garments: readonly Garment[];
  readonly storageCases: readonly StorageCase[];
  readonly storageLocations: readonly StorageLocation[];
  readonly dolls: readonly Doll[];
  readonly totalCount: number;
  readonly nextCursor: string | undefined;
  readonly deletedIds: readonly DeletedId[];
};

export const pull = async ({
  drizzleDb,
  userId,
  since,
  cursor,
  limit,
  logger,
}: {
  readonly drizzleDb: DrizzleDB;
  readonly userId: string;
  readonly since?: number;
  readonly cursor?: string;
  readonly limit: number;
  readonly logger: Logger;
}): Promise<ServiceResult<PullResult>> => {
  logger.info("Sync pull started", { since, cursor, limit });

  const [
    paginatedResult,
    pulledCases,
    pulledLocations,
    pulledDolls,
    deletedIds,
  ] = await Promise.all([
    garmentRepo.findGarmentsPaginated({
      drizzleDb,
      userId,
      since,
      cursor,
      limit,
      logger,
    }),
    cursor === undefined
      ? locationRepo.findCasesByUserId({ drizzleDb, userId })
      : Promise.resolve([]),
    cursor === undefined
      ? locationRepo.findLocationsByUserId({ drizzleDb, userId })
      : Promise.resolve([]),
    cursor === undefined
      ? dollRepo.findDolls({ drizzleDb, userId, filters: {}, logger })
      : Promise.resolve([]),
    tombstoneRepo.findTombstones({ drizzleDb, userId, since, logger }),
  ]);

  logger.info("Sync pull completed", {
    garmentCount: paginatedResult.garments.length,
    caseCount: pulledCases.length,
    locationCount: pulledLocations.length,
    dollCount: pulledDolls.length,
    deletedCount: deletedIds.length,
    hasMore: paginatedResult.nextCursor !== undefined,
  });

  return serviceOk({
    garments: paginatedResult.garments,
    storageCases: pulledCases,
    storageLocations: pulledLocations,
    dolls: pulledDolls,
    totalCount: paginatedResult.totalCount,
    nextCursor: paginatedResult.nextCursor,
    deletedIds,
  });
};
