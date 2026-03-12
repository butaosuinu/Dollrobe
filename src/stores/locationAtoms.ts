import { atom } from "jotai";
import { db } from "@/lib/db/dexie";
import type { StorageCase, StorageLocation } from "@/types";

export const storageCasesAtom = atom(async () => {
  const cases = await db.storageCases.toArray();
  return cases;
});

export const storageLocationsAtom = atom(async () => {
  const locations = await db.storageLocations.toArray();
  return locations;
});

export const addStorageCaseAtom = atom(
  undefined,
  async (_get, _set, storageCase: StorageCase) => {
    await db.storageCases.add(storageCase);
    await db.syncQueue.add({
      type: "storageCase:create",
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
      type: "storageLocation:create",
      payload: location,
      createdAt: Date.now(),
    });
  },
);
