import type { ConfidenceLabel, Garment } from "@/types";
import {
  CONFIDENCE_THRESHOLD,
  MS_PER_DAY,
  ORPHAN_CHECKOUT_THRESHOLD_DAYS,
} from "@/lib/constants";

export const getConfidence = (g: Garment): number =>
  g.status === "stored"
    ? Math.max(
        0,
        1 - (Date.now() - g.lastScannedAt) / MS_PER_DAY / g.confidenceDecayDays,
      )
    : 0;

export const getConfidenceLabel = (c: number): ConfidenceLabel =>
  c >= CONFIDENCE_THRESHOLD.CONFIRMED
    ? "confirmed"
    : c >= CONFIDENCE_THRESHOLD.UNCERTAIN
      ? "uncertain"
      : "unknown";

export const getItemsNeedingReview = (
  garments: readonly Garment[],
  locationId: string,
): readonly Garment[] =>
  garments.filter(
    (g) =>
      g.locationId === locationId &&
      g.status === "stored" &&
      getConfidence(g) < CONFIDENCE_THRESHOLD.CONFIRMED,
  );

export const getOrphanedCheckouts = (
  garments: readonly Garment[],
  thresholdDays: number = ORPHAN_CHECKOUT_THRESHOLD_DAYS,
): readonly Garment[] =>
  garments.filter(
    (g) =>
      g.status === "checked_out" &&
      g.checkedOutAt !== undefined &&
      (Date.now() - g.checkedOutAt) / MS_PER_DAY >= thresholdDays,
  );
