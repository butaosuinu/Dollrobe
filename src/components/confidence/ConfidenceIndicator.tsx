"use client";

import { useAtomValue } from "jotai";
import type { Garment } from "@/types";
import { getConfidence, getConfidenceLabel } from "@/lib/confidence";
import { formatRelativeDays } from "@/lib/formatDate";
import { localeAtom } from "@/i18n/localeAtom";
import ConfidenceBadge from "@/components/confidence/ConfidenceBadge";
import ConfidenceBar from "@/components/confidence/ConfidenceBar";

type Props = {
  readonly garment: Garment;
  readonly compact?: boolean;
};

const ConfidenceIndicator = ({ garment, compact = false }: Props) => {
  const confidence = getConfidence(garment);
  const label = getConfidenceLabel(confidence);
  const locale = useAtomValue(localeAtom);

  if (compact) {
    return <ConfidenceBadge label={label} />;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <ConfidenceBadge label={label} />
        <span className="text-xs text-text-tertiary">
          {formatRelativeDays({ timestamp: garment.lastScannedAt, locale })}
        </span>
      </div>
      <ConfidenceBar confidence={confidence} />
    </div>
  );
};

export default ConfidenceIndicator;
