"use client";

import { Trans } from "@lingui/react/macro";
import { getConfidence, getConfidenceLabel } from "@/lib/confidence";
import ConfidenceBar from "@/components/confidence/ConfidenceBar";
import ConfidenceBadge from "@/components/confidence/ConfidenceBadge";
import Button from "@/components/ui/Button";
import type { Garment } from "@/types";

type ReviewMode = "overview" | "individual";

type Props = {
  readonly garment: Garment;
  readonly mode: ReviewMode;
  readonly lastLocationVisitedAt?: number;
  readonly isConfirmed?: boolean;
  readonly onToggle?: (garmentId: string, confirmed: boolean) => void;
};

const ReviewItemRow = ({
  garment,
  mode,
  lastLocationVisitedAt,
  isConfirmed,
  onToggle,
}: Props) => {
  const confidence = getConfidence({ ...garment, lastLocationVisitedAt });
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
          <Button
            variant={isConfirmed === true ? "primary" : "secondary"}
            size="sm"
            fullWidth
            aria-pressed={isConfirmed === true}
            onClick={() => onToggle(garment.id, true)}
          >
            <Trans>ある</Trans>
          </Button>
          <Button
            variant={isConfirmed === false ? "danger-solid" : "danger"}
            size="sm"
            fullWidth
            aria-pressed={isConfirmed === false}
            onClick={() => onToggle(garment.id, false)}
          >
            <Trans>ない</Trans>
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReviewItemRow;
