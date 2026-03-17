import { atom } from "jotai";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/lib/db/dexie";
import { GARMENT_STATUS, SYNC_ACTION_TYPE } from "@/lib/constants";
import { generateLabel } from "@/lib/generateLabel";
import type { StorageCase, StorageLocation } from "@/types";

const storageCasesRefreshTriggerAtom = atom(0);

export const storageCasesAtom = atom(async (get) => {
  get(storageCasesRefreshTriggerAtom);
  const cases = await db.storageCases.toArray();
  return cases;
});

export const refreshStorageCasesAtom = atom(undefined, (_get, set) => {
  set(storageCasesRefreshTriggerAtom, (prev) => prev + 1);
});

const storageLocationsRefreshTriggerAtom = atom(0);

export const storageLocationsAtom = atom(async (get) => {
  get(storageLocationsRefreshTriggerAtom);
  const locations = await db.storageLocations.toArray();
  return locations;
});

export const refreshStorageLocationsAtom = atom(undefined, (_get, set) => {
  set(storageLocationsRefreshTriggerAtom, (prev) => prev + 1);
});

export const addStorageCaseAtom = atom(
  undefined,
  async (_get, _set, storageCase: StorageCase) => {
    await db.storageCases.add(storageCase);
    await db.syncQueue.add({
      type: SYNC_ACTION_TYPE.STORAGE_CASE_CREATE,
      payload: storageCase,
      createdAt: Date.now(),
    });
  },
);

export const addStorageLocationAtom = atom(
  undefined,
  async (_get, _set, location: StorageLocation) => {
    await db.storageLocations.add(location);
    await db.syncQueue.add({
      type: SYNC_ACTION_TYPE.STORAGE_LOCATION_CREATE,
      payload: location,
      createdAt: Date.now(),
    });
  },
);

type AddStorageCaseInput = {
  readonly name: string;
  readonly rows: number;
  readonly cols: number;
  readonly userId: string;
};

export const addStorageCaseWithLocationsAtom = atom(
  undefined,
  async (_get, _set, input: AddStorageCaseInput) => {
    const now = Date.now();
    const caseId = createId();

    const storageCase: StorageCase = {
      id: caseId,
      userId: input.userId,
      name: input.name,
      rows: input.rows,
      cols: input.cols,
      createdAt: now,
    };

    const locations: readonly StorageLocation[] = Array.from(
      { length: input.rows * input.cols },
      (_, i) => {
        const row = Math.floor(i / input.cols);
        const col = i % input.cols;
        return {
          id: createId(),
          userId: input.userId,
          caseId,
          label: generateLabel({ row, col }),
          row,
          col,
          createdAt: now,
        };
      },
    );

    await db.storageCases.add(storageCase);
    await db.storageLocations.bulkAdd([...locations]);
    await db.syncQueue.add({
      type: SYNC_ACTION_TYPE.STORAGE_CASE_CREATE,
      payload: { storageCase, locations },
      createdAt: now,
    });
  },
);

export const updateStorageCaseAtom = atom(
  undefined,
  async (_get, _set, storageCase: StorageCase) => {
    await db.storageCases.put(storageCase);
    await db.syncQueue.add({
      type: SYNC_ACTION_TYPE.STORAGE_CASE_UPDATE,
      payload: storageCase,
      createdAt: Date.now(),
    });
  },
);

export const deleteStorageCaseAtom = atom(
  undefined,
  async (_get, _set, caseId: string) => {
    const now = Date.now();

    const locations = await db.storageLocations
      .where("caseId")
      .equals(caseId)
      .toArray();

    const locationIds = locations.map((l) => l.id);

    const affectedGarments =
      locationIds.length > 0
        ? await db.garments.where("locationId").anyOf(locationIds).toArray()
        : [];

    await (affectedGarments.length > 0
      ? db.garments.bulkPut(
          affectedGarments.map((g) => ({
            ...g,
            locationId: undefined,
            status: GARMENT_STATUS.CHECKED_OUT,
            checkedOutAt: now,
            updatedAt: now,
          })),
        )
      : Promise.resolve());

    await db.storageLocations.where("caseId").equals(caseId).delete();
    await db.storageCases.delete(caseId);
    await db.syncQueue.add({
      type: SYNC_ACTION_TYPE.STORAGE_CASE_DELETE,
      payload: { id: caseId },
      createdAt: now,
    });
  },
);
