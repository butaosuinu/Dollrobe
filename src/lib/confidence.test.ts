import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getConfidence,
  getConfidenceLabel,
  getElapsedDays,
  getItemsNeedingReview,
  getLocationStabilityScore,
  getOrphanedCheckouts,
  getReviewThreshold,
} from "./confidence";
import type { Garment } from "@/types";
import {
  MS_PER_DAY,
  REVIEW_THRESHOLD_DEFAULT,
  REVIEW_THRESHOLD_STABLE,
} from "@/lib/constants";

const createGarment = (overrides: Partial<Garment> = {}): Garment => ({
  id: "g1",
  userId: "u1",
  name: "テストドレス",
  category: "dress",
  dollSizes: ["SD"],
  colors: [],
  tags: [],
  imageUrl: undefined,
  locationId: "loc1",
  status: "stored",
  lastScannedAt: Date.now(),
  confidenceDecayDays: 30,
  brand: undefined,
  description: undefined,
  setContents: undefined,
  checkedOutAt: undefined,
  archivedAt: undefined,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe("getConfidence", () => {
  it("スキャン直後は信頼度1.0を返す", () => {
    const garment = createGarment({ lastScannedAt: Date.now() });
    expect(getConfidence(garment)).toBeCloseTo(1.0, 1);
  });

  it("decayDaysの半分経過で信頼度0.5を返す", () => {
    const garment = createGarment({
      lastScannedAt: Date.now() - 15 * MS_PER_DAY,
      confidenceDecayDays: 30,
    });
    expect(getConfidence(garment)).toBeCloseTo(0.5, 1);
  });

  it("decayDays経過後は信頼度0を返す", () => {
    const garment = createGarment({
      lastScannedAt: Date.now() - 30 * MS_PER_DAY,
      confidenceDecayDays: 30,
    });
    expect(getConfidence(garment)).toBe(0);
  });

  it("decayDaysを超過しても負にならない", () => {
    const garment = createGarment({
      lastScannedAt: Date.now() - 60 * MS_PER_DAY,
      confidenceDecayDays: 30,
    });
    expect(getConfidence(garment)).toBe(0);
  });

  it("checked_outステータスでは信頼度0を返す", () => {
    const garment = createGarment({ status: "checked_out" });
    expect(getConfidence(garment)).toBe(0);
  });

  it("lostステータスでは信頼度0を返す", () => {
    const garment = createGarment({ status: "lost" });
    expect(getConfidence(garment)).toBe(0);
  });

  describe("場所訪問ブースト", () => {
    it("lastLocationVisitedAtがundefinedのとき従来と同じ結果を返す", () => {
      const garment = createGarment({
        lastScannedAt: Date.now() - 15 * MS_PER_DAY,
        confidenceDecayDays: 30,
      });
      expect(getConfidence(garment)).toBeCloseTo(0.5, 1);
    });

    it("訪問が新しくかつ減衰期間内ならブーストが適用される", () => {
      const now = Date.now();
      const garment = createGarment({
        lastScannedAt: now - 15 * MS_PER_DAY,
        confidenceDecayDays: 30,
      });
      expect(
        getConfidence({ ...garment, lastLocationVisitedAt: now }),
      ).toBeCloseTo(0.75, 2);
    });

    it("訪問が3.5日前（減衰半ば）ならブースト0.125が加算される", () => {
      const now = Date.now();
      const garment = createGarment({
        lastScannedAt: now - 15 * MS_PER_DAY,
        confidenceDecayDays: 30,
      });
      expect(
        getConfidence({
          ...garment,
          lastLocationVisitedAt: now - 3.5 * MS_PER_DAY,
        }),
      ).toBeCloseTo(0.625, 2);
    });

    it("訪問が7日より古ければブーストは0", () => {
      const now = Date.now();
      const garment = createGarment({
        lastScannedAt: now - 15 * MS_PER_DAY,
        confidenceDecayDays: 30,
      });
      expect(
        getConfidence({
          ...garment,
          lastLocationVisitedAt: now - 8 * MS_PER_DAY,
        }),
      ).toBeCloseTo(0.5, 1);
    });

    it("ブーストを加算しても1.0を超えない", () => {
      const now = Date.now();
      const garment = createGarment({
        lastScannedAt: now - 3 * MS_PER_DAY,
        confidenceDecayDays: 30,
      });
      expect(getConfidence({ ...garment, lastLocationVisitedAt: now })).toBe(1);
    });

    it("訪問がスキャンと同じ時刻ならブースト0（<=判定）", () => {
      const now = Date.now();
      const garment = createGarment({
        lastScannedAt: now - 15 * MS_PER_DAY,
        confidenceDecayDays: 30,
      });
      expect(
        getConfidence({
          ...garment,
          lastLocationVisitedAt: now - 15 * MS_PER_DAY,
        }),
      ).toBeCloseTo(0.5, 1);
    });

    it("checked_outステータスではブーストも無効", () => {
      const now = Date.now();
      const garment = createGarment({
        status: "checked_out",
        lastScannedAt: now - 15 * MS_PER_DAY,
        confidenceDecayDays: 30,
      });
      expect(getConfidence({ ...garment, lastLocationVisitedAt: now })).toBe(0);
    });
  });
});

describe("getConfidenceLabel", () => {
  it("0.7以上でconfirmedを返す", () => {
    expect(getConfidenceLabel(0.7)).toBe("confirmed");
    expect(getConfidenceLabel(1.0)).toBe("confirmed");
  });

  it("0.3以上0.7未満でuncertainを返す", () => {
    expect(getConfidenceLabel(0.3)).toBe("uncertain");
    expect(getConfidenceLabel(0.69)).toBe("uncertain");
  });

  it("0.3未満でunknownを返す", () => {
    expect(getConfidenceLabel(0.29)).toBe("unknown");
    expect(getConfidenceLabel(0)).toBe("unknown");
  });
});

describe("getItemsNeedingReview", () => {
  it("信頼度0.7未満の同一ロケーションのアイテムを返す", () => {
    const garments = [
      createGarment({
        id: "g1",
        locationId: "loc1",
        lastScannedAt: Date.now(),
      }),
      createGarment({
        id: "g2",
        locationId: "loc1",
        lastScannedAt: Date.now() - 25 * MS_PER_DAY,
      }),
      createGarment({
        id: "g3",
        locationId: "loc2",
        lastScannedAt: Date.now() - 25 * MS_PER_DAY,
      }),
    ];
    const result = getItemsNeedingReview(garments, "loc1");
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("g2");
  });

  it("threshold 省略時はデフォルト(0.7)で判定する", () => {
    // 経過 10日 / decay 30日 → confidence ≒ 0.667 (< 0.7)
    const garments = [
      createGarment({
        id: "g1",
        locationId: "loc1",
        lastScannedAt: Date.now() - 10 * MS_PER_DAY,
        confidenceDecayDays: 30,
      }),
    ];
    const result = getItemsNeedingReview(garments, "loc1", {
      threshold: REVIEW_THRESHOLD_DEFAULT,
    });
    expect(result).toHaveLength(1);
  });

  it("threshold=0.5 を渡すと信頼度 0.6 のアイテムは除外される", () => {
    // 経過 12日 / decay 30日 → confidence = 0.6
    const garments = [
      createGarment({
        id: "g1",
        locationId: "loc1",
        lastScannedAt: Date.now() - 12 * MS_PER_DAY,
        confidenceDecayDays: 30,
      }),
    ];
    const result = getItemsNeedingReview(garments, "loc1", {
      threshold: REVIEW_THRESHOLD_STABLE,
    });
    expect(result).toHaveLength(0);
  });

  it("threshold=0.5 を渡すと信頼度 0.4 のアイテムは含まれる", () => {
    // 経過 18日 / decay 30日 → confidence = 0.4
    const garments = [
      createGarment({
        id: "g1",
        locationId: "loc1",
        lastScannedAt: Date.now() - 18 * MS_PER_DAY,
        confidenceDecayDays: 30,
      }),
    ];
    const result = getItemsNeedingReview(garments, "loc1", {
      threshold: REVIEW_THRESHOLD_STABLE,
    });
    expect(result).toHaveLength(1);
  });
});

describe("getLocationStabilityScore", () => {
  it("サンプル数 3 件未満では中立値 0.5 を返す", () => {
    expect(
      getLocationStabilityScore({ confirmAllCount: 0, correctionCount: 0 }),
    ).toBe(0.5);
    expect(
      getLocationStabilityScore({ confirmAllCount: 2, correctionCount: 0 }),
    ).toBe(0.5);
    expect(
      getLocationStabilityScore({ confirmAllCount: 1, correctionCount: 1 }),
    ).toBe(0.5);
  });

  it("全て確認の場合 1.0 を返す", () => {
    expect(
      getLocationStabilityScore({ confirmAllCount: 10, correctionCount: 0 }),
    ).toBe(1.0);
  });

  it("半々の場合 0.5 を返す", () => {
    expect(
      getLocationStabilityScore({ confirmAllCount: 5, correctionCount: 5 }),
    ).toBe(0.5);
  });

  it("8/10 の場合 0.8 を返す", () => {
    expect(
      getLocationStabilityScore({ confirmAllCount: 8, correctionCount: 2 }),
    ).toBe(0.8);
  });
});

describe("getReviewThreshold", () => {
  it("安定度 0.8 以上では閾値 0.5 を返す", () => {
    expect(getReviewThreshold(0.8)).toBe(REVIEW_THRESHOLD_STABLE);
    expect(getReviewThreshold(1.0)).toBe(REVIEW_THRESHOLD_STABLE);
  });

  it("安定度 0.8 未満では閾値 0.7 を返す", () => {
    expect(getReviewThreshold(0.79)).toBe(REVIEW_THRESHOLD_DEFAULT);
    expect(getReviewThreshold(0.5)).toBe(REVIEW_THRESHOLD_DEFAULT);
    expect(getReviewThreshold(0)).toBe(REVIEW_THRESHOLD_DEFAULT);
  });
});

describe("getElapsedDays", () => {
  const FIXED_NOW = new Date("2025-06-15T00:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("経過日数0を返す（スキャン直後）", () => {
    expect(getElapsedDays(FIXED_NOW)).toBe(0);
  });

  it("10日前のスキャンで経過日数10を返す", () => {
    expect(getElapsedDays(FIXED_NOW - 10 * MS_PER_DAY)).toBe(10);
  });

  it("端数は切り捨てる", () => {
    expect(getElapsedDays(FIXED_NOW - 1.9 * MS_PER_DAY)).toBe(1);
  });
});

describe("getOrphanedCheckouts", () => {
  it("3日以上チェックアウト中のアイテムを返す", () => {
    const garments = [
      createGarment({
        id: "g1",
        status: "checked_out",
        checkedOutAt: Date.now() - 4 * MS_PER_DAY,
      }),
      createGarment({
        id: "g2",
        status: "checked_out",
        checkedOutAt: Date.now() - 1 * MS_PER_DAY,
      }),
      createGarment({ id: "g3", status: "stored" }),
    ];
    const result = getOrphanedCheckouts(garments);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("g1");
  });

  it("カスタム閾値で動作する", () => {
    const garments = [
      createGarment({
        id: "g1",
        status: "checked_out",
        checkedOutAt: Date.now() - 2 * MS_PER_DAY,
      }),
    ];
    const result = getOrphanedCheckouts(garments, 1);
    expect(result).toHaveLength(1);
  });
});
