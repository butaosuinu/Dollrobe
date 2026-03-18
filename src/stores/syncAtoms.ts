import { atom } from "jotai";
import { db } from "@/lib/db/dexie";
import { trpcClient } from "@/lib/trpc";
import { SYNC_STATUS, SYNC_ACTION_TYPE } from "@/lib/constants";
import type { SyncStatusValue } from "@/lib/constants";
import type { Garment } from "@/types";
import { refreshGarmentsAtom } from "@/stores/garmentAtoms";
import {
  refreshStorageCasesAtom,
  refreshStorageLocationsAtom,
} from "@/stores/locationAtoms";

export const syncStatusAtom = atom<SyncStatusValue>(SYNC_STATUS.IDLE);

const pendingSyncCountRefreshTriggerAtom = atom(0);

export const pendingSyncCountAtom = atom(async (get) => {
  get(pendingSyncCountRefreshTriggerAtom);
  const count = await db.syncQueue.count();
  return count;
});

export const refreshPendingSyncCountAtom = atom(undefined, (_get, set) => {
  set(pendingSyncCountRefreshTriggerAtom, (prev) => prev + 1);
});

export const lastSyncErrorAtom = atom<string | undefined>(undefined);

type SyncResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string };

const toSyncError = (error: unknown): SyncResult => ({
  ok: false,
  error: error instanceof Error ? error.message : "同期に失敗しました",
});

export const executeSyncAtom = atom(
  undefined,
  async (_get, set): Promise<void> => {
    set(syncStatusAtom, SYNC_STATUS.SYNCING);
    set(lastSyncErrorAtom, undefined);

    const result = await executeSyncFlow();

    set(refreshPendingSyncCountAtom);
    set(syncStatusAtom, result.ok ? SYNC_STATUS.IDLE : SYNC_STATUS.ERROR);
    set(lastSyncErrorAtom, result.ok ? undefined : result.error);
    // eslint-disable-next-line functional/no-conditional-statements -- refresh atoms only on success
    if (result.ok) {
      set(refreshGarmentsAtom);
      set(refreshStorageCasesAtom);
      set(refreshStorageLocationsAtom);
    }
  },
);

const executeSyncFlow = async (): Promise<SyncResult> => {
  const pushResult = await pushQueuedItems().catch(toSyncError);
  return pushResult.ok
    ? await pullServerState().catch(toSyncError)
    : pushResult;
};

const VALID_SYNC_TYPES = new Set<string>(Object.values(SYNC_ACTION_TYPE));

type SyncActionType = (typeof SYNC_ACTION_TYPE)[keyof typeof SYNC_ACTION_TYPE];

const isValidSyncType = (type: string): type is SyncActionType =>
  VALID_SYNC_TYPES.has(type);

const pushQueuedItems = async (): Promise<SyncResult> => {
  const items = await db.syncQueue.orderBy("createdAt").toArray();

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
    ? db.syncQueue.bulkDelete(itemIds)
    : Promise.resolve());

  return { ok: true };
};

const bulkAddIfNotEmpty = async <T>(
  table: { bulkAdd: (items: T[]) => Promise<unknown> },
  items: readonly T[],
) => {
  await (items.length > 0 ? table.bulkAdd([...items]) : Promise.resolve());
};

const toClientGarment = (g: {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly category: Garment["category"];
  readonly dollSize: Garment["dollSize"];
  readonly colors: readonly string[];
  readonly tags: readonly string[];
  readonly imageUrl?: string | null;
  readonly locationId?: string | null;
  readonly status: Garment["status"];
  readonly lastScannedAt: number;
  readonly confidenceDecayDays: number;
  readonly brand?: string | null;
  readonly checkedOutAt?: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}): Garment => ({
  id: g.id,
  userId: g.userId,
  name: g.name,
  category: g.category,
  dollSize: g.dollSize,
  colors: g.colors,
  tags: g.tags,
  imageUrl: g.imageUrl ?? undefined,
  locationId: g.locationId ?? undefined,
  status: g.status,
  lastScannedAt: g.lastScannedAt,
  confidenceDecayDays: g.confidenceDecayDays,
  brand: g.brand ?? undefined,
  checkedOutAt: g.checkedOutAt ?? undefined,
  createdAt: g.createdAt,
  updatedAt: g.updatedAt,
});

const pullServerState = async (): Promise<SyncResult> => {
  const serverState = await trpcClient.sync.pull.query();

  const garments = serverState.garments.map(toClientGarment);

  await db.transaction(
    "rw",
    [db.garments, db.storageCases, db.storageLocations],
    async () => {
      await db.garments.clear();
      await db.storageCases.clear();
      await db.storageLocations.clear();

      await bulkAddIfNotEmpty(db.garments, garments);
      await bulkAddIfNotEmpty(db.storageCases, serverState.storageCases);
      await bulkAddIfNotEmpty(
        db.storageLocations,
        serverState.storageLocations,
      );
    },
  );

  return { ok: true };
};
