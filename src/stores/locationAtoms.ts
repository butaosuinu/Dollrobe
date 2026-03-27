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

type AddStorageCaseInput =
  | {
      readonly type: "grid";
      readonly name: string;
      readonly description: string | undefined;
      readonly rows: number;
      readonly cols: number;
      readonly userId: string;
    }
  | {
      readonly type: "unit";
      readonly name: string;
      readonly description: string | undefined;
      readonly userId: string;
    };

const buildLocations = ({
  input,
  caseId,
  now,
}: {
  readonly input: AddStorageCaseInput;
  readonly caseId: string;
  readonly now: number;
}): readonly StorageLocation[] =>
  input.type === "unit"
    ? [
        {
          id: createId(),
          userId: input.userId,
          caseId,
          label: input.name,
          customName: undefined,
          description: undefined,
          row: 0,
          col: 0,
          createdAt: now,
        },
      ]
    : Array.from({ length: input.rows * input.cols }, (_, i) => {
        const row = Math.floor(i / input.cols);
        const col = i % input.cols;
        return {
          id: createId(),
          userId: input.userId,
          caseId,
          label: generateLabel({ row, col }),
          customName: undefined,
          description: undefined,
          row,
          col,
          createdAt: now,
        };
      });

export const addStorageCaseWithLocationsAtom = atom(
  undefined,
  async (_get, _set, input: AddStorageCaseInput) => {
    const now = Date.now();
    const caseId = createId();
    const rows = input.type === "unit" ? 1 : input.rows;
    const cols = input.type === "unit" ? 1 : input.cols;

    const storageCase: StorageCase = {
      id: caseId,
      userId: input.userId,
      name: input.name,
      type: input.type,
      description: input.description,
      rows,
      cols,
      createdAt: now,
    };

    const locations = buildLocations({ input, caseId, now });

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

export const updateStorageLocationAtom = atom(
  undefined,
  async (
    _get,
    _set,
    input: {
      readonly location: StorageLocation;
      readonly customName: string | undefined;
      readonly description: string | undefined;
    },
  ) => {
    const updated: StorageLocation = {
      ...input.location,
      customName: input.customName,
      description: input.description,
    };
    await db.storageLocations.put(updated);
    await db.syncQueue.add({
      type: SYNC_ACTION_TYPE.STORAGE_LOCATION_UPDATE,
      payload: updated,
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
