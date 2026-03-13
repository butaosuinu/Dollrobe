"use client";

import type { Garment } from "@/types";
import {
  getConfidence,
  getConfidenceLabel,
  getElapsedDays,
} from "@/lib/confidence";
import ConfidenceBadge from "@/components/confidence/ConfidenceBadge";
import ConfidenceBar from "@/components/confidence/ConfidenceBar";

type Props = {
  readonly garment: Garment;
  readonly compact?: boolean;
};

const ConfidenceIndicator = ({ garment, compact = false }: Props) => {
  const confidence = getConfidence(garment);
  const label = getConfidenceLabel(confidence);
  const elapsedDays = getElapsedDays(garment.lastScannedAt);

  if (compact) {
    return <ConfidenceBadge label={label} />;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <ConfidenceBadge label={label} />
        <span className="text-xs text-text-tertiary">
          最終スキャンから {elapsedDays}日
        </span>
      </div>
      <ConfidenceBar confidence={confidence} />
    </div>
  );
};

export default ConfidenceIndicator;
