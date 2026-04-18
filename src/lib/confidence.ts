import type { ConfidenceLabel, GarmentStatus } from "@/types";
import {
  CHECKOUT_ACTIVITY_THRESHOLD,
  CONFIDENCE_THRESHOLD,
  DECAY_DAYS_BY_ACTIVITY,
  GARMENT_STATUS,
  LOCATION_VISIT_BOOST_MAX,
  LOCATION_VISIT_DECAY_DAYS,
  MS_PER_DAY,
  ORPHAN_CHECKOUT_THRESHOLD_DAYS,
} from "@/lib/constants";

export type ConfidenceInput = {
  readonly lastScannedAt: number;
  readonly confidenceDecayDays: number;
  readonly status: GarmentStatus;
  readonly recentCheckoutCount?: number;
  readonly confidenceDecayDaysOverride?: number;
  readonly lastLocationVisitedAt?: number;
  readonly locationStabilityScore?: number;
};

export const estimateDecayDays = (recentCheckoutCount: number): number =>
  recentCheckoutCount >= CHECKOUT_ACTIVITY_THRESHOLD.HIGH
    ? DECAY_DAYS_BY_ACTIVITY.HIGH
    : recentCheckoutCount >= CHECKOUT_ACTIVITY_THRESHOLD.MEDIUM
      ? DECAY_DAYS_BY_ACTIVITY.MEDIUM
      : recentCheckoutCount >= CHECKOUT_ACTIVITY_THRESHOLD.LOW
        ? DECAY_DAYS_BY_ACTIVITY.LOW
        : DECAY_DAYS_BY_ACTIVITY.NONE;

export type EffectiveDecayDaysInput = {
  readonly recentCheckoutCount: number;
  readonly confidenceDecayDaysOverride: number | undefined;
};

export const getEffectiveDecayDays = ({
  recentCheckoutCount,
  confidenceDecayDaysOverride,
}: EffectiveDecayDaysInput): number =>
  confidenceDecayDaysOverride ?? estimateDecayDays(recentCheckoutCount);

const resolveDecayDays = (input: ConfidenceInput): number =>
  input.recentCheckoutCount === undefined
    ? input.confidenceDecayDays
    : getEffectiveDecayDays({
        recentCheckoutCount: input.recentCheckoutCount,
        confidenceDecayDaysOverride: input.confidenceDecayDaysOverride,
      });

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
              resolveDecayDays(input),
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
  lastLocationVisitedAt?: number,
): readonly T[] =>
  garments.filter(
    (g) =>
      g.locationId === locationId &&
      g.status === GARMENT_STATUS.STORED &&
      getConfidence({ ...g, lastLocationVisitedAt }) <
        CONFIDENCE_THRESHOLD.CONFIRMED,
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
