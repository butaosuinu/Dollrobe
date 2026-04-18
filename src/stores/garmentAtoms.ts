import { atom } from "jotai";
import { getDb } from "@/lib/db/dexie";
import { GARMENT_STATUS, MS_PER_DAY, SYNC_ACTION_TYPE } from "@/lib/constants";
import { getEffectiveDecayDays } from "@/lib/confidence";
import type { Garment, ScanConfirmation, StorageLocation } from "@/types";
import { createEntityAtoms, createRestoreAtom } from "./createEntityAtoms";
import { refreshStorageLocationsAtom } from "./locationAtoms";

const MEMORY_CONFIRM_CONFIDENCE = 0.5;

const recordLocationVisit = async ({
  locationId,
  confirmAllDelta,
  correctionDelta,
  now,
}: {
  readonly locationId: string;
  readonly confirmAllDelta: number;
  readonly correctionDelta: number;
  readonly now: number;
}): Promise<StorageLocation | undefined> => {
  const location = await getDb().storageLocations.get(locationId);
  const updated: StorageLocation | undefined =
    location === undefined
      ? undefined
      : {
          ...location,
          confirmAllCount: location.confirmAllCount + confirmAllDelta,
          correctionCount: location.correctionCount + correctionDelta,
          lastVisitedAt: now,
        };
  await (updated === undefined
    ? Promise.resolve()
    : Promise.all([
        getDb().storageLocations.put(updated),
        getDb().syncQueue.add({
          type: SYNC_ACTION_TYPE.STORAGE_LOCATION_UPDATE,
          payload: updated,
          createdAt: now,
        }),
      ]));
  return updated;
};

const {
  dataAtom: garmentsAtom,
  refreshAtom: refreshGarmentsAtom,
  addAtom: addGarmentAtom,
  updateAtom: updateGarmentAtom,
  deleteAtom: deleteGarmentAtom,
} = createEntityAtoms<Garment>(() => getDb().garments, {
  create: SYNC_ACTION_TYPE.GARMENT_CREATE,
  update: SYNC_ACTION_TYPE.GARMENT_UPDATE,
  delete: SYNC_ACTION_TYPE.GARMENT_DELETE,
});

export {
  garmentsAtom,
  refreshGarmentsAtom,
  addGarmentAtom,
  updateGarmentAtom,
  deleteGarmentAtom,
};

export const activeGarmentsAtom = atom(async (get) => {
  const garments = await get(garmentsAtom);
  return garments.filter((g) => g.archivedAt === undefined);
});

export const restoreGarmentAtom = createRestoreAtom(
  () => getDb().garments,
  refreshGarmentsAtom,
  SYNC_ACTION_TYPE.GARMENT_UPDATE,
);

export const confirmAllGarmentsAtom = atom(
  undefined,
  async (_get, set, locationId: string) => {
    const now = Date.now();
    const garments = await getDb()
      .garments.where("locationId")
      .equals(locationId)
      .toArray();

    const storedGarments = garments.filter(
      (g) => g.status === GARMENT_STATUS.STORED && g.archivedAt === undefined,
    );

    await getDb().garments.bulkPut(
      storedGarments.map((g) => ({ ...g, lastScannedAt: now, updatedAt: now })),
    );
    await getDb().syncQueue.bulkAdd(
      storedGarments.map((g) => ({
        type: SYNC_ACTION_TYPE.GARMENT_UPDATE,
        payload: { ...g, lastScannedAt: now, updatedAt: now },
        createdAt: now,
      })),
    );
    await recordLocationVisit({
      locationId,
      confirmAllDelta: 1,
      correctionDelta: 0,
      now,
    });
    set(refreshGarmentsAtom);
    set(refreshStorageLocationsAtom);
  },
);

export const confirmPartialGarmentsAtom = atom(
  undefined,
  async (
    _get,
    set,
    input: {
      readonly locationId: string;
      readonly confirmations: readonly ScanConfirmation[];
    },
  ) => {
    const now = Date.now();
    const { locationId, confirmations } = input;
    const confirmedIds = confirmations
      .filter((c) => c.confirmed)
      .map((c) => c.garmentId);
    const deniedIds = confirmations
      .filter((c) => !c.confirmed)
      .map((c) => c.garmentId);

    const confirmedGarments = await getDb()
      .garments.where("id")
      .anyOf(confirmedIds)
      .toArray();

    await getDb().garments.bulkPut(
      confirmedGarments.map((g) => ({
        ...g,
        lastScannedAt: now,
        updatedAt: now,
      })),
    );
    await getDb().syncQueue.bulkAdd(
      confirmedGarments.map((g) => ({
        type: SYNC_ACTION_TYPE.GARMENT_UPDATE,
        payload: { ...g, lastScannedAt: now, updatedAt: now },
        createdAt: now,
      })),
    );

    const deniedGarments = await getDb()
      .garments.where("id")
      .anyOf(deniedIds)
      .toArray();

    await getDb().garments.bulkPut(
      deniedGarments.map((g) => ({
        ...g,
        status: GARMENT_STATUS.CHECKED_OUT,
        locationId: undefined,
        checkedOutAt: now,
        updatedAt: now,
      })),
    );
    await getDb().syncQueue.bulkAdd(
      deniedGarments.map((g) => ({
        type: SYNC_ACTION_TYPE.GARMENT_UPDATE,
        payload: {
          ...g,
          status: GARMENT_STATUS.CHECKED_OUT,
          locationId: undefined,
          checkedOutAt: now,
          updatedAt: now,
        },
        createdAt: now,
      })),
    );

    const hasDiscrepancy = deniedIds.length > 0;
    await recordLocationVisit({
      locationId,
      confirmAllDelta: hasDiscrepancy ? 0 : 1,
      correctionDelta: hasDiscrepancy ? 1 : 0,
      now,
    });
    set(refreshGarmentsAtom);
    set(refreshStorageLocationsAtom);
  },
);

export const confirmAllByMemoryAtom = atom(
  undefined,
  async (_get, set, locationId: string) => {
    const now = Date.now();
    const garments = await getDb()
      .garments.where("locationId")
      .equals(locationId)
      .toArray();

    const storedGarments = garments.filter(
      (g) => g.status === GARMENT_STATUS.STORED && g.archivedAt === undefined,
    );

    const updates = storedGarments.map((g) => {
      const decayDays = getEffectiveDecayDays({
        recentCheckoutCount: g.recentCheckoutCount,
        confidenceDecayDaysOverride: g.confidenceDecayDaysOverride,
      });
      const halfElapsedMs =
        decayDays * (1 - MEMORY_CONFIRM_CONFIDENCE) * MS_PER_DAY;
      return {
        ...g,
        lastScannedAt: now - halfElapsedMs,
        updatedAt: now,
      };
    });

    await getDb().garments.bulkPut(updates);
    await getDb().syncQueue.bulkAdd(
      updates.map((g) => ({
        type: SYNC_ACTION_TYPE.GARMENT_UPDATE,
        payload: g,
        createdAt: now,
      })),
    );

    const location = await getDb().storageLocations.get(locationId);
    await (location === undefined
      ? Promise.resolve()
      : Promise.all([
          getDb().storageLocations.put({ ...location, lastVisitedAt: now }),
          getDb().syncQueue.add({
            type: SYNC_ACTION_TYPE.STORAGE_LOCATION_UPDATE,
            payload: { ...location, lastVisitedAt: now },
            createdAt: now,
          }),
        ]));

    set(refreshGarmentsAtom);
    set(refreshStorageLocationsAtom);
  },
);
