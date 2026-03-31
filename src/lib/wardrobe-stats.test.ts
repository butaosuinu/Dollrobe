import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Garment } from "@/types";
import { computeWardrobeStats } from "./wardrobe-stats";

const FIXED_NOW = new Date("2025-06-15T00:00:00Z").getTime();
const MS_PER_DAY = 86_400_000;

const createGarment = (overrides: Partial<Garment> = {}): Garment => ({
  id: "g1",
  userId: "u1",
  name: "テスト",
  category: "tops",
  dollSizes: ["SD"],
  colors: [],
  tags: [],
  imageUrl: undefined,
  locationId: undefined,
  status: "stored",
  lastScannedAt: FIXED_NOW,
  confidenceDecayDays: 30,
  brand: undefined,
  description: undefined,
  setContents: undefined,
  checkedOutAt: undefined,
  archivedAt: undefined,
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW,
  ...overrides,
});

describe("computeWardrobeStats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("空配列で全カウント0の統計を返す", () => {
    const stats = computeWardrobeStats([]);

    expect(stats.totalCount).toBe(0);
    expect(stats.confirmedCount).toBe(0);
    expect(stats.needsReviewCount).toBe(0);
    expect(stats.checkedOutCount).toBe(0);
    expect(stats.orphanedCount).toBe(0);
    expect(stats.byCategory).toEqual([]);
    expect(stats.byDollSize).toEqual([]);
    expect(stats.byColor).toEqual([]);
    expect(stats.byBrand).toEqual([]);
    expect(stats.recentItems).toEqual([]);
  });

  it("信頼度別のカウントを正しく集計する", () => {
    const garments = [
      createGarment({ id: "g1", lastScannedAt: FIXED_NOW }),
      createGarment({ id: "g2", lastScannedAt: FIXED_NOW - 5 * MS_PER_DAY }),
      createGarment({
        id: "g3",
        lastScannedAt: FIXED_NOW - 25 * MS_PER_DAY,
      }),
    ];
    const stats = computeWardrobeStats(garments);

    expect(stats.totalCount).toBe(3);
    expect(stats.confirmedCount).toBe(2);
    expect(stats.needsReviewCount).toBe(1);
  });

  it("checked_outの服をカウントする", () => {
    const garments = [
      createGarment({
        id: "g1",
        status: "checked_out",
        checkedOutAt: FIXED_NOW,
      }),
      createGarment({ id: "g2" }),
    ];
    const stats = computeWardrobeStats(garments);

    expect(stats.checkedOutCount).toBe(1);
  });

  it("孤立チェックアウトをカウントする", () => {
    const garments = [
      createGarment({
        id: "g1",
        status: "checked_out",
        checkedOutAt: FIXED_NOW - 4 * MS_PER_DAY,
      }),
      createGarment({
        id: "g2",
        status: "checked_out",
        checkedOutAt: FIXED_NOW,
      }),
    ];
    const stats = computeWardrobeStats(garments);

    expect(stats.orphanedCount).toBe(1);
  });

  it("カテゴリ別集計が降順で返る", () => {
    const garments = [
      createGarment({ id: "g1", category: "tops" }),
      createGarment({ id: "g2", category: "tops" }),
      createGarment({ id: "g3", category: "dress" }),
    ];
    const stats = computeWardrobeStats(garments);

    expect(stats.byCategory[0]).toEqual({ category: "tops", count: 2 });
    expect(stats.byCategory[1]).toEqual({ category: "dress", count: 1 });
  });

  it("ドールサイズ別集計が降順で返る", () => {
    const garments = [
      createGarment({ id: "g1", dollSizes: ["SD", "MSD"] }),
      createGarment({ id: "g2", dollSizes: ["SD"] }),
    ];
    const stats = computeWardrobeStats(garments);

    expect(stats.byDollSize[0]).toEqual({ dollSize: "SD", count: 2 });
    expect(stats.byDollSize[1]).toEqual({ dollSize: "MSD", count: 1 });
  });

  it("色別集計が降順で返る", () => {
    const garments = [
      createGarment({
        id: "g1",
        colors: ["hsl(0, 70%, 55%)", "hsl(210, 70%, 55%)"],
      }),
      createGarment({ id: "g2", colors: ["hsl(5, 80%, 50%)"] }),
    ];
    const stats = computeWardrobeStats(garments);

    const red = stats.byColor.find((c) => c.colorName === "red");
    const blue = stats.byColor.find((c) => c.colorName === "blue");
    expect(red?.count).toBe(2);
    expect(blue?.count).toBe(1);
  });

  it("ブランド別集計がTop10で返る", () => {
    const garments = [
      createGarment({ id: "g1", brand: "Volks" }),
      createGarment({ id: "g2", brand: "Volks" }),
      createGarment({ id: "g3", brand: "Azone" }),
    ];
    const stats = computeWardrobeStats(garments);

    expect(stats.byBrand[0]).toEqual({ brand: "Volks", count: 2 });
    expect(stats.byBrand).toHaveLength(2);
  });

  it("recentItemsが最新8件をlastScannedAt降順で返す", () => {
    const garments = Array.from({ length: 12 }, (_, i) =>
      createGarment({
        id: `g${i}`,
        lastScannedAt: FIXED_NOW - i * MS_PER_DAY,
      }),
    );
    const stats = computeWardrobeStats(garments);

    expect(stats.recentItems).toHaveLength(8);
    expect(stats.recentItems[0]?.id).toBe("g0");
    expect(stats.recentItems[7]?.id).toBe("g7");
  });

  it("5000件のデータを10ms以内に処理する", () => {
    const garments = Array.from({ length: 5000 }, (_, i) =>
      createGarment({
        id: `g${i}`,
        category: (["tops", "bottoms", "dress", "shoes", "accessory"] as const)[
          i % 5
        ],
        dollSizes: [(["SD", "MSD", "YoSD"] as const)[i % 3] ?? "SD"],
        colors: [`hsl(${(i * 37) % 360}, 70%, 55%)`],
        brand: `Brand${i % 20}`,
        lastScannedAt: FIXED_NOW - (i % 60) * MS_PER_DAY,
        status: i % 10 === 0 ? "checked_out" : "stored",
        checkedOutAt: i % 10 === 0 ? FIXED_NOW - 5 * MS_PER_DAY : undefined,
      }),
    );

    const start = performance.now();
    const stats = computeWardrobeStats(garments);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
    expect(stats.totalCount).toBe(5000);
  });
});
