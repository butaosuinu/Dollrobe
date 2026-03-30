"use client";

import { useState, useMemo } from "react";
import { useAtomValue } from "jotai";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { activeGarmentsAtom } from "@/stores/garmentAtoms";
import {
  aggregateByCategory,
  aggregateByDollSize,
  aggregateByColor,
  aggregateByBrand,
} from "@/lib/wardrobe-analytics";
import {
  GARMENT_CATEGORY_LABEL,
  DOLL_SIZE_LABEL,
  COLOR_NAME_LABEL,
} from "@/lib/i18n-labels";
import Card from "@/components/ui/Card";
import ChipGroup from "@/components/ui/ChipGroup";
import HorizontalBarChart from "@/components/chart/HorizontalBarChart";
import type { BarItem } from "@/components/chart/HorizontalBarChart";

type AnalyticsTab = "category" | "size" | "color" | "brand";

const TAB_OPTIONS: ReadonlyArray<{
  readonly value: AnalyticsTab;
  readonly label: React.ReactNode;
}> = [
  { value: "category", label: <Trans>カテゴリ</Trans> },
  { value: "size", label: <Trans>サイズ</Trans> },
  { value: "color", label: <Trans>カラー</Trans> },
  { value: "brand", label: <Trans>ブランド</Trans> },
];

const WardrobeAnalytics = () => {
  const garments = useAtomValue(activeGarmentsAtom);
  const { i18n } = useLingui();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("category");

  const categoryItems: readonly BarItem[] = useMemo(
    () =>
      aggregateByCategory(garments).map((c) => ({
        label: i18n._(GARMENT_CATEGORY_LABEL[c.category]),
        value: c.count,
      })),
    [garments, i18n],
  );

  const sizeItems: readonly BarItem[] = useMemo(
    () =>
      aggregateByDollSize(garments).map((s) => ({
        label: i18n._(DOLL_SIZE_LABEL[s.dollSize]),
        value: s.count,
      })),
    [garments, i18n],
  );

  const colorItems: readonly BarItem[] = useMemo(
    () =>
      aggregateByColor(garments).map((c) => ({
        label: i18n._(COLOR_NAME_LABEL[c.colorName]),
        value: c.count,
        swatch: c.hsl,
      })),
    [garments, i18n],
  );

  const brandItems: readonly BarItem[] = useMemo(
    () =>
      aggregateByBrand({ garments }).map((b) => ({
        label: b.brand,
        value: b.count,
      })),
    [garments],
  );

  if (garments.length === 0) return undefined;

  const chartMap: Record<AnalyticsTab, readonly BarItem[]> = {
    category: categoryItems,
    size: sizeItems,
    color: colorItems,
    brand: brandItems,
  };

  const currentItems = chartMap[activeTab];

  return (
    <section>
      <h2 className="mb-3 font-display text-sm font-bold text-text-secondary">
        <Trans>ワードローブ分析</Trans>
      </h2>
      <Card>
        <div className="mb-4">
          <ChipGroup
            options={TAB_OPTIONS}
            value={activeTab}
            onSelect={setActiveTab}
          />
        </div>
        {currentItems.length > 0 ? (
          <HorizontalBarChart items={currentItems} />
        ) : (
          <p className="py-4 text-center text-xs text-text-tertiary">
            <Trans>データがありません</Trans>
          </p>
        )}
      </Card>
    </section>
  );
};

export default WardrobeAnalytics;
