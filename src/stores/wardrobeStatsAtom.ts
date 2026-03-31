import { atom } from "jotai";
import { activeGarmentsAtom } from "@/stores/garmentAtoms";
import { computeWardrobeStats } from "@/lib/wardrobe-stats";

export const wardrobeStatsAtom = atom(async (get) => {
  const garments = await get(activeGarmentsAtom);
  return computeWardrobeStats(garments);
});
