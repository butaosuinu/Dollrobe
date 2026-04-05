import { atom } from "jotai";
import { getDb } from "@/lib/db/dexie";
import { trpcClient } from "@/lib/trpc";
import { SYNC_STATUS, SYNC_ACTION_TYPE } from "@/lib/constants";
import type { SyncStatusValue } from "@/lib/constants";
import type { Doll, Garment, StorageCase, StorageLocation } from "@/types";
import { refreshDollsAtom } from "@/stores/dollAtoms";
import { refreshGarmentsAtom } from "@/stores/garmentAtoms";
import {
  refreshStorageCasesAtom,
  refreshStorageLocationsAtom,
} from "@/stores/locationAtoms";

export const syncStatusAtom = atom<SyncStatusValue>(SYNC_STATUS.IDLE);

const pendingSyncCountRefreshTriggerAtom = atom(0);

export const pendingSyncCountAtom = atom(async (get) =>
  typeof indexedDB === "undefined"
    ? 0
    : (get(pendingSyncCountRefreshTriggerAtom),
      await getDb().syncQueue.count()),
);

export const refreshPendingSyncCountAtom = atom(undefined, (_get, set) => {
  set(pendingSyncCountRefreshTriggerAtom, (prev) => prev + 1);
});

export const lastSyncErrorAtom = atom<string | undefined>(undefined);

export const syncProgressAtom = atom<
  | {
      readonly loaded: number;
      readonly total: number;
    }
  | undefined
>(undefined);

type SyncResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string };

const toSyncError = (error: unknown): SyncResult => ({
  ok: false,
  error: error instanceof Error ? error.message : "同期に失敗しました",
});

const LAST_SYNCED_AT_KEY = "lastSyncedAt";

const getLastSyncedAt = (): number | undefined => {
  const value = localStorage.getItem(LAST_SYNCED_AT_KEY);
  return value === null ? undefined : Number(value);
};

const setLastSyncedAt = (timestamp: number): void => {
  localStorage.setItem(LAST_SYNCED_AT_KEY, String(timestamp));
};

export const executeSyncAtom = atom(
  undefined,
  async (_get, set): Promise<void> => {
    set(syncStatusAtom, SYNC_STATUS.SYNCING);
    set(lastSyncErrorAtom, undefined);

    const result = await executeSyncFlow((loaded, total) => {
      set(syncProgressAtom, { loaded, total });
    });

    set(syncProgressAtom, undefined);
    set(refreshPendingSyncCountAtom);
    set(syncStatusAtom, result.ok ? SYNC_STATUS.IDLE : SYNC_STATUS.ERROR);
    set(lastSyncErrorAtom, result.ok ? undefined : result.error);
    // eslint-disable-next-line functional/no-conditional-statements -- refresh atoms only on success
    if (result.ok) {
      set(refreshDollsAtom);
      set(refreshGarmentsAtom);
      set(refreshStorageCasesAtom);
      set(refreshStorageLocationsAtom);
    }
  },
);

const executeSyncFlow = async (
  onProgress: (loaded: number, total: number) => void,
): Promise<SyncResult> => {
  const pushResult = await pushQueuedItems().catch(toSyncError);
  return pushResult.ok
    ? await pullServerState(onProgress).catch(toSyncError)
    : pushResult;
};

const VALID_SYNC_TYPES = new Set<string>(Object.values(SYNC_ACTION_TYPE));

type SyncActionType = (typeof SYNC_ACTION_TYPE)[keyof typeof SYNC_ACTION_TYPE];

const isValidSyncType = (type: string): type is SyncActionType =>
  VALID_SYNC_TYPES.has(type);

const pushQueuedItems = async (): Promise<SyncResult> => {
  const items = await getDb().syncQueue.orderBy("createdAt").toArray();

  const validItems = items.flatMap(({ id: _id, type, ...rest }) =>
    isValidSyncType(type) ? [{ ...rest, type }] : [],
  );

  await (validItems.length > 0
    ? trpcClient.sync.push.mutate({ items: validItems })
    : Promise.resolve());

  const itemIds = items.flatMap((item) =>
    item.id === undefined ? [] : [item.id],
  );
  await (itemIds.length > 0
    ? getDb().syncQueue.bulkDelete(itemIds)
    : Promise.resolve());

  return { ok: true };
};

