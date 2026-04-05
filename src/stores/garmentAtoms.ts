import { atom } from "jotai";
import { getDb } from "@/lib/db/dexie";
import { GARMENT_STATUS, SYNC_ACTION_TYPE } from "@/lib/constants";
import type { Garment, ScanConfirmation } from "@/types";
import { createEntityAtoms, createRestoreAtom } from "./createEntityAtoms";

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
    set(refreshGarmentsAtom);
  },
);

export const confirmPartialGarmentsAtom = atom(
  undefined,
  async (_get, _set, confirmations: readonly ScanConfirmation[]) => {
    const now = Date.now();
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
  },
);
