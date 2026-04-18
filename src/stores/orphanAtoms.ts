import { atom } from "jotai";
import { activeGarmentsAtom, updateGarmentAtom } from "@/stores/garmentAtoms";
import { GARMENT_STATUS } from "@/lib/constants";

export const resolveStillUsingAtom = atom(
  undefined,
  async (get, set, garmentId: string) => {
    const garments = await get(activeGarmentsAtom);
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
    const garments = await get(activeGarmentsAtom);
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
