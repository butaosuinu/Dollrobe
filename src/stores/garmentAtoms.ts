import { atom } from "jotai";
import { getDb } from "@/lib/db/dexie";
import { GARMENT_STATUS, SYNC_ACTION_TYPE } from "@/lib/constants";
import { ssrSuspend } from "@/lib/suspense-never";
import type { Garment, ScanConfirmation } from "@/types";

const garmentsRefreshTriggerAtom = atom(0);

export const garmentsAtom = atom(async (get) =>
  typeof indexedDB === "undefined"
    ? await ssrSuspend([] satisfies Garment[])
    : (get(garmentsRefreshTriggerAtom), await getDb().garments.toArray()),
);

export const refreshGarmentsAtom = atom(undefined, (_get, set) => {
  set(garmentsRefreshTriggerAtom, (prev) => prev + 1);
});

export const activeGarmentsAtom = atom(async (get) => {
  const garments = await get(garmentsAtom);
  return garments.filter((g) => g.archivedAt === undefined);
});

export const addGarmentAtom = atom(
  undefined,
  async (_get, set, garment: Garment) => {
    await getDb().garments.add(garment);
    await getDb().syncQueue.add({
      type: SYNC_ACTION_TYPE.GARMENT_CREATE,
      payload: garment,
      createdAt: Date.now(),
    });
    set(refreshGarmentsAtom);
  },
);

export const updateGarmentAtom = atom(
  undefined,
  async (_get, set, garment: Garment) => {
    await getDb().garments.put(garment);
    await getDb().syncQueue.add({
      type: SYNC_ACTION_TYPE.GARMENT_UPDATE,
      payload: garment,
      createdAt: Date.now(),
    });
    set(refreshGarmentsAtom);
  },
);

export const deleteGarmentAtom = atom(
  undefined,
  async (_get, set, id: string) => {
    await getDb().garments.delete(id);
    await getDb().syncQueue.add({
      type: SYNC_ACTION_TYPE.GARMENT_DELETE,
      payload: { id },
      createdAt: Date.now(),
    });
    set(refreshGarmentsAtom);
  },
);

export const restoreGarmentAtom = atom(
  undefined,
  async (_get, set, id: string) => {
    const now = Date.now();
    await getDb().garments.update(id, {
      archivedAt: undefined,
      updatedAt: now,
    });
    const updated = await getDb().garments.get(id);
    await (updated === undefined
      ? Promise.resolve()
      : getDb().syncQueue.add({
          type: SYNC_ACTION_TYPE.GARMENT_UPDATE,
          payload: updated,
          createdAt: now,
        }));
    set(refreshGarmentsAtom);
  },
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
