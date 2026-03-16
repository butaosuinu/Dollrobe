import { atom } from "jotai";
import { garmentsAtom, updateGarmentAtom } from "@/stores/garmentAtoms";
import { getOrphanedCheckouts } from "@/lib/confidence";
import { GARMENT_STATUS } from "@/lib/constants";

export const orphanedCheckoutsAtom = atom(async (get) => {
  const garments = await get(garmentsAtom);
  return getOrphanedCheckouts(garments);
});

export const resolveStillUsingAtom = atom(
  undefined,
  async (get, set, garmentId: string) => {
    const garments = await get(garmentsAtom);
    const now = Date.now();
    await Promise.all(
      garments
        .filter((g) => g.id === garmentId)
        .map(async (garment) => {
          await set(updateGarmentAtom, {
            ...garment,
            checkedOutAt: now,
            updatedAt: now,
          });
        }),
    );
  },
);

export const resolveLostAtom = atom(
  undefined,
  async (get, set, garmentId: string) => {
    const garments = await get(garmentsAtom);
    const now = Date.now();
    await Promise.all(
      garments
        .filter((g) => g.id === garmentId)
        .map(async (garment) => {
          await set(updateGarmentAtom, {
            ...garment,
            status: GARMENT_STATUS.LOST,
            locationId: undefined,
            checkedOutAt: undefined,
            updatedAt: now,
          });
        }),
    );
  },
);
