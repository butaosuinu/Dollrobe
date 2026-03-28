"use client";

import { useState } from "react";
import { useSetAtom } from "jotai";
import { Pencil } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import type { Garment, StorageCase, StorageLocation } from "@/types";
import { updateStorageLocationAtom } from "@/stores/locationAtoms";
import StorageCell from "@/components/location/StorageCell";
import StorageLocationEditForm from "@/components/location/StorageLocationEditForm";
import BottomSheet from "@/components/ui/BottomSheet";
import IconButton from "@/components/ui/IconButton";
import GarmentList from "@/components/garment/GarmentList";

type Props = {
  readonly storageCase: StorageCase;
  readonly locations: readonly StorageLocation[];
  readonly garments: readonly Garment[];
};

const StorageGrid = ({ storageCase, locations, garments }: Props) => {
  const [selectedLocation, setSelectedLocation] = useState<
    StorageLocation | undefined
  >(undefined);
  const [editingLocation, setEditingLocation] = useState<
    StorageLocation | undefined
  >(undefined);
  const updateLocation = useSetAtom(updateStorageLocationAtom);

  const getGarmentsForLocation = (locationId: string) =>
    garments.filter((g) => g.locationId === locationId);

  const selectedGarments =
    selectedLocation !== undefined
      ? getGarmentsForLocation(selectedLocation.id)
      : [];

  const selectedDisplayName =
    selectedLocation !== undefined
      ? (selectedLocation.customName ?? selectedLocation.label)
      : undefined;

  const handleEditSubmit = async (input: {
    readonly customName: string | undefined;
    readonly description: string | undefined;
  }) => {
    if (editingLocation === undefined) return;
    await updateLocation({
      location: editingLocation,
      customName: input.customName,
      description: input.description,
    });
    setEditingLocation(undefined);
    setSelectedLocation(undefined);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${storageCase.cols}, minmax(48px, 1fr))`,
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
      </div>

      <BottomSheet
        isOpen={selectedLocation !== undefined && editingLocation === undefined}
        onClose={() => setSelectedLocation(undefined)}
        title={
          selectedLocation !== undefined
            ? `${storageCase.name} - ${selectedDisplayName}`
            : undefined
        }
      >
        {selectedLocation !== undefined && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <div>
                {selectedLocation.description !== undefined && (
                  <p className="text-xs text-text-tertiary">
                    {selectedLocation.description}
                  </p>
                )}
              </div>
              <IconButton
                icon={Pencil}
                label={t`編集`}
                size="sm"
                onClick={() => setEditingLocation(selectedLocation)}
              />
            </div>
            {selectedGarments.length > 0 ? (
              <GarmentList garments={selectedGarments} />
            ) : (
              <p className="py-8 text-center text-sm text-text-tertiary">
                <Trans>この場所には服がありません</Trans>
              </p>
            )}
          </>
        )}
      </BottomSheet>

      <BottomSheet
        isOpen={editingLocation !== undefined}
        onClose={() => setEditingLocation(undefined)}
        title={t`引き出しを編集`}
      >
        {editingLocation !== undefined && (
          <StorageLocationEditForm
            location={editingLocation}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditingLocation(undefined)}
          />
        )}
      </BottomSheet>
    </>
  );
};

export default StorageGrid;
