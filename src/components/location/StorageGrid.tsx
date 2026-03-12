"use client";

import { useState } from "react";
import type { Garment, StorageCase, StorageLocation } from "@/types";
import StorageCell from "@/components/location/StorageCell";
import BottomSheet from "@/components/ui/BottomSheet";
import GarmentList from "@/components/garment/GarmentList";

type Props = {
  readonly storageCase: StorageCase;
  readonly locations: readonly StorageLocation[];
  readonly garments: readonly Garment[];
};

const StorageGrid = ({ storageCase, locations, garments }: Props) => {
  const [selectedLocation, setSelectedLocation] = useState<StorageLocation | undefined>(undefined);

  const getGarmentsForLocation = (locationId: string) =>
    garments.filter((g) => g.locationId === locationId);

  const selectedGarments =
    selectedLocation !== undefined ? getGarmentsForLocation(selectedLocation.id) : [];

  return (
    <>
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${storageCase.cols}, 1fr)`,
        }}
      >
        {[...locations]
          .sort((a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col))
          .map((location) => (
            <StorageCell
              key={location.id}
              location={location}
              garments={getGarmentsForLocation(location.id)}
              onClick={() => setSelectedLocation(location)}
            />
          ))}
      </div>

      <BottomSheet
        isOpen={selectedLocation !== undefined}
        onClose={() => setSelectedLocation(undefined)}
        title={
          selectedLocation !== undefined
            ? `${storageCase.name} - ${selectedLocation.label}`
            : undefined
        }
      >
        {selectedGarments.length > 0 ? (
          <GarmentList garments={selectedGarments} />
        ) : (
          <p className="py-8 text-center text-sm text-text-tertiary">この場所には服がありません</p>
        )}
      </BottomSheet>
    </>
  );
};

export default StorageGrid;
