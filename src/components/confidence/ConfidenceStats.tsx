"use client";

import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { useAtomValue } from "jotai";
import Card from "@/components/ui/Card";
import type { Garment } from "@/types";
import { getConfidence, getConfidenceLabel } from "@/lib/confidence";
import { storageLocationsAtom } from "@/stores/locationAtoms";

type Props = {
  readonly garments: readonly Garment[];
};

const ConfidenceStats = ({ garments }: Props) => {
  const { i18n } = useLingui();
  const locations = useAtomValue(storageLocationsAtom);
  const visitedAtById = new Map(locations.map((l) => [l.id, l.lastVisitedAt]));
  const stored = garments.filter((g) => g.status === "stored");
  const counts = stored.reduce(
    (acc, g) => {
      const lastLocationVisitedAt =
        g.locationId !== undefined
          ? visitedAtById.get(g.locationId)
          : undefined;
      const label = getConfidenceLabel(
        getConfidence({ ...g, lastLocationVisitedAt }),
      );
      return { ...acc, [label]: acc[label] + 1 };
    },
    { confirmed: 0, uncertain: 0, unknown: 0 },
  );

  const stats = [
    {
      label: msg`合計`,
      value: garments.length,
      accent: "bg-primary-50 text-primary-700",
    },
    {
      label: msg`確定`,
      value: counts.confirmed,
      accent: "bg-confirmed/10 text-success",
    },
    {
      label: msg`要確認`,
      value: counts.uncertain + counts.unknown,
      accent: "bg-uncertain/15 text-text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(({ label, value, accent }) => (
        <Card key={i18n._(label)} className={accent}>
          <p className="text-xs font-medium opacity-70">{i18n._(label)}</p>
          <p className="font-display text-2xl font-bold">{value}</p>
          <p className="text-[10px] opacity-50">
            <Trans>着</Trans>
          </p>
        </Card>
      ))}
    </div>
  );
};

export default ConfidenceStats;
