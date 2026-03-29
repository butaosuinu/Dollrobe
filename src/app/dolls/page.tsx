"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { Plus, User, Archive } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { msg, t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { dollsAtom } from "@/stores/dollAtoms";
import { pendingArchivesAtom } from "@/stores/pendingArchiveAtoms";
import { DOLL_SIZES } from "@/lib/constants";
import { DOLL_SIZE_LABEL, DOLL_SORT_OPTIONS } from "@/lib/i18n-labels";
import type { DollSortOptionValue } from "@/lib/constants";
import type { Doll, DollSize } from "@/types";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import DollGrid from "@/components/doll/DollGrid";
import DollList from "@/components/doll/DollList";
import ChipGroup from "@/components/ui/ChipGroup";
import EmptyState from "@/components/ui/EmptyState";
import FAB from "@/components/ui/FAB";
import FilterToggleButton from "@/components/ui/FilterToggleButton";
import SearchInput from "@/components/ui/SearchInput";
import Skeleton from "@/components/ui/Skeleton";
import ViewToggle from "@/components/ui/ViewToggle";

type ViewMode = "grid" | "list";

const isDollSortOptionValue = (value: string): value is DollSortOptionValue =>
  DOLL_SORT_OPTIONS.some((option) => option.value === value);

const SIZE_FILTERS = [
  { value: "all" as const, label: msg`すべて` },
  ...DOLL_SIZES.map((size) => ({
    value: size,
    label: DOLL_SIZE_LABEL[size],
  })),
];

const DOLL_COMPARATORS = Object.freeze({
  newest: (a: Doll, b: Doll) => b.createdAt - a.createdAt,
  oldest: (a: Doll, b: Doll) => a.createdAt - b.createdAt,
  name_asc: (a: Doll, b: Doll) => a.name.localeCompare(b.name, "ja"),
  name_desc: (a: Doll, b: Doll) => b.name.localeCompare(a.name, "ja"),
} satisfies Record<DollSortOptionValue, (a: Doll, b: Doll) => number>);

const matchesDollFilter = ({
  doll,
  query,
  activeSize,
  customizerFilter,
}: {
  readonly doll: Doll;
  readonly query: string;
  readonly activeSize: DollSize | "all";
  readonly customizerFilter: string | undefined;
}): boolean => {
  const matchesSize = activeSize === "all" || doll.bodySize === activeSize;

  const nameMatches = doll.name.toLowerCase().includes(query);
  const headModelMatches =
    doll.headModel?.toLowerCase().includes(query) === true;
  const makerMatches = doll.maker?.toLowerCase().includes(query) === true;
  const customizerMatches =
    doll.customizer?.toLowerCase().includes(query) === true;
  const memoMatches = doll.memo?.toLowerCase().includes(query) === true;
  const matchesSearch = [
    query === "",
    nameMatches,
    headModelMatches,
    makerMatches,
    customizerMatches,
    memoMatches,
  ].some(Boolean);

  const matchesCustomizer =
    customizerFilter === undefined || doll.customizer === customizerFilter;

  return matchesSize && matchesSearch && matchesCustomizer;
};

type FilterPanelProps = {
  readonly isOpen: boolean;
  readonly customizers: readonly string[];
  readonly customizerFilter: string | undefined;
  readonly onChangeCustomizer: (value: string | undefined) => void;
};

