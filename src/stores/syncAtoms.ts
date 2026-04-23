import { atom } from "jotai";
import { getDb } from "@/lib/db/dexie";
import { trpcClient } from "@/lib/trpc";
import { SYNC_STATUS, SYNC_ACTION_TYPE } from "@/lib/constants";
import type { SyncStatusValue } from "@/lib/constants";
import type {
  Coordinate,
  Doll,
  Garment,
  StorageCase,
  StorageLocation,
} from "@/types";
import { refreshCoordinatesAtom } from "@/stores/coordinateAtoms";
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
      set(refreshDollsAtom);
      set(refreshGarmentsAtom);
      set(refreshStorageCasesAtom);
      set(refreshStorageLocationsAtom);
      set(refreshCoordinatesAtom);
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
  readonly dollSizes: Garment["dollSizes"];
  readonly colors: readonly string[];
  readonly tags: readonly string[];
  readonly imageUrl?: string | null;
  readonly locationId?: string | null;
  readonly status: Garment["status"];
  readonly lastScannedAt: number;
  readonly confidenceDecayDays: number;
  readonly confidenceDecayDaysOverride?: number | null;
  readonly recentCheckoutCount: number;
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
  confidenceDecayDaysOverride: g.confidenceDecayDaysOverride ?? undefined,
  recentCheckoutCount: g.recentCheckoutCount,
  brand: g.brand ?? undefined,
  description: g.description ?? undefined,
  setContents: g.setContents ?? undefined,
  checkedOutAt: g.checkedOutAt ?? undefined,
  archivedAt: g.archivedAt ?? undefined,
  createdAt: g.createdAt,
  updatedAt: g.updatedAt,
});

const toClientCoordinate = (c: {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly garmentIds: readonly string[];
  readonly isAiGenerated: boolean;
  readonly memo?: string | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}): Coordinate => ({
  id: c.id,
  userId: c.userId,
  name: c.name,
  garmentIds: c.garmentIds,
  isAiGenerated: c.isAiGenerated,
  memo: c.memo ?? undefined,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
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

const pullServerState = async (): Promise<SyncResult> => {
  const serverState = await trpcClient.sync.pull.query();

  const garments = serverState.garments.map(toClientGarment);
  const dolls = serverState.dolls.map(toClientDoll);
  const coordinates = serverState.coordinates.map(toClientCoordinate);
  const storageCases: readonly StorageCase[] = serverState.storageCases.map(
    (c) => ({
      id: c.id,
      userId: c.userId,
      name: c.name,
      type: c.type === "unit" ? ("unit" as const) : ("grid" as const),
      description: c.description ?? undefined,
      rows: c.rows,
      cols: c.cols,
      createdAt: c.createdAt,
    }),
  );
  const storageLocations: readonly StorageLocation[] =
    serverState.storageLocations.map((l) => ({
      id: l.id,
      userId: l.userId,
      caseId: l.caseId,
      label: l.label,
      customName: l.customName ?? undefined,
      description: l.description ?? undefined,
      row: l.row,
      col: l.col,
      lastVisitedAt: l.lastVisitedAt ?? undefined,
      confirmAllCount: l.confirmAllCount,
      correctionCount: l.correctionCount,
      createdAt: l.createdAt,
    }));

  const d = getDb();
  await d.transaction(
    "rw",
    [d.dolls, d.garments, d.storageCases, d.storageLocations, d.coordinates],
    async () => {
      await d.dolls.clear();
      await d.garments.clear();
      await d.storageCases.clear();
      await d.storageLocations.clear();
      await d.coordinates.clear();

      await bulkAddIfNotEmpty(d.dolls, dolls);
      await bulkAddIfNotEmpty(d.garments, garments);
      await bulkAddIfNotEmpty(d.storageCases, storageCases);
      await bulkAddIfNotEmpty(d.storageLocations, storageLocations);
      await bulkAddIfNotEmpty(d.coordinates, coordinates);
    },
  );

  return { ok: true };
};
