import clsx from "clsx";
import { Trans } from "@lingui/react/macro";
import type { Garment, StorageLocation } from "@/types";
import { getConfidence, getConfidenceLabel } from "@/lib/confidence";
import { GARMENT_STATUS } from "@/lib/constants";

type Props = {
  readonly location: StorageLocation;
  readonly garments: readonly Garment[];
  readonly onClick: () => void;
};

const getWorstConfidence = (
  garments: readonly Garment[],
): "confirmed" | "uncertain" | "unknown" | "empty" => {
  if (garments.length === 0) return "empty";

  const stored = garments.filter((g) => g.status === GARMENT_STATUS.STORED);
  if (stored.length === 0) return "empty";

  const worstConfidence = Math.min(...stored.map((g) => getConfidence(g)));
  return getConfidenceLabel(worstConfidence);
};

const CELL_BG = {
  confirmed: "bg-emerald-50 border-emerald-200",
  uncertain: "bg-amber-50 border-amber-200",
  unknown: "bg-orange-50 border-orange-200",
  empty: "bg-surface-raised border-border-default",
} as const;

const StorageCell = ({ location, garments, onClick }: Props) => {
  const status = getWorstConfidence(garments);

  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex flex-col items-center justify-center rounded-lg border p-2 transition-all",
        "hover:shadow-sm active:scale-95",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
        CELL_BG[status],
      )}
    >
      <span className="text-xs font-bold text-text-primary">
        {location.label}
      </span>
      {garments.length > 0 && (
        <span className="mt-0.5 text-[10px] text-text-secondary">
          <Trans>{garments.length}着</Trans>
        </span>
      )}
    </button>
  );
};

export default StorageCell;
