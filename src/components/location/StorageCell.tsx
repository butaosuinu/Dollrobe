import clsx from "clsx";
import { Plural } from "@lingui/react/macro";
import type { Garment, StorageLocation } from "@/types";
import { getConfidence, getConfidenceLabel } from "@/lib/confidence";
import { GARMENT_STATUS } from "@/lib/constants";
import { FOCUS_RING_CLASS } from "@/lib/uiClasses";

type Props = {
  readonly location: StorageLocation;
  readonly garments: readonly Garment[];
  readonly onClick: () => void;
  readonly isSelected?: boolean;
};

const getWorstConfidence = (
  garments: readonly Garment[],
  lastLocationVisitedAt: number | undefined,
): "confirmed" | "uncertain" | "unknown" | "empty" => {
  if (garments.length === 0) return "empty";

  const stored = garments.filter((g) => g.status === GARMENT_STATUS.STORED);
  if (stored.length === 0) return "empty";

  const worstConfidence = Math.min(
    ...stored.map((g) => getConfidence({ ...g, lastLocationVisitedAt })),
  );
  return getConfidenceLabel(worstConfidence);
};

const CELL_BG = {
  confirmed: "bg-confirmed/10 border-confirmed/30",
  uncertain: "bg-uncertain/15 border-uncertain/40",
  unknown: "bg-unknown/10 border-unknown/30",
  empty: "bg-surface-raised border-border-default",
} as const;

const StorageCell = ({ location, garments, onClick, isSelected }: Props) => {
  const status = getWorstConfidence(garments, location.lastVisitedAt);
  const displayName = location.customName ?? location.label;

  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex flex-col items-center justify-center rounded-lg border p-2 transition-all",
        "hover:shadow-sm active:scale-95",
        FOCUS_RING_CLASS,
        CELL_BG[status],
        isSelected === true && "ring-2 ring-primary-500",
      )}
    >
      <span className="text-xs font-bold text-text-primary">{displayName}</span>
      {location.customName !== undefined && (
        <span className="text-[10px] text-text-tertiary">{location.label}</span>
      )}
      {garments.length > 0 && (
        <span className="mt-0.5 text-[10px] text-text-secondary">
          <Plural value={garments.length} one="#着" other="#着" />
        </span>
      )}
    </button>
  );
};

export default StorageCell;