const bulkPutIfNotEmpty = async <T>(
  table: { bulkPut: (items: T[]) => Promise<unknown> },
  items: readonly T[],
) => {
  await (items.length > 0 ? table.bulkPut([...items]) : Promise.resolve());
};

const toClientGarment = (g: {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly category: Garment["category"];
  readonly dollSizes: Garment["dollSizes"];
  readonly colors: readonly string[];
  readonly tags: readonly string[];
  readonly imageUrl?: string | null;
  readonly locationId?: string | null;
  readonly status: Garment["status"];
  readonly lastScannedAt: number;
  readonly confidenceDecayDays: number;
  readonly brand?: string | null;
  readonly description?: string | null;
  readonly setContents?: string | null;
  readonly checkedOutAt?: number | null;
  readonly archivedAt?: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}): Garment => ({
  id: g.id,
  userId: g.userId,
  name: g.name,
  category: g.category,
  dollSizes: g.dollSizes,
  colors: g.colors,
  tags: g.tags,
  imageUrl: g.imageUrl ?? undefined,
  locationId: g.locationId ?? undefined,
  status: g.status,
  lastScannedAt: g.lastScannedAt,
  confidenceDecayDays: g.confidenceDecayDays,
  brand: g.brand ?? undefined,
  description: g.description ?? undefined,
  setContents: g.setContents ?? undefined,
  checkedOutAt: g.checkedOutAt ?? undefined,
  archivedAt: g.archivedAt ?? undefined,
  createdAt: g.createdAt,
  updatedAt: g.updatedAt,
});

