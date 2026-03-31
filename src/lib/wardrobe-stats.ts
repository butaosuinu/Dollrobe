import type {
  Garment,
  GarmentCategory,
  DollSize,
  ConfidenceLabel,
} from "@/types";
import type { ColorName } from "@/lib/constants";
import { GARMENT_CATEGORIES, DOLL_SIZES, PRESET_COLORS } from "@/lib/constants";
import { getConfidence, getConfidenceLabel } from "@/lib/confidence";
import type {
  CategoryCount,
  DollSizeCount,
  ColorGroupCount,
  BrandCount,
} from "./wardrobe-analytics";
import { classifyColor } from "./wardrobe-analytics";

const RECENT_ITEMS_LIMIT = 8;
const DEFAULT_BRAND_TOP_N = 10;
const ORPHAN_THRESHOLD_DAYS = 3;
const MS_PER_DAY = 86_400_000;

export type WardrobeStats = {
  readonly totalCount: number;
  readonly confirmedCount: number;
  readonly needsReviewCount: number;
  readonly checkedOutCount: number;
  readonly orphanedCount: number;
  readonly byCategory: readonly CategoryCount[];
  readonly byDollSize: readonly DollSizeCount[];
  readonly byColor: readonly ColorGroupCount[];
  readonly byBrand: readonly BrandCount[];
  readonly recentItems: readonly Garment[];
};

const COLOR_NAME_TO_HSL: Readonly<Record<ColorName, string>> = {
  black: PRESET_COLORS[0],
  white: PRESET_COLORS[1],
  red: PRESET_COLORS[2],
  blue: PRESET_COLORS[3],
  green: PRESET_COLORS[4],
  yellow: PRESET_COLORS[5],
  purple: PRESET_COLORS[6],
  pink: PRESET_COLORS[7],
  orange: PRESET_COLORS[8],
  cyan: PRESET_COLORS[9],
};

type Accumulator = {
  readonly categoryCounts: ReadonlyMap<GarmentCategory, number>;
  readonly dollSizeCounts: ReadonlyMap<DollSize, number>;
  readonly colorCounts: ReadonlyMap<ColorName, number>;
  readonly brandCounts: ReadonlyMap<string, number>;
  readonly confidenceCounts: Readonly<Record<ConfidenceLabel, number>>;
  readonly recentHeap: readonly Garment[];
  readonly checkedOutCount: number;
  readonly orphanedCount: number;
};

const isOrphaned = (g: Garment, now: number): boolean =>
  g.checkedOutAt !== undefined &&
  now - g.checkedOutAt >= ORPHAN_THRESHOLD_DAYS * MS_PER_DAY;

/* eslint-disable functional/no-loop-statements, functional/no-expression-statements, functional/immutable-data, functional/no-conditional-statements, functional/no-let, functional/no-return-void, no-param-reassign -- single-pass O(n) accumulation; the function itself is pure */
const incrementMap = <K>(map: Map<K, number>, key: K): void => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

const updateRecentHeap = (heap: Garment[], g: Garment): void => {
  if (heap.length < RECENT_ITEMS_LIMIT) {
    heap.push(g);
    return;
  }
  const minIdx = heap.reduce(
    (mi, item, idx) =>
      item.lastScannedAt < (heap[mi]?.lastScannedAt ?? Infinity) ? idx : mi,
    0,
  );
  if (g.lastScannedAt > (heap[minIdx]?.lastScannedAt ?? Infinity)) {
    heap[minIdx] = g;
  }
};

const accumulate = (garments: readonly Garment[]): Accumulator => {
  const categoryCounts = new Map<GarmentCategory, number>();
  const dollSizeCounts = new Map<DollSize, number>();
  const colorCounts = new Map<ColorName, number>();
  const brandCounts = new Map<string, number>();
  const confidenceCounts: Record<ConfidenceLabel, number> = {
    confirmed: 0,
    uncertain: 0,
    unknown: 0,
  };
  const recentHeap: Garment[] = [];
  const now = Date.now();

  let checkedOutCount = 0;
  let orphanedCount = 0;

  for (const g of garments) {
    incrementMap(categoryCounts, g.category);
    for (const size of g.dollSizes) {
      incrementMap(dollSizeCounts, size);
    }
    for (const color of g.colors) {
      incrementMap(colorCounts, classifyColor(color));
    }
    if (g.brand !== undefined && g.brand !== "") {
      incrementMap(brandCounts, g.brand);
    }
    if (g.status === "checked_out") {
      checkedOutCount += 1;
      if (isOrphaned(g, now)) {
        orphanedCount += 1;
      }
    }
    if (g.status === "stored") {
      confidenceCounts[getConfidenceLabel(getConfidence(g))] += 1;
    }
    updateRecentHeap(recentHeap, g);
  }

  return {
    categoryCounts,
    dollSizeCounts,
    colorCounts,
    brandCounts,
    confidenceCounts,
    recentHeap,
    checkedOutCount,
    orphanedCount,
  };
};
/* eslint-enable functional/no-loop-statements, functional/no-expression-statements, functional/immutable-data, functional/no-conditional-statements, functional/no-let, functional/no-return-void, no-param-reassign */

const descByCount = (
  a: { readonly count: number },
  b: { readonly count: number },
) => b.count - a.count;

/* eslint-disable functional/immutable-data -- .sort() on newly created arrays (flatMap / Array.from / spread) */
const buildCategoryCounts = (
  counts: ReadonlyMap<GarmentCategory, number>,
): readonly CategoryCount[] =>
  GARMENT_CATEGORIES.flatMap((cat) => {
    const count = counts.get(cat);
    return count !== undefined && count > 0 ? [{ category: cat, count }] : [];
  }).sort(descByCount);

const buildDollSizeCounts = (
  counts: ReadonlyMap<DollSize, number>,
): readonly DollSizeCount[] =>
  DOLL_SIZES.flatMap((size) => {
    const count = counts.get(size);
    return count !== undefined && count > 0 ? [{ dollSize: size, count }] : [];
  }).sort(descByCount);

const buildColorCounts = (
  counts: ReadonlyMap<ColorName, number>,
): readonly ColorGroupCount[] =>
  Array.from(counts.entries())
    .map(([colorName, count]) => ({
      colorName,
      hsl: COLOR_NAME_TO_HSL[colorName],
      count,
    }))
    .sort(descByCount);

const buildBrandCounts = (
  counts: ReadonlyMap<string, number>,
): readonly BrandCount[] =>
  Array.from(counts.entries())
    .map(([brand, count]) => ({ brand, count }))
    .sort(descByCount)
    .slice(0, DEFAULT_BRAND_TOP_N);

export const computeWardrobeStats = (
  garments: readonly Garment[],
): WardrobeStats => {
  const acc = accumulate(garments);

  return {
    totalCount: garments.length,
    confirmedCount: acc.confidenceCounts.confirmed,
    needsReviewCount:
      acc.confidenceCounts.uncertain + acc.confidenceCounts.unknown,
    checkedOutCount: acc.checkedOutCount,
    orphanedCount: acc.orphanedCount,
    byCategory: buildCategoryCounts(acc.categoryCounts),
    byDollSize: buildDollSizeCounts(acc.dollSizeCounts),
    byColor: buildColorCounts(acc.colorCounts),
    byBrand: buildBrandCounts(acc.brandCounts),
    recentItems: [...acc.recentHeap].sort(
      (a, b) => b.lastScannedAt - a.lastScannedAt,
    ),
  };
};
/* eslint-enable functional/immutable-data */
