"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAtom, useAtomValue } from "jotai";
import { Plus, Shirt, Upload, Camera, Archive } from "lucide-react";
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
  DOLL_SIZE_FILTER_OPTIONS,
  SORT_OPTIONS,
} from "@/lib/i18n-labels";
import type {
  ConfidenceFilterValue,
  DollSizeFilterValue,
  SortOptionValue,
} from "@/lib/constants";
import type { GarmentCategory, Garment, Doll } from "@/types";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import DollCombobox from "@/components/garment/DollCombobox";
import GarmentGrid from "@/components/garment/GarmentGrid";
import GarmentList from "@/components/garment/GarmentList";
import ChipGroup from "@/components/ui/ChipGroup";
import EmptyState from "@/components/ui/EmptyState";
import FAB from "@/components/ui/FAB";
import FilterToggleButton from "@/components/ui/FilterToggleButton";
import SearchInput from "@/components/ui/SearchInput";
import Skeleton from "@/components/ui/Skeleton";
import ViewToggle from "@/components/ui/ViewToggle";

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
  readonly dollSizeFilter: DollSizeFilterValue;
  readonly onChangeDollSize: (value: DollSizeFilterValue) => void;
  readonly dolls: readonly Doll[];
  readonly selectedDollId: string | undefined;
  readonly onChangeDoll: (id: string | undefined) => void;
};

const FilterPanel = ({
  isOpen,
  confidenceFilter,
  onChangeConfidence,
  dollSizeFilter,
  onChangeDollSize,
  dolls,
  selectedDollId,
  onChangeDoll,
}: FilterPanelProps) => {
  const { i18n } = useLingui();

  if (!isOpen) return undefined;

  const confidenceChips = CONFIDENCE_FILTER_OPTIONS.map(({ value, label }) => ({
    value,
    label: i18n._(label),
  }));
  const sizeChips = DOLL_SIZE_FILTER_OPTIONS.map(({ value, label }) => ({
    value,
    label: i18n._(label),
  }));

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-1.5 text-xs font-medium text-text-tertiary">
          <Trans>信頼度</Trans>
        </p>
        <ChipGroup
          options={confidenceChips}
          value={confidenceFilter}
          onSelect={onChangeConfidence}
        />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-text-tertiary">
          <Trans>サイズ</Trans>
        </p>
        <ChipGroup
          options={sizeChips}
          value={dollSizeFilter}
          onSelect={onChangeDollSize}
        />
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
  dollSizeFilter,
  selectedDoll,
}: {
  readonly garment: Garment;
  readonly query: string;
  readonly activeCategory: GarmentCategory | "all";
  readonly confidenceFilter: ConfidenceFilterValue;
  readonly dollSizeFilter: DollSizeFilterValue;
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
  const matchesDollSize =
    dollSizeFilter === "all" || garment.dollSizes.includes(dollSizeFilter);
  const matchesDoll =
    selectedDoll === undefined ||
    canDollWear({
      dollBodySize: selectedDoll.bodySize,
      garmentSizes: garment.dollSizes,
    });
  return (
    matchesCategory &&
    matchesSearch &&
    matchesConfidence &&
    matchesDollSize &&
    matchesDoll
  );
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
  const [dollSizeFilter, setDollSizeFilter] =
    useState<DollSizeFilterValue>("all");
  const [sortOption, setSortOption] = useState<SortOptionValue>("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    const confidenceActive = confidenceFilter !== "all" ? 1 : 0;
    const dollSizeActive = dollSizeFilter !== "all" ? 1 : 0;
    const dollActive = selectedDollId !== undefined ? 1 : 0;
    return confidenceActive + dollSizeActive + dollActive;
  }, [confidenceFilter, dollSizeFilter, selectedDollId]);

  const filteredGarments = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = garments.filter((garment) =>
      matchesGarmentFilter({
        garment,
        query,
        activeCategory,
        confidenceFilter,
        dollSizeFilter,
        selectedDoll,
      }),
    );

    return [...filtered].sort(GARMENT_COMPARATORS[sortOption]);
  }, [
    garments,
    searchQuery,
    activeCategory,
    confidenceFilter,
    dollSizeFilter,
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
        <SearchInput
          value={searchQuery}
          onChangeValue={setSearchQuery}
          placeholder={t`名前やタグで検索...`}
        />
        <FilterToggleButton
          isOpen={isFilterOpen}
          onToggle={() => setIsFilterOpen((prev) => !prev)}
          activeCount={activeFilterCount}
        />
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

      <ChipGroup
        options={CATEGORY_FILTERS.map(({ value, label }) => ({
          value,
          label: i18n._(label),
        }))}
        value={activeCategory}
        onSelect={setActiveCategory}
      />

      <FilterPanel
        isOpen={isFilterOpen}
        confidenceFilter={confidenceFilter}
        onChangeConfidence={setConfidenceFilter}
        dollSizeFilter={dollSizeFilter}
        onChangeDollSize={setDollSizeFilter}
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

    <FAB href="/garments/new" />
  </div>
);

export default GarmentsPage;
