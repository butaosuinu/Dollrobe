import { atom } from "jotai";
import { storageCasesAtom, storageLocationsAtom } from "./locationAtoms";
import { garmentsAtom } from "./garmentAtoms";
import { getItemsNeedingReview } from "@/lib/confidence";
import { MS_PER_DAY } from "@/lib/constants";
import type { Garment, StorageCase, StorageLocation } from "@/types";

export const STALE_LOCATION_THRESHOLD_DAYS = 14;
export const STALE_LOCATION_MAX_DISPLAY = 3;

export type StaleLocation = {
  readonly locationId: string;
  readonly caseId: string;
  readonly locationLabel: string;
  readonly caseName: string;
  readonly uncertainItemCount: number;
  readonly daysSinceLastVisit: number;
  readonly neverVisited: boolean;
};

const toStaleLocation = ({
  location,
  storageCase,
  activeGarments,
  now,
}: {
  readonly location: StorageLocation;
  readonly storageCase: StorageCase;
  readonly activeGarments: readonly Garment[];
  readonly now: number;
}): StaleLocation | undefined => {
  const referenceAt = location.lastVisitedAt ?? location.createdAt;
  const daysSinceLastVisit = Math.floor((now - referenceAt) / MS_PER_DAY);
  const uncertainItemCount =
    daysSinceLastVisit < STALE_LOCATION_THRESHOLD_DAYS
      ? 0
      : getItemsNeedingReview(activeGarments, location.id, {
          lastLocationVisitedAt: location.lastVisitedAt,
        }).length;
  return daysSinceLastVisit >= STALE_LOCATION_THRESHOLD_DAYS &&
    uncertainItemCount > 0
    ? {
        locationId: location.id,
        caseId: location.caseId,
        locationLabel: location.customName ?? location.label,
        caseName: storageCase.name,
        uncertainItemCount,
        daysSinceLastVisit,
        neverVisited: location.lastVisitedAt === undefined,
      }
    : undefined;
};

export const staleLocationsSuspenseAtom = atom(
  async (get): Promise<readonly StaleLocation[]> => {
    const [cases, locations, garments] = await Promise.all([
      get(storageCasesAtom),
      get(storageLocationsAtom),
      get(garmentsAtom),
    ]);
    const now = Date.now();
    const caseById = new Map(cases.map((c) => [c.id, c]));
    const activeGarments = garments.filter((g) => g.archivedAt === undefined);

    const candidates = locations.flatMap((location) => {
      const storageCase = caseById.get(location.caseId);
      const stale =
        storageCase === undefined
          ? undefined
          : toStaleLocation({
              location,
              storageCase,
              activeGarments,
              now,
            });
      return stale === undefined ? [] : [stale];
    });

    return [...candidates]
      .sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit)
      .slice(0, STALE_LOCATION_MAX_DISPLAY);
  },
);
