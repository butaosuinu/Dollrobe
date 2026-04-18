import type { ConfidenceLabel, GarmentStatus } from "@/types";
import {
  CONFIDENCE_THRESHOLD,
  GARMENT_STATUS,
  LOCATION_VISIT_BOOST_MAX,
  LOCATION_VISIT_DECAY_DAYS,
  MS_PER_DAY,
  ORPHAN_CHECKOUT_THRESHOLD_DAYS,
  REVIEW_THRESHOLD_DEFAULT,
  REVIEW_THRESHOLD_STABLE,
  STABILITY_MIN_SAMPLE_SIZE,
  STABILITY_THRESHOLD,
} from "@/lib/constants";

export type ConfidenceInput = {
  readonly lastScannedAt: number;
  readonly confidenceDecayDays: number;
  readonly status: GarmentStatus;
  readonly lastLocationVisitedAt?: number;
  readonly locationStabilityScore?: number;
};

const getVisitBoost = (
  lastScannedAt: number,
  lastLocationVisitedAt: number | undefined,
): number =>
  lastLocationVisitedAt === undefined || lastLocationVisitedAt <= lastScannedAt
    ? 0
    : Math.max(
        0,
        LOCATION_VISIT_BOOST_MAX *
          (1 -
            (Date.now() - lastLocationVisitedAt) /
              MS_PER_DAY /
              LOCATION_VISIT_DECAY_DAYS),
      );

export const getConfidence = (input: ConfidenceInput): number =>
  input.status === GARMENT_STATUS.STORED
    ? Math.min(
        1,
        Math.max(
          0,
          1 -
            (Date.now() - input.lastScannedAt) /
              MS_PER_DAY /
              input.confidenceDecayDays,
        ) + getVisitBoost(input.lastScannedAt, input.lastLocationVisitedAt),
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
  options: {
    readonly threshold?: number;
    readonly lastLocationVisitedAt?: number;
  } = {},
): readonly T[] => {
  const threshold = options.threshold ?? REVIEW_THRESHOLD_DEFAULT;
  return garments.filter(
    (g) =>
      g.locationId === locationId &&
      g.status === GARMENT_STATUS.STORED &&
      getConfidence({
        ...g,
        lastLocationVisitedAt: options.lastLocationVisitedAt,
      }) < threshold,
  );
};

export const getLocationStabilityScore = ({
  confirmAllCount,
  correctionCount,
}: {
  readonly confirmAllCount: number;
  readonly correctionCount: number;
}): number => {
  const total = confirmAllCount + correctionCount;
  return total < STABILITY_MIN_SAMPLE_SIZE ? 0.5 : confirmAllCount / total;
};

export const getReviewThreshold = (stabilityScore: number): number =>
  stabilityScore >= STABILITY_THRESHOLD
    ? REVIEW_THRESHOLD_STABLE
    : REVIEW_THRESHOLD_DEFAULT;

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
