"use client";

import { Trans } from "@lingui/react/macro";
import clsx from "clsx";
import { getConfidence, getConfidenceLabel } from "@/lib/confidence";
import ConfidenceBar from "@/components/confidence/ConfidenceBar";
import ConfidenceBadge from "@/components/confidence/ConfidenceBadge";
import type { Garment } from "@/types";

type ReviewMode = "overview" | "individual";

type Props = {
  readonly garment: Garment;
  readonly mode: ReviewMode;
  readonly isConfirmed?: boolean;
  readonly onToggle?: (garmentId: string, confirmed: boolean) => void;
};

const ReviewItemRow = ({ garment, mode, isConfirmed, onToggle }: Props) => {
  const confidence = getConfidence(garment);
  const label = getConfidenceLabel(confidence);

  return (
    <div className="flex flex-col gap-2 border-b border-border-default py-3 last:border-b-0">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{garment.name}</span>
        <ConfidenceBadge label={label} />
      </div>
      <ConfidenceBar confidence={confidence} />
      {mode === "individual" && onToggle !== undefined && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onToggle(garment.id, true)}
            className={clsx(
              "flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors",
              isConfirmed === true
                ? "bg-primary-500 text-text-inverse"
                : "bg-primary-50 text-text-secondary",
            )}
          >
            <Trans>ある</Trans>
          </button>
          <button
            type="button"
            onClick={() => onToggle(garment.id, false)}
            className={clsx(
              "flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors",
              isConfirmed === false
                ? "bg-red-500 text-white"
                : "bg-red-50 text-text-secondary",
            )}
          >
            <Trans>ない</Trans>
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewItemRow;
