"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { Plus, Search, Shirt } from "lucide-react";
import clsx from "clsx";
import { Trans } from "@lingui/react/macro";
import { msg, t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { garmentsAtom } from "@/stores/garmentAtoms";
import { getConfidence, getConfidenceLabel } from "@/lib/confidence";
import {
  GARMENT_CATEGORY_LABEL,
  GARMENT_CATEGORIES,
  CONFIDENCE_FILTER_OPTIONS,
  SORT_OPTIONS,
} from "@/lib/constants";
import type { ConfidenceFilterValue, SortOptionValue } from "@/lib/constants";
import type { GarmentCategory, Garment } from "@/types";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import GarmentGrid from "@/components/garment/GarmentGrid";
import GarmentList from "@/components/garment/GarmentList";
import ViewToggle from "@/components/garment/ViewToggle";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";

const isSortOptionValue = (value: string): value is SortOptionValue =>
  SORT_OPTIONS.some((option) => option.value === value);

type ViewMode = "grid" | "list";

const CATEGORY_FILTERS = [
  { value: "all" as const, label: msg`すべて` },
  ...GARMENT_CATEGORIES.map((key) => ({
    value: key,
    label: GARMENT_CATEGORY_LABEL[key],
  })),
];

const GARMENT_COMPARATORS = Object.freeze({
  newest: (a: Garment, b: Garment) => b.createdAt - a.createdAt,
  oldest: (a: Garment, b: Garment) => a.createdAt - b.createdAt,
  confidence_asc: (a: Garment, b: Garment) =>
    getConfidence(a) - getConfidence(b),
  confidence_desc: (a: Garment, b: Garment) =>
    getConfidence(b) - getConfidence(a),
} satisfies Record<SortOptionValue, (a: Garment, b: Garment) => number>);

const GarmentListContent = () => {
  const router = useRouter();
  const { i18n } = useLingui();
  const garments = useAtomValue(garmentsAtom);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<GarmentCategory | "all">(
    "all",
  );
  const [confidenceFilter, setConfidenceFilter] =
    useState<ConfidenceFilterValue>("all");
  const [sortOption, setSortOption] = useState<SortOptionValue>("newest");

  const filteredGarments = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = garments.filter((g) => {
      const matchesCategory =
        activeCategory === "all" || g.category === activeCategory;
      const nameMatches = g.name.toLowerCase().includes(query);
      const tagMatches = g.tags.some((t) => t.toLowerCase().includes(query));
      const matchesSearch = [query === "", nameMatches, tagMatches].some(
        Boolean,
      );
      const matchesConfidence =
        confidenceFilter === "all" ||
        getConfidenceLabel(getConfidence(g)) === confidenceFilter;
      return matchesCategory && matchesSearch && matchesConfidence;
    });

    return [...filtered].sort(GARMENT_COMPARATORS[sortOption]);
  }, [garments, searchQuery, activeCategory, confidenceFilter, sortOption]);

  if (garments.length === 0) {
    return (
      <EmptyState
        icon={Shirt}
        title={t`まだ服がありません`}
        description={t`最初のドール服を登録してみましょう`}
        actionLabel={t`服を登録`}
        onAction={() => {
          router.push("/garments/new");
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="search"
            placeholder={t`名前やタグで検索...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-border-default bg-surface-overlay pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <select
          value={sortOption}
          onChange={(e) => {
            const { value } = e.target;
            if (isSortOptionValue(value)) {
              setSortOption(value);
            }
          }}
          aria-label={t`並び替え`}
          className="h-10 rounded-lg border border-border-default bg-surface-overlay px-2 text-xs text-text-secondary focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {i18n._(label)}
            </option>
          ))}
        </select>
        <ViewToggle mode={viewMode} onChangeMode={setViewMode} />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {CATEGORY_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setActiveCategory(value)}
            className={clsx(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              activeCategory === value
                ? "bg-primary-500 text-text-inverse"
                : "bg-surface-overlay text-text-secondary border border-border-default hover:bg-primary-50",
            )}
          >
            {i18n._(label)}
          </button>
        ))}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {CONFIDENCE_FILTER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setConfidenceFilter(value)}
            className={clsx(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              confidenceFilter === value
                ? "bg-primary-500 text-text-inverse"
                : "bg-surface-overlay text-text-secondary border border-border-default hover:bg-primary-50",
            )}
          >
            {i18n._(label)}
          </button>
        ))}
      </div>

      {filteredGarments.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-tertiary">
          <Trans>一致する服が見つかりません</Trans>
        </p>
      ) : viewMode === "grid" ? (
        <GarmentGrid garments={filteredGarments} />
      ) : (
        <GarmentList garments={filteredGarments} />
      )}
    </div>
  );
};

const GarmentsPage = () => (
  <div className="flex flex-col gap-4 p-4">
    <div className="animate-[fade-in_0.4s_ease-out]">
      <h2 className="font-display text-xl font-bold">
        <Trans>ワードローブ</Trans>
      </h2>
    </div>

    <ErrorBoundary
      fallback={
        <p className="text-sm text-danger">
          <Trans>読み込みに失敗しました</Trans>
        </p>
      }
    >
      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        }
      >
        <GarmentListContent />
      </Suspense>
    </ErrorBoundary>

    <Link
      href="/garments/new"
      className="fixed bottom-20 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-primary-500 text-text-inverse shadow-lg transition-all hover:bg-primary-600 hover:shadow-xl active:scale-95"
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <Plus className="size-6" />
    </Link>
  </div>
);

export default GarmentsPage;
