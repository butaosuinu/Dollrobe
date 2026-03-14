"use client";

import { Check, AlertTriangle, HelpCircle } from "lucide-react";
import { useLingui } from "@lingui/react";
import type { ConfidenceLabel } from "@/types";
import { CONFIDENCE_LABEL_TEXT } from "@/lib/constants";
import Badge from "@/components/ui/Badge";

type Props = {
  readonly label: ConfidenceLabel;
};

const ICON_MAP = {
  confirmed: Check,
  uncertain: AlertTriangle,
  unknown: HelpCircle,
} as const;

const VARIANT_MAP = {
  confirmed: "confirmed",
  uncertain: "uncertain",
  unknown: "unknown",
} as const;

const ConfidenceBadge = ({ label }: Props) => {
  const Icon = ICON_MAP[label];
  const { i18n } = useLingui();

  return (
    <Badge variant={VARIANT_MAP[label]}>
      <Icon className="size-3" />
      {i18n._(CONFIDENCE_LABEL_TEXT[label])}
    </Badge>
  );
};

export default ConfidenceBadge;
