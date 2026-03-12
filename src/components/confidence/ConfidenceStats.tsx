"use client";

import Card from "@/components/ui/Card";
import type { Garment } from "@/types";
import { getConfidence, getConfidenceLabel } from "@/lib/confidence";

type Props = {
  readonly garments: readonly Garment[];
};

const ConfidenceStats = ({ garments }: Props) => {
  const stored = garments.filter((g) => g.status === "stored");
  const counts = stored.reduce(
    (acc, g) => {
      const label = getConfidenceLabel(getConfidence(g));
      return { ...acc, [label]: acc[label] + 1 };
    },
    { confirmed: 0, uncertain: 0, unknown: 0 },
  );

  const stats = [
    {
      label: "合計",
      value: garments.length,
      accent: "bg-primary-50 text-primary-700",
    },
    {
      label: "確定",
      value: counts.confirmed,
      accent: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "要確認",
      value: counts.uncertain + counts.unknown,
      accent: "bg-amber-50 text-amber-700",
    },
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(({ label, value, accent }) => (
        <Card key={label} className={accent}>
          <p className="text-xs font-medium opacity-70">{label}</p>
          <p className="font-display text-2xl font-bold">{value}</p>
          <p className="text-[10px] opacity-50">着</p>
        </Card>
      ))}
    </div>
  );
};

export default ConfidenceStats;
