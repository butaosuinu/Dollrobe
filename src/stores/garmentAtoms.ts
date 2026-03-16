import { atom } from "jotai";
import { db } from "@/lib/db/dexie";
import { GARMENT_STATUS, SYNC_ACTION_TYPE } from "@/lib/constants";
import type { Garment, ScanConfirmation } from "@/types";

export const garmentsAtom = atom(async () => {
  const garments = await db.garments.toArray();
  return garments;
});

export const addGarmentAtom = atom(
  undefined,
  async (_get, _set, garment: Garment) => {
    await db.garments.add(garment);
    await db.syncQueue.add({
      type: SYNC_ACTION_TYPE.GARMENT_CREATE,
      payload: garment,
      createdAt: Date.now(),
    });
  },
);

export const updateGarmentAtom = atom(
  undefined,
  async (_get, _set, garment: Garment) => {
    await db.garments.put(garment);
    await db.syncQueue.add({
      type: SYNC_ACTION_TYPE.GARMENT_UPDATE,
      payload: garment,
      createdAt: Date.now(),
    });
  },
);

export const deleteGarmentAtom = atom(
  undefined,
  async (_get, _set, id: string) => {
    await db.garments.delete(id);
    await db.syncQueue.add({
      type: SYNC_ACTION_TYPE.GARMENT_DELETE,
      payload: { id },
      createdAt: Date.now(),
    });
  },
);

export const confirmAllGarmentsAtom = atom(
  undefined,
  async (_get, _set, locationId: string) => {
    const now = Date.now();
    const garments = await db.garments
      .where("locationId")
      .equals(locationId)
      .toArray();

    const storedGarments = garments.filter(
      (g) => g.status === GARMENT_STATUS.STORED,
    );

    await db.garments.bulkPut(
      storedGarments.map((g) => ({ ...g, lastScannedAt: now, updatedAt: now })),
    );
    await db.syncQueue.bulkAdd(
      storedGarments.map((g) => ({
        type: SYNC_ACTION_TYPE.GARMENT_UPDATE,
        payload: { ...g, lastScannedAt: now, updatedAt: now },
        createdAt: now,
      })),
    );
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

    const confirmedGarments = await db.garments
      .where("id")
      .anyOf(confirmedIds)
      .toArray();

    await db.garments.bulkPut(
      confirmedGarments.map((g) => ({
        ...g,
        lastScannedAt: now,
        updatedAt: now,
      })),
    );
    await db.syncQueue.bulkAdd(
      confirmedGarments.map((g) => ({
        type: SYNC_ACTION_TYPE.GARMENT_UPDATE,
        payload: { ...g, lastScannedAt: now, updatedAt: now },
        createdAt: now,
      })),
    );

    const deniedGarments = await db.garments
      .where("id")
      .anyOf(deniedIds)
      .toArray();

    await db.garments.bulkPut(
      deniedGarments.map((g) => ({
        ...g,
        status: GARMENT_STATUS.CHECKED_OUT,
        locationId: undefined,
        checkedOutAt: now,
        updatedAt: now,
      })),
    );
    await db.syncQueue.bulkAdd(
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
