import { atom } from "jotai";
import { db } from "@/lib/db/dexie";
import type { Garment } from "@/types";

export const garmentsAtom = atom(async () => {
  const garments = await db.garments.toArray();
  return garments;
});

export const addGarmentAtom = atom(
  undefined,
  async (_get, _set, garment: Garment) => {
    await db.garments.add(garment);
    await db.syncQueue.add({
      type: "garment:create",
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
      type: "garment:update",
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
      type: "garment:delete",
      payload: { id },
      createdAt: Date.now(),
    });
  },
);
