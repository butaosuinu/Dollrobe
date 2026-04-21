"use client";

import { useAtomValue } from "jotai";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { wardrobeStatsAtom } from "@/stores/wardrobeStatsAtom";
import Card from "@/components/ui/Card";

const StatsOverview = () => {
  const { i18n } = useLingui();
  const stats = useAtomValue(wardrobeStatsAtom);

  const items = [
    {
      label: msg`合計`,
      value: stats.totalCount,
      accent: "bg-primary-50 text-primary-700",
    },
    {
      label: msg`確定`,
      value: stats.confirmedCount,
      accent: "bg-emerald-50 text-emerald-700",
    },
    {
      label: msg`要確認`,
      value: stats.needsReviewCount,
      accent: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <section>
      <h2 className="mb-3 font-display text-sm font-bold text-text-secondary">
        <Trans>ステータス</Trans>
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {items.map(({ label, value, accent }) => (
          <Card key={i18n._(label)} className={accent}>
            <p className="text-xs font-medium opacity-70">{i18n._(label)}</p>
            <p className="font-display text-2xl font-bold">{value}</p>
            <p className="text-[10px] opacity-50">
              <Trans>着</Trans>
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default StatsOverview;
