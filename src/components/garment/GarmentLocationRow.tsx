"use client";

import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { MapPin } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import type { Garment, StorageLocation } from "@/types";
import { GARMENT_STATUS, REVIEW_THRESHOLD_DEFAULT } from "@/lib/constants";
import {
  activeGarmentsAtom,
  confirmAllGarmentsAtom,
  updateGarmentAtom,
} from "@/stores/garmentAtoms";
import { storageCasesAtom, storageLocationsAtom } from "@/stores/locationAtoms";
import {
  getItemsNeedingReview,
  getLocationStabilityScore,
  getReviewThreshold,
} from "@/lib/confidence";
import Card from "@/components/ui/Card";
import LocationPicker from "@/components/garment/LocationPicker";
import CheckoutConfirmSheet from "@/components/scan/CheckoutConfirmSheet";

type Props = {
  readonly garment: Garment;
};

type CheckoutSheetState = {
  readonly locationId: string;
  readonly uncertainItemCount: number;
};

const computeCheckoutSheetState = ({
  prevLocationId,
  excludeGarmentId,
  allGarments,
  locations,
}: {
  readonly prevLocationId: string;
  readonly excludeGarmentId: string;
  readonly allGarments: readonly Garment[];
  readonly locations: readonly StorageLocation[];
}): CheckoutSheetState | undefined => {
  const prevLocation = locations.find((l) => l.id === prevLocationId);
  const otherItems = allGarments.filter(
    (g) =>
      g.id !== excludeGarmentId &&
      g.locationId === prevLocationId &&
      g.status === GARMENT_STATUS.STORED,
  );
  const threshold =
    prevLocation !== undefined
      ? getReviewThreshold(
          getLocationStabilityScore({
            confirmAllCount: prevLocation.confirmAllCount,
            correctionCount: prevLocation.correctionCount,
          }),
        )
      : REVIEW_THRESHOLD_DEFAULT;
  const needsReview = getItemsNeedingReview(otherItems, prevLocationId, {
    threshold,
    lastLocationVisitedAt: prevLocation?.lastVisitedAt,
  });
  return needsReview.length === 0
    ? undefined
    : {
        locationId: prevLocationId,
        uncertainItemCount: needsReview.length,
      };
};

const GarmentLocationRow = ({ garment }: Props) => {
  const updateGarment = useSetAtom(updateGarmentAtom);
  const confirmAll = useSetAtom(confirmAllGarmentsAtom);
  const cases = useAtomValue(storageCasesAtom);
  const locations = useAtomValue(storageLocationsAtom);
  const allGarments = useAtomValue(activeGarmentsAtom);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [checkoutSheet, setCheckoutSheet] = useState<
    CheckoutSheetState | undefined
  >(undefined);

  const currentLocation =
    garment.locationId !== undefined
      ? locations.find((l) => l.id === garment.locationId)
      : undefined;
  const currentCase =
    currentLocation !== undefined
      ? cases.find((c) => c.id === currentLocation.caseId)
      : undefined;
  const locationLabel =
    currentCase !== undefined && currentLocation !== undefined
      ? `${currentCase.name} - ${currentLocation.label}`
      : undefined;

  const handleLocationChange = async (locationId: string | undefined) => {
    const now = Date.now();
    const prevLocationId = garment.locationId;
    const isCheckout =
      garment.status === GARMENT_STATUS.STORED &&
      locationId === undefined &&
      prevLocationId !== undefined;

    await updateGarment({
      ...garment,
      locationId,
      status:
        locationId !== undefined
          ? GARMENT_STATUS.STORED
          : GARMENT_STATUS.CHECKED_OUT,
      lastScannedAt: locationId !== undefined ? now : garment.lastScannedAt,
      checkedOutAt: locationId === undefined ? now : undefined,
      updatedAt: now,
    });
    setIsPickerOpen(false);

    if (isCheckout && prevLocationId !== undefined) {
      const nextSheet = computeCheckoutSheetState({
        prevLocationId,
        excludeGarmentId: garment.id,
        allGarments,
        locations,
      });
      if (nextSheet !== undefined) {
        setCheckoutSheet(nextSheet);
      }
    }
  };

  const handleConfirmAll = async () => {
    if (checkoutSheet === undefined) return;
    await confirmAll(checkoutSheet.locationId);
  };

  const handleSheetClose = () => {
    setCheckoutSheet(undefined);
  };

  return (
    <>
      <Card>
        <button
          onClick={() => setIsPickerOpen(true)}
          className="flex w-full items-center gap-3"
        >
          <MapPin className="size-5 shrink-0 text-primary-400" />
          <span
            className={
              locationLabel !== undefined
                ? "flex-1 text-left text-sm text-text-primary"
                : "flex-1 text-left text-sm text-text-tertiary"
            }
          >
            {locationLabel ?? <Trans>未配置</Trans>}
          </span>
          <span className="shrink-0 text-sm text-primary-500">
            {locationLabel !== undefined ? (
              <Trans>変更</Trans>
            ) : (
              <Trans>場所を設定</Trans>
            )}
          </span>
        </button>
      </Card>

      <LocationPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleLocationChange}
        currentLocationId={garment.locationId}
      />

      <CheckoutConfirmSheet
        isOpen={checkoutSheet !== undefined}
        onClose={handleSheetClose}
        uncertainItemCount={checkoutSheet?.uncertainItemCount ?? 0}
        onConfirmAll={handleConfirmAll}
      />
    </>
  );
};

export default GarmentLocationRow;
