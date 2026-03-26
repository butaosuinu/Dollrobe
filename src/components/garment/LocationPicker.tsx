"use client";

import { useState } from "react";
import { useAtomValue } from "jotai";
import { ArrowLeft, MapPinOff, Package } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { storageCasesAtom, storageLocationsAtom } from "@/stores/locationAtoms";
import { garmentsAtom } from "@/stores/garmentAtoms";
import type { Garment, StorageCase, StorageLocation } from "@/types";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import StorageCell from "@/components/location/StorageCell";

type Props = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSelect: (locationId: string | undefined) => void;
  readonly currentLocationId: string | undefined;
};

type CaseListProps = {
  readonly cases: readonly StorageCase[];
  readonly onSelectCase: (c: StorageCase) => void;
};

const CaseList = ({ cases, onSelectCase }: CaseListProps) => (
  <div className="flex flex-col gap-2">
    {cases.map((c) => (
      <button
        key={c.id}
        onClick={() => onSelectCase(c)}
        className="flex items-center gap-3 rounded-lg border border-border-default bg-surface-overlay p-3 text-left transition-colors hover:bg-primary-50 active:bg-primary-100"
      >
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary-50">
          <Package className="size-5 text-primary-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">{c.name}</p>
          <p className="text-xs text-text-tertiary">
            {c.rows} × {c.cols}
          </p>
        </div>
      </button>
    ))}
  </div>
);

type LocationGridProps = {
  readonly storageCase: StorageCase;
  readonly locations: readonly StorageLocation[];
  readonly garments: readonly Garment[];
  readonly currentLocationId: string | undefined;
  readonly showBackButton: boolean;
  readonly onBack: () => void;
  readonly onSelect: (locationId: string) => void;
};

const LocationGrid = ({
  storageCase,
  locations,
  garments,
  currentLocationId,
  showBackButton,
  onBack,
  onSelect,
}: LocationGridProps) => {
  const getGarmentsForLocation = (locationId: string) =>
    garments.filter((g) => g.locationId === locationId);

  return (
    <div className="flex flex-col gap-3">
      {showBackButton && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-primary-500"
        >
          <ArrowLeft className="size-4" />
          <Trans>ケース一覧</Trans>
        </button>
      )}

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
                onClick={() => onSelect(location.id)}
                isSelected={location.id === currentLocationId}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

const LocationPicker = ({
  isOpen,
  onClose,
  onSelect,
  currentLocationId,
}: Props) => {
  const cases = useAtomValue(storageCasesAtom);
  const locations = useAtomValue(storageLocationsAtom);
  const garments = useAtomValue(garmentsAtom);
  const [selectedCase, setSelectedCase] = useState<StorageCase | undefined>(
    undefined,
  );

  const handleClose = () => {
    setSelectedCase(undefined);
    onClose();
  };

  const handleSelect = (locationId: string | undefined) => {
    setSelectedCase(undefined);
    onSelect(locationId);
  };

  const activeCase = cases.length === 1 ? cases[0] : selectedCase;

  const activeLocations =
    activeCase !== undefined
      ? locations.filter((l) => l.caseId === activeCase.id)
      : [];

  const title =
    activeCase !== undefined && cases.length > 1
      ? activeCase.name
      : t`収納場所を選択`;

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title={title}>
      {cases.length === 0 && (
        <EmptyState
          icon={Package}
          title={t`収納場所がありません`}
          description={t`先に収納場所を作成してください`}
        />
      )}

      {cases.length > 1 && activeCase === undefined && (
        <CaseList cases={cases} onSelectCase={setSelectedCase} />
      )}

      {activeCase !== undefined && (
        <LocationGrid
          storageCase={activeCase}
          locations={activeLocations}
          garments={garments}
          currentLocationId={currentLocationId}
          showBackButton={cases.length > 1}
          onBack={() => setSelectedCase(undefined)}
          onSelect={handleSelect}
        />
      )}

      {currentLocationId !== undefined && (
        <div className="mt-4 border-t border-border-default pt-4">
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={() => handleSelect(undefined)}
          >
            <MapPinOff className="size-4" />
            <Trans>未配置にする</Trans>
          </Button>
        </div>
      )}
    </BottomSheet>
  );
};

export default LocationPicker;