const toClientDoll = (d: {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly headModel?: string | null;
  readonly bodySize: Doll["bodySize"];
  readonly maker?: string | null;
  readonly customizer?: string | null;
  readonly imageUrl?: string | null;
  readonly memo?: string | null;
  readonly archivedAt?: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}): Doll => ({
  id: d.id,
  userId: d.userId,
  name: d.name,
  headModel: d.headModel ?? undefined,
  bodySize: d.bodySize,
  maker: d.maker ?? undefined,
  customizer: d.customizer ?? undefined,
  imageUrl: d.imageUrl ?? undefined,
  memo: d.memo ?? undefined,
  archivedAt: d.archivedAt ?? undefined,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

type DeletedId = {
  readonly entityType: string;
  readonly entityId: string;
};

const INITIAL_PAGE_LIMIT = 50;
const BATCH_PAGE_LIMIT = 500;

const pullServerState = async (
  onProgress: (loaded: number, total: number) => void,
): Promise<SyncResult> => {
  const syncStartedAt = Date.now();
  const lastSyncedAt = getLastSyncedAt();
  const hasLocalData = (await getDb().garments.count()) > 0;

  return hasLocalData && lastSyncedAt !== undefined
    ? await pullDelta(lastSyncedAt, syncStartedAt, onProgress)
    : await pullFull(syncStartedAt, onProgress);
};

const pullFull = async (
  syncStartedAt: number,
  onProgress: (loaded: number, total: number) => void,
): Promise<SyncResult> => {
  const firstPage = await trpcClient.sync.pull.query({
    limit: INITIAL_PAGE_LIMIT,
  });

  const storageCases = firstPage.storageCases.map(toClientStorageCase);
  const storageLocations = firstPage.storageLocations.map(
    toClientStorageLocation,
  );
  const dolls = firstPage.dolls.map(toClientDoll);

  /* eslint-disable functional/no-let, functional/no-loop-statements, no-await-in-loop, functional/immutable-data, @typescript-eslint/prefer-destructuring -- cursor pagination: collect all pages before atomic write */
  const garmentPages: Garment[][] = [firstPage.garments.map(toClientGarment)];
  let loadedCount = firstPage.garments.length;
  onProgress(loadedCount, firstPage.totalCount);

  let { nextCursor } = firstPage;

  while (nextCursor !== undefined) {
    const page = await trpcClient.sync.pull.query({
      cursor: nextCursor,
      limit: BATCH_PAGE_LIMIT,
    });

    garmentPages.push(page.garments.map(toClientGarment));
    loadedCount += page.garments.length;
    onProgress(loadedCount, firstPage.totalCount);
    ({ nextCursor } = page);
  }
  /* eslint-enable functional/no-let, functional/no-loop-statements, no-await-in-loop, functional/immutable-data, @typescript-eslint/prefer-destructuring */

  const allGarments = garmentPages.flat();

  const d = getDb();
  await d.transaction(
    "rw",
    [d.dolls, d.garments, d.storageCases, d.storageLocations],
    async () => {
      await d.dolls.clear();
      await d.garments.clear();
      await d.storageCases.clear();
      await d.storageLocations.clear();

      await bulkPutIfNotEmpty(d.dolls, dolls);
      await bulkPutIfNotEmpty(d.garments, allGarments);
      await bulkPutIfNotEmpty(d.storageCases, storageCases);
      await bulkPutIfNotEmpty(d.storageLocations, storageLocations);
    },
  );

  setLastSyncedAt(syncStartedAt);
  return { ok: true };
};

const bulkDeleteByEntityType = async (
  table: { bulkDelete: (ids: string[]) => Promise<unknown> },
  deletedIds: readonly DeletedId[],
  entityType: string,
) => {
  const ids = deletedIds
    .filter((d) => d.entityType === entityType)
    .map((d) => d.entityId);
  await (ids.length > 0 ? table.bulkDelete(ids) : Promise.resolve());
};

const pullDelta = async (
  lastSyncedAt: number,
  syncStartedAt: number,
  onProgress: (loaded: number, total: number) => void,
): Promise<SyncResult> => {
  const result = await trpcClient.sync.pull.query({
    since: lastSyncedAt,
  });

  const garments = result.garments.map(toClientGarment);
  const dolls = result.dolls.map(toClientDoll);
  const storageCases = result.storageCases.map(toClientStorageCase);
  const storageLocations = result.storageLocations.map(toClientStorageLocation);
  const deletedIds: readonly DeletedId[] = result.deletedIds;

  const d = getDb();
  await bulkPutIfNotEmpty(d.garments, garments);
  await bulkPutIfNotEmpty(d.dolls, dolls);
  await bulkPutIfNotEmpty(d.storageCases, storageCases);
  await bulkPutIfNotEmpty(d.storageLocations, storageLocations);

  await bulkDeleteByEntityType(d.garments, deletedIds, "garment");
  await bulkDeleteByEntityType(d.dolls, deletedIds, "doll");
  await bulkDeleteByEntityType(d.storageCases, deletedIds, "storageCase");
  await bulkDeleteByEntityType(
    d.storageLocations,
    deletedIds,
    "storageLocation",
  );

  /* eslint-disable functional/no-let, functional/no-loop-statements, no-await-in-loop, @typescript-eslint/prefer-destructuring -- cursor pagination loop with sequential fetches */
  let { nextCursor } = result;
  let loadedCount = garments.length;
  onProgress(loadedCount, result.totalCount);

  while (nextCursor !== undefined) {
    const page = await trpcClient.sync.pull.query({
      since: lastSyncedAt,
      cursor: nextCursor,
      limit: BATCH_PAGE_LIMIT,
    });

    const pageGarments = page.garments.map(toClientGarment);
    await bulkPutIfNotEmpty(getDb().garments, pageGarments);

    loadedCount += pageGarments.length;
    onProgress(loadedCount, result.totalCount);
    ({ nextCursor } = page);
  }
  /* eslint-enable functional/no-let, functional/no-loop-statements, no-await-in-loop, @typescript-eslint/prefer-destructuring */

  setLastSyncedAt(syncStartedAt);
  return { ok: true };
};

const toClientStorageCase = (c: {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly type: string;
  readonly description?: string | null;
  readonly rows: number;
  readonly cols: number;
  readonly createdAt: number;
}): StorageCase => ({
  id: c.id,
  userId: c.userId,
  name: c.name,
  type: c.type === "unit" ? ("unit" as const) : ("grid" as const),
  description: c.description ?? undefined,
  rows: c.rows,
  cols: c.cols,
  createdAt: c.createdAt,
});

const toClientStorageLocation = (l: {
  readonly id: string;
  readonly userId: string;
  readonly caseId: string;
  readonly label: string;
  readonly customName?: string | null;
  readonly description?: string | null;
  readonly row: number;
  readonly col: number;
  readonly createdAt: number;
}): StorageLocation => ({
  id: l.id,
  userId: l.userId,
  caseId: l.caseId,
  label: l.label,
  customName: l.customName ?? undefined,
  description: l.description ?? undefined,
  row: l.row,
  col: l.col,
  createdAt: l.createdAt,
});
