import type { ConfidenceLabel, GarmentStatus } from "@/types";
import {
  CONFIDENCE_THRESHOLD,
  GARMENT_STATUS,
  MS_PER_DAY,
  ORPHAN_CHECKOUT_THRESHOLD_DAYS,
} from "@/lib/constants";

export type ConfidenceInput = {
  readonly lastScannedAt: number;
  readonly confidenceDecayDays: number;
  readonly status: GarmentStatus;
  readonly lastLocationVisitedAt?: number;
  readonly locationStabilityScore?: number;
};

export const getConfidence = (input: ConfidenceInput): number =>
  input.status === GARMENT_STATUS.STORED
    ? Math.max(
        0,
        1 -
          (Date.now() - input.lastScannedAt) /
            MS_PER_DAY /
            input.confidenceDecayDays,
      )
    : 0;

export const getConfidenceLabel = (c: number): ConfidenceLabel =>
  c >= CONFIDENCE_THRESHOLD.CONFIRMED
    ? "confirmed"
    : c >= CONFIDENCE_THRESHOLD.UNCERTAIN
      ? "uncertain"
      : "unknown";

export const getItemsNeedingReview = <
  T extends ConfidenceInput & { readonly locationId: string | undefined },
>(
  garments: readonly T[],
  locationId: string,
): readonly T[] =>
  garments.filter(
    (g) =>
      g.locationId === locationId &&
      g.status === GARMENT_STATUS.STORED &&
      getConfidence(g) < CONFIDENCE_THRESHOLD.CONFIRMED,
  );

export const getElapsedDays = (lastScannedAt: number): number =>
  Math.floor((Date.now() - lastScannedAt) / MS_PER_DAY);

export const getOrphanedCheckouts = <
  T extends {
    readonly status: GarmentStatus;
    readonly checkedOutAt: number | undefined;
  },
>(
  garments: readonly T[],
  thresholdDays: number = ORPHAN_CHECKOUT_THRESHOLD_DAYS,
): readonly T[] =>
  garments.filter(
    (g) =>
      g.status === GARMENT_STATUS.CHECKED_OUT &&
      g.checkedOutAt !== undefined &&
      (Date.now() - g.checkedOutAt) / MS_PER_DAY >= thresholdDays,
  );
