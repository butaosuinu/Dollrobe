"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { Plus, Search, Shirt } from "lucide-react";
import clsx from "clsx";
import { garmentsAtom } from "@/stores/garmentAtoms";
import { GARMENT_CATEGORY_LABEL } from "@/lib/constants";
import type { GarmentCategory } from "@/types";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import GarmentGrid from "@/components/garment/GarmentGrid";
import GarmentList from "@/components/garment/GarmentList";
import ViewToggle from "@/components/garment/ViewToggle";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";

type ViewMode = "grid" | "list";

type CategoryFilter = {
  readonly value: GarmentCategory | "all";
  readonly label: string;
};

const CATEGORY_FILTERS: readonly CategoryFilter[] = [
  { value: "all", label: "すべて" },
  ...(Object.keys(GARMENT_CATEGORY_LABEL) as readonly GarmentCategory[]).map((key) => ({
    value: key,
    label: GARMENT_CATEGORY_LABEL[key],
  })),
];

const GarmentListContent = () => {
  const router = useRouter();
  const garments = useAtomValue(garmentsAtom);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<GarmentCategory | "all">("all");

  const filteredGarments = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return garments.filter((g) => {
      const matchesCategory = activeCategory === "all" || g.category === activeCategory;
      const nameMatches = g.name.toLowerCase().includes(query);
      const tagMatches = g.tags.some((t) => t.toLowerCase().includes(query));
      const matchesSearch = [query === "", nameMatches, tagMatches].some(Boolean);
      return matchesCategory && matchesSearch;
    });
  }, [garments, searchQuery, activeCategory]);

  if (garments.length === 0) {
    return (
      <EmptyState
        icon={Shirt}
        title="まだ服がありません"
        description="最初のドール服を登録してみましょう"
        actionLabel="服を登録"
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
            placeholder="名前やタグで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-border-default bg-surface-overlay pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
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
            {label}
          </button>
        ))}
      </div>

      {filteredGarments.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-tertiary">一致する服が見つかりません</p>
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
      <h2 className="font-display text-xl font-bold">ワードローブ</h2>
    </div>

    <ErrorBoundary fallback={<p className="text-sm text-danger">読み込みに失敗しました</p>}>
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
