"use client";

import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { MapPin } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import type { Garment } from "@/types";
import { GARMENT_STATUS } from "@/lib/constants";
import { updateGarmentAtom } from "@/stores/garmentAtoms";
import { storageCasesAtom, storageLocationsAtom } from "@/stores/locationAtoms";
import Card from "@/components/ui/Card";
import LocationPicker from "@/components/garment/LocationPicker";

type Props = {
  readonly garment: Garment;
};

const GarmentLocationRow = ({ garment }: Props) => {
  const updateGarment = useSetAtom(updateGarmentAtom);
  const cases = useAtomValue(storageCasesAtom);
  const locations = useAtomValue(storageLocationsAtom);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

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
    </>
  );
};

export default GarmentLocationRow;
