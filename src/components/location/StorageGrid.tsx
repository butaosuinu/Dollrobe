"use client";

import { useEffect, useRef, useState } from "react";
import { useSetAtom } from "jotai";
import { Pencil } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import type { Garment, StorageCase, StorageLocation } from "@/types";
import { GARMENT_STATUS } from "@/lib/constants";
import { updateStorageLocationAtom } from "@/stores/locationAtoms";
import { confirmAllByMemoryAtom } from "@/stores/garmentAtoms";
import StorageCell from "@/components/location/StorageCell";
import StorageLocationEditForm from "@/components/location/StorageLocationEditForm";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import GarmentList from "@/components/garment/GarmentList";

type Props = {
  readonly storageCase: StorageCase;
  readonly locations: readonly StorageLocation[];
  readonly garments: readonly Garment[];
  readonly initialSelectedLocationId?: string;
};

const useInitialLocationSelection = ({
  locations,
  initialSelectedLocationId,
  onSelect,
}: {
  readonly locations: readonly StorageLocation[];
  readonly initialSelectedLocationId: string | undefined;
  readonly onSelect: (location: StorageLocation) => void;
}) => {
  const appliedRef = useRef(false);
  useEffect(() => {
    const shouldSkip =
      appliedRef.current || initialSelectedLocationId === undefined;
    const target = shouldSkip
      ? undefined
      : locations.find((l) => l.id === initialSelectedLocationId);
    if (target !== undefined) {
      onSelect(target);
      appliedRef.current = true;
    }
  }, [initialSelectedLocationId, locations, onSelect]);
};

type SelectedLocationSheetProps = {
  readonly storageCase: StorageCase;
  readonly location: StorageLocation;
  readonly garments: readonly Garment[];
  readonly onClose: () => void;
  readonly onEdit: () => void;
};

const SelectedLocationSheet = ({
  storageCase,
  location,
  garments,
  onClose,
  onEdit,
}: SelectedLocationSheetProps) => {
  const confirmByMemory = useSetAtom(confirmAllByMemoryAtom);
  const displayName = location.customName ?? location.label;
  const hasStoredGarments = garments.some(
    (g) => g.status === GARMENT_STATUS.STORED && g.archivedAt === undefined,
  );

  const handleMemoryConfirm = async () => {
    await confirmByMemory(location.id);
    onClose();
  };

  return (
    <BottomSheet
      isOpen
      onClose={onClose}
      title={`${storageCase.name} - ${displayName}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          {location.description !== undefined && (
            <p className="text-xs text-text-tertiary">{location.description}</p>
          )}
        </div>
        <IconButton icon={Pencil} label={t`編集`} size="sm" onClick={onEdit} />
      </div>
      {garments.length > 0 ? (
        <GarmentList garments={garments} />
      ) : (
        <p className="py-8 text-center text-sm text-text-tertiary">
          <Trans>この場所には服がありません</Trans>
        </p>
      )}
      {hasStoredGarments && (
        <div className="mt-4 flex flex-col gap-2">
          <Button variant="secondary" fullWidth onClick={handleMemoryConfirm}>
            <Trans>今ここにいなくても確認</Trans>
          </Button>
          <p className="text-center text-xs text-text-tertiary">
            <Trans>QR 確認より信頼度は控えめに戻ります（約0.5）</Trans>
          </p>
        </div>
      )}
    </BottomSheet>
  );
};

const StorageGrid = ({
  storageCase,
  locations,
  garments,
  initialSelectedLocationId,
}: Props) => {
  const [selectedLocation, setSelectedLocation] = useState<
    StorageLocation | undefined
  >(undefined);
  const [editingLocation, setEditingLocation] = useState<
    StorageLocation | undefined
  >(undefined);
  const updateLocation = useSetAtom(updateStorageLocationAtom);

  useInitialLocationSelection({
    locations,
    initialSelectedLocationId,
    onSelect: setSelectedLocation,
  });

  const getGarmentsForLocation = (locationId: string) =>
    garments.filter((g) => g.locationId === locationId);

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

  const showSelectionSheet =
    selectedLocation !== undefined && editingLocation === undefined;

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

      {showSelectionSheet && selectedLocation !== undefined && (
        <SelectedLocationSheet
          storageCase={storageCase}
          location={selectedLocation}
          garments={getGarmentsForLocation(selectedLocation.id)}
          onClose={() => setSelectedLocation(undefined)}
          onEdit={() => setEditingLocation(selectedLocation)}
        />
      )}

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
