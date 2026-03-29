"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAtom, useAtomValue } from "jotai";
import {
  Plus,
  Search,
  Shirt,
  Upload,
  Camera,
  Archive,
  SlidersHorizontal,
} from "lucide-react";
import clsx from "clsx";
import { Trans } from "@lingui/react/macro";
import { msg, t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { activeGarmentsAtom, garmentsAtom } from "@/stores/garmentAtoms";
import { dollsAtom, selectedDollIdAtom } from "@/stores/dollAtoms";
import { pendingArchivesAtom } from "@/stores/pendingArchiveAtoms";
import { canDollWear } from "@/lib/doll-compatibility";
import { getConfidence, getConfidenceLabel } from "@/lib/confidence";
import { GARMENT_CATEGORIES } from "@/lib/constants";
import {
  GARMENT_CATEGORY_LABEL,
  CONFIDENCE_FILTER_OPTIONS,
  SORT_OPTIONS,
} from "@/lib/i18n-labels";
import type { ConfidenceFilterValue, SortOptionValue } from "@/lib/constants";
import type { GarmentCategory, Garment, Doll } from "@/types";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import DollCombobox from "@/components/garment/DollCombobox";
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

type FilterPanelProps = {
  readonly isOpen: boolean;
  readonly confidenceFilter: ConfidenceFilterValue;
  readonly onChangeConfidence: (value: ConfidenceFilterValue) => void;
  readonly dolls: readonly Doll[];
  readonly selectedDollId: string | undefined;
  readonly onChangeDoll: (id: string | undefined) => void;
};

const FilterPanel = ({
  isOpen,
  confidenceFilter,
  onChangeConfidence,
  dolls,
  selectedDollId,
  onChangeDoll,
}: FilterPanelProps) => {
  const { i18n } = useLingui();

  if (!isOpen) return undefined;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-1.5 text-xs font-medium text-text-tertiary">
          <Trans>信頼度</Trans>
        </p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
          {CONFIDENCE_FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onChangeConfidence(value)}
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
      </div>

      {dolls.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-text-tertiary">
            <Trans>ドール</Trans>
          </p>
          <DollCombobox
            dolls={dolls}
            selectedDollId={selectedDollId}
            onChangeDoll={onChangeDoll}
          />
        </div>
      )}
    </div>
  );
};

const matchesGarmentFilter = ({
  garment,
  query,
  activeCategory,
  confidenceFilter,
  selectedDoll,
}: {
  readonly garment: Garment;
  readonly query: string;
  readonly activeCategory: GarmentCategory | "all";
  readonly confidenceFilter: ConfidenceFilterValue;
  readonly selectedDoll:
    | { readonly bodySize: Garment["dollSizes"][number] }
    | undefined;
}): boolean => {
  const matchesCategory =
    activeCategory === "all" || garment.category === activeCategory;
  const nameMatches = garment.name.toLowerCase().includes(query);
  const tagMatches = garment.tags.some((t) => t.toLowerCase().includes(query));
  const matchesSearch = [query === "", nameMatches, tagMatches].some(Boolean);
  const matchesConfidence =
    confidenceFilter === "all" ||
    getConfidenceLabel(getConfidence(garment)) === confidenceFilter;
  const matchesDoll =
    selectedDoll === undefined ||
    canDollWear({
      dollBodySize: selectedDoll.bodySize,
      garmentSizes: garment.dollSizes,
    });
  return matchesCategory && matchesSearch && matchesConfidence && matchesDoll;
};

const GarmentListContent = () => {
  const router = useRouter();
  const { i18n } = useLingui();
  const allGarments = useAtomValue(garmentsAtom);
  const activeGarments = useAtomValue(activeGarmentsAtom);
  const dolls = useAtomValue(dollsAtom);
  const pendingArchives = useAtomValue(pendingArchivesAtom);
  const [selectedDollId, setSelectedDollId] = useAtom(selectedDollIdAtom);

  const garments = useMemo(() => {
    const pendingGarmentIds = new Set(
      pendingArchives
        .filter((p) => p.entityType === "garment")
        .map((p) => p.id),
    );
    return activeGarments.filter((g) => !pendingGarmentIds.has(g.id));
  }, [activeGarments, pendingArchives]);
  const archivedCount = useMemo(
    () => allGarments.filter((g) => g.archivedAt !== undefined).length,
    [allGarments],
  );
  const selectedDoll = dolls.find((d) => d.id === selectedDollId);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<GarmentCategory | "all">(
    "all",
  );
  const [confidenceFilter, setConfidenceFilter] =
    useState<ConfidenceFilterValue>("all");
  const [sortOption, setSortOption] = useState<SortOptionValue>("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    const confidenceActive = confidenceFilter !== "all" ? 1 : 0;
    const dollActive = selectedDollId !== undefined ? 1 : 0;
    return confidenceActive + dollActive;
  }, [confidenceFilter, selectedDollId]);

  const filteredGarments = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = garments.filter((garment) =>
      matchesGarmentFilter({
        garment,
        query,
        activeCategory,
        confidenceFilter,
        selectedDoll,
      }),
    );

    return [...filtered].sort(GARMENT_COMPARATORS[sortOption]);
  }, [
    garments,
    searchQuery,
    activeCategory,
    confidenceFilter,
    sortOption,
    selectedDoll,
  ]);

  if (allGarments.length === 0) {
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
      {archivedCount > 0 && (
        <Link
          href="/archive"
          className="inline-flex items-center gap-1 text-xs text-text-tertiary transition-colors hover:text-text-secondary"
        >
          <Archive className="size-3.5" />
          <Trans>アーカイブ ({archivedCount})</Trans>
        </Link>
      )}
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
        <button
          type="button"
          onClick={() => setIsFilterOpen((prev) => !prev)}
          className={clsx(
            "relative flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors",
            isFilterOpen || activeFilterCount > 0
              ? "border-primary-400 bg-primary-50 text-primary-700"
              : "border-border-default bg-surface-overlay text-text-secondary hover:bg-surface-hover",
          )}
        >
          <SlidersHorizontal className="size-4" />
          <Trans>フィルター</Trans>
          {activeFilterCount > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-text-inverse">
              {activeFilterCount}
            </span>
          )}
        </button>
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

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
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

      <FilterPanel
        isOpen={isFilterOpen}
        confidenceFilter={confidenceFilter}
        onChangeConfidence={setConfidenceFilter}
        dolls={dolls}
        selectedDollId={selectedDollId}
        onChangeDoll={setSelectedDollId}
      />

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
    <div className="flex items-center justify-between animate-[fade-in_0.4s_ease-out]">
      <h2 className="font-display text-xl font-bold">
        <Trans>ワードローブ</Trans>
      </h2>
      <div className="hidden items-center gap-2 lg:flex">
        <Link
          href="/garments/import"
          className="inline-flex items-center gap-2 rounded-lg border border-border-default px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-overlay"
        >
          <Upload className="size-4" />
          <Trans>CSVインポート</Trans>
        </Link>
        <Link
          href="/garments/bulk"
          className="inline-flex items-center gap-2 rounded-lg border border-border-default px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-overlay"
        >
          <Camera className="size-4" />
          <Trans>連続撮影</Trans>
        </Link>
        <Link
          href="/garments/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-600"
        >
          <Plus className="size-4" />
          <Trans>服を登録</Trans>
        </Link>
      </div>
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
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
      className="fixed bottom-20 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-primary-500 text-text-inverse shadow-lg transition-all hover:bg-primary-600 hover:shadow-xl active:scale-95 lg:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <Plus className="size-6" />
    </Link>
  </div>
);

export default GarmentsPage;
