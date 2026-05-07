import { atom } from "jotai";
import { createId } from "@paralleldrive/cuid2";
import { getDb } from "@/lib/db/dexie";
import { GARMENT_STATUS, SYNC_ACTION_TYPE } from "@/lib/constants";
import { generateLabel } from "@/lib/generateLabel";
import type { StorageCase, StorageLocation } from "@/types";
import { createEntityAtoms } from "./createEntityAtoms";
import { currentUserIdAtom } from "./authAtoms";

const {
  dataAtom: storageCasesAtom,
  refreshAtom: refreshStorageCasesAtom,
  addAtom: addStorageCaseAtom,
  updateAtom: updateStorageCaseAtom,
} = createEntityAtoms<StorageCase>(() => getDb().storageCases, {
  create: SYNC_ACTION_TYPE.STORAGE_CASE_CREATE,
  update: SYNC_ACTION_TYPE.STORAGE_CASE_UPDATE,
  delete: SYNC_ACTION_TYPE.STORAGE_CASE_DELETE,
});

export {
  storageCasesAtom,
  refreshStorageCasesAtom,
  addStorageCaseAtom,
  updateStorageCaseAtom,
};

const {
  dataAtom: storageLocationsAtom,
  refreshAtom: refreshStorageLocationsAtom,
  addAtom: addStorageLocationAtom,
} = createEntityAtoms<StorageLocation>(() => getDb().storageLocations, {
  create: SYNC_ACTION_TYPE.STORAGE_LOCATION_CREATE,
  update: SYNC_ACTION_TYPE.STORAGE_LOCATION_UPDATE,
  delete: SYNC_ACTION_TYPE.STORAGE_LOCATION_UPDATE,
});

export {
  storageLocationsAtom,
  refreshStorageLocationsAtom,
  addStorageLocationAtom,
};

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
}): readonly StorageLocation[] => {
  if (input.type === "unit") {
    return [
      {
        id: createId(),
        userId: input.userId,
        caseId,
        label: input.name,
        customName: undefined,
        description: undefined,
        row: 0,
        col: 0,
        lastVisitedAt: undefined,
        confirmAllCount: 0,
        correctionCount: 0,
        createdAt: now,
      },
    ];
  }

  return Array.from({ length: input.rows * input.cols }, (_, i) => {
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
      lastVisitedAt: undefined,
      confirmAllCount: 0,
      correctionCount: 0,
      createdAt: now,
    };
  });
};

export const addStorageCaseWithLocationsAtom = atom(
  undefined,
  async (get, set, input: AddStorageCaseInput) => {
    const userId = get(currentUserIdAtom);
    if (userId === undefined) return;

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

    await getDb().storageCases.add(storageCase);
    await getDb().storageLocations.bulkAdd([...locations]);
    await getDb().syncQueue.add({
      type: SYNC_ACTION_TYPE.STORAGE_CASE_CREATE,
      payload: { storageCase, locations },
      createdAt: now,
    });
    set(refreshStorageCasesAtom);
    set(refreshStorageLocationsAtom);
  },
);

export const updateStorageLocationAtom = atom(
  undefined,
  async (
    _get,
    set,
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
    await getDb().storageLocations.put(updated);
    await getDb().syncQueue.add({
      type: SYNC_ACTION_TYPE.STORAGE_LOCATION_UPDATE,
      payload: updated,
      createdAt: Date.now(),
    });
    set(refreshStorageLocationsAtom);
  },
);

export const deleteStorageCaseAtom = atom(
  undefined,
  async (get, set, caseId: string) => {
    const userId = get(currentUserIdAtom);
    if (userId === undefined) return;

    const now = Date.now();

    const locations = await getDb()
      .storageLocations.where("caseId")
      .equals(caseId)
      .and((l) => l.userId === userId)
      .toArray();

    const locationIds = locations.map((l) => l.id);

    const affectedGarments =
      locationIds.length > 0
        ? await getDb()
            .garments.where("locationId")
            .anyOf(locationIds)
            .and((g) => g.userId === userId)
            .toArray()
        : [];

    await (affectedGarments.length > 0
      ? getDb().garments.bulkPut(
          affectedGarments.map((g) => ({
            ...g,
            locationId: undefined,
            status: GARMENT_STATUS.CHECKED_OUT,
            checkedOutAt: now,
            updatedAt: now,
          })),
        )
      : Promise.resolve());

    await getDb()
      .storageLocations.where("caseId")
      .equals(caseId)
      .and((l) => l.userId === userId)
      .delete();
    await getDb()
      .storageCases.where("id")
      .equals(caseId)
      .and((c) => c.userId === userId)
      .delete();
    await getDb().syncQueue.add({
      type: SYNC_ACTION_TYPE.STORAGE_CASE_DELETE,
      payload: { id: caseId },
      createdAt: now,
    });
    set(refreshStorageCasesAtom);
    set(refreshStorageLocationsAtom);
  },
);