const FilterPanel = ({
  isOpen,
  customizers,
  customizerFilter,
  onChangeCustomizer,
}: FilterPanelProps) => {
  if (!isOpen || customizers.length === 0) return undefined;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-1.5 text-xs font-medium text-text-tertiary">
          <Trans>カスタマイザー</Trans>
        </p>
        <select
          value={customizerFilter ?? ""}
          onChange={(e) => {
            const { value } = e.target;
            onChangeCustomizer(value === "" ? undefined : value);
          }}
          aria-label={t`カスタマイザー`}
          className="h-10 w-full rounded-lg border border-border-default bg-surface-overlay px-3 text-sm text-text-primary focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          <option value="">{t`すべて`}</option>
          {customizers.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

const DollListContent = () => {
  const router = useRouter();
  const { i18n } = useLingui();
  const allDolls = useAtomValue(dollsAtom);
  const pendingArchives = useAtomValue(pendingArchivesAtom);

  const dolls = useMemo(() => {
    const pendingDollIds = new Set(
      pendingArchives.filter((p) => p.entityType === "doll").map((p) => p.id),
    );
    return allDolls.filter(
      (d) => d.archivedAt === undefined && !pendingDollIds.has(d.id),
    );
  }, [allDolls, pendingArchives]);

  const archivedCount = useMemo(
    () => allDolls.filter((d) => d.archivedAt !== undefined).length,
    [allDolls],
  );

  const customizers = useMemo(
    () =>
      [
        ...new Set(
          dolls
            .map((d) => d.customizer)
            .filter((c): c is string => c !== undefined),
        ),
      ].sort((a, b) => a.localeCompare(b, "ja")),
    [dolls],
  );

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSize, setActiveSize] = useState<DollSize | "all">("all");
  const [customizerFilter, setCustomizerFilter] = useState<string | undefined>(
    undefined,
  );
  const [sortOption, setSortOption] = useState<DollSortOptionValue>("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFilterCount = useMemo(
    () => (customizerFilter !== undefined ? 1 : 0),
    [customizerFilter],
  );

  const filteredDolls = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = dolls.filter((doll) =>
      matchesDollFilter({
        doll,
        query,
        activeSize,
        customizerFilter,
      }),
    );
    return [...filtered].sort(DOLL_COMPARATORS[sortOption]);
  }, [dolls, searchQuery, activeSize, customizerFilter, sortOption]);

  if (allDolls.length === 0) {
    return (
      <EmptyState
        icon={User}
        title={t`まだドールがいません`}
        description={t`最初のドールを登録してみましょう`}
        actionLabel={t`ドールを登録`}
        onAction={() => {
          router.push("/dolls/new");
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {archivedCount > 0 && (
        <Link
          href="/archive?tab=doll"
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
          placeholder={t`名前やカスタマイザーで検索...`}
        />
        {customizers.length > 0 && (
          <FilterToggleButton
            isOpen={isFilterOpen}
            onToggle={() => setIsFilterOpen((prev) => !prev)}
            activeCount={activeFilterCount}
          />
        )}
        <select
          value={sortOption}
          onChange={(e) => {
            const { value } = e.target;
            if (isDollSortOptionValue(value)) {
              setSortOption(value);
            }
          }}
          aria-label={t`並び替え`}
          className="h-10 rounded-lg border border-border-default bg-surface-overlay px-2 text-xs text-text-secondary focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          {DOLL_SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {i18n._(label)}
            </option>
          ))}
        </select>
        <ViewToggle mode={viewMode} onChangeMode={setViewMode} />
      </div>

      <ChipGroup
        options={SIZE_FILTERS.map(({ value, label }) => ({
          value,
          label: i18n._(label),
        }))}
        value={activeSize}
        onSelect={setActiveSize}
      />

      <FilterPanel
        isOpen={isFilterOpen}
        customizers={customizers}
        customizerFilter={customizerFilter}
        onChangeCustomizer={setCustomizerFilter}
      />

      {filteredDolls.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-tertiary">
          <Trans>一致するドールが見つかりません</Trans>
        </p>
      ) : viewMode === "grid" ? (
        <DollGrid dolls={filteredDolls} />
      ) : (
        <DollList dolls={filteredDolls} />
      )}
    </div>
  );
};

const DollsPage = () => (
  <div className="flex flex-col gap-4 p-4">
    <div className="flex items-center justify-between animate-[fade-in_0.4s_ease-out]">
      <h2 className="font-display text-xl font-bold">
        <Trans>ドール一覧</Trans>
      </h2>
      <Link
        href="/dolls/new"
        className="hidden items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-600 lg:inline-flex"
      >
        <Plus className="size-4" />
        <Trans>ドールを登録</Trans>
      </Link>
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
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        }
      >
        <DollListContent />
      </Suspense>
    </ErrorBoundary>

    <FAB href="/dolls/new" />
  </div>
);

export default DollsPage;
