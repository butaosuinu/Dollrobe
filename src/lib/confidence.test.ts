import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  estimateDecayDays,
  getConfidence,
  getConfidenceLabel,
  getEffectiveDecayDays,
  getElapsedDays,
  getItemsNeedingReview,
  getOrphanedCheckouts,
} from "./confidence";
import type { Garment } from "@/types";
import { DECAY_DAYS_BY_ACTIVITY, MS_PER_DAY } from "@/lib/constants";

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
  confidenceDecayDaysOverride: undefined,
  recentCheckoutCount: 0,
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

  it("decayDaysの半分経過で信頼度0.5を返す（override 指定時）", () => {
    const garment = createGarment({
      lastScannedAt: Date.now() - 15 * MS_PER_DAY,
      confidenceDecayDaysOverride: 30,
    });
    expect(getConfidence(garment)).toBeCloseTo(0.5, 1);
  });

  it("decayDays経過後は信頼度0を返す（override 指定時）", () => {
    const garment = createGarment({
      lastScannedAt: Date.now() - 30 * MS_PER_DAY,
      confidenceDecayDaysOverride: 30,
    });
    expect(getConfidence(garment)).toBe(0);
  });

  it("decayDaysを超過しても負にならない", () => {
    const garment = createGarment({
      lastScannedAt: Date.now() - 60 * MS_PER_DAY,
      confidenceDecayDaysOverride: 30,
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

  it("recentCheckoutCount に応じて effective decay days が反映される", () => {
    const highActivity = createGarment({
      lastScannedAt: Date.now() - 7 * MS_PER_DAY,
      recentCheckoutCount: 6,
    });
    expect(getConfidence(highActivity)).toBeCloseTo(0.5, 1);

    const noActivity = createGarment({
      lastScannedAt: Date.now() - 7 * MS_PER_DAY,
      recentCheckoutCount: 0,
    });
    expect(getConfidence(noActivity)).toBeCloseTo(1 - 7 / 90, 2);
  });

  it("override が recentCheckoutCount より優先される", () => {
    const garment = createGarment({
      lastScannedAt: Date.now() - 7 * MS_PER_DAY,
      recentCheckoutCount: 6,
      confidenceDecayDaysOverride: 60,
    });
    expect(getConfidence(garment)).toBeCloseTo(1 - 7 / 60, 2);
  });

  describe("場所訪問ブースト", () => {
    it("lastLocationVisitedAtがundefinedのとき従来と同じ結果を返す", () => {
      const garment = createGarment({
        lastScannedAt: Date.now() - 15 * MS_PER_DAY,
        confidenceDecayDaysOverride: 30,
      });
      expect(getConfidence(garment)).toBeCloseTo(0.5, 1);
    });

    it("訪問が新しくかつ減衰期間内ならブーストが適用される", () => {
      const now = Date.now();
      const garment = createGarment({
        lastScannedAt: now - 15 * MS_PER_DAY,
        confidenceDecayDaysOverride: 30,
      });
      expect(
        getConfidence({ ...garment, lastLocationVisitedAt: now }),
      ).toBeCloseTo(0.75, 2);
    });

    it("訪問が3.5日前（減衰半ば）ならブースト0.125が加算される", () => {
      const now = Date.now();
      const garment = createGarment({
        lastScannedAt: now - 15 * MS_PER_DAY,
        confidenceDecayDaysOverride: 30,
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
        confidenceDecayDaysOverride: 30,
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
        confidenceDecayDaysOverride: 30,
      });
      expect(getConfidence({ ...garment, lastLocationVisitedAt: now })).toBe(1);
    });

    it("訪問がスキャンと同じ時刻ならブースト0（<=判定）", () => {
      const now = Date.now();
      const garment = createGarment({
        lastScannedAt: now - 15 * MS_PER_DAY,
        confidenceDecayDaysOverride: 30,
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
        confidenceDecayDaysOverride: 30,
      });
      expect(getConfidence({ ...garment, lastLocationVisitedAt: now })).toBe(0);
    });
  });
});

describe("estimateDecayDays", () => {
  it.each([
    [0, DECAY_DAYS_BY_ACTIVITY.NONE],
    [1, DECAY_DAYS_BY_ACTIVITY.LOW],
    [2, DECAY_DAYS_BY_ACTIVITY.LOW],
    [3, DECAY_DAYS_BY_ACTIVITY.MEDIUM],
    [5, DECAY_DAYS_BY_ACTIVITY.MEDIUM],
    [6, DECAY_DAYS_BY_ACTIVITY.HIGH],
    [100, DECAY_DAYS_BY_ACTIVITY.HIGH],
  ])("recentCheckoutCount=%i のとき %i 日を返す", (count, expected) => {
    expect(estimateDecayDays(count)).toBe(expected);
  });
});

describe("getEffectiveDecayDays", () => {
  it("override が設定されていればそれを優先", () => {
    expect(
      getEffectiveDecayDays({
        recentCheckoutCount: 10,
        confidenceDecayDaysOverride: 45,
      }),
    ).toBe(45);
  });

  it("override が undefined なら recentCheckoutCount から推定値を返す", () => {
    expect(
      getEffectiveDecayDays({
        recentCheckoutCount: 5,
        confidenceDecayDaysOverride: undefined,
      }),
    ).toBe(DECAY_DAYS_BY_ACTIVITY.MEDIUM);
  });

  it("recentCheckoutCount=0 なら NONE (90日)", () => {
    expect(
      getEffectiveDecayDays({
        recentCheckoutCount: 0,
        confidenceDecayDaysOverride: undefined,
      }),
    ).toBe(DECAY_DAYS_BY_ACTIVITY.NONE);
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
        confidenceDecayDaysOverride: 30,
      }),
      createGarment({
        id: "g2",
        locationId: "loc1",
        lastScannedAt: Date.now() - 25 * MS_PER_DAY,
        confidenceDecayDaysOverride: 30,
      }),
      createGarment({
        id: "g3",
        locationId: "loc2",
        lastScannedAt: Date.now() - 25 * MS_PER_DAY,
        confidenceDecayDaysOverride: 30,
      }),
    ];
    const result = getItemsNeedingReview(garments, "loc1");
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("g2");
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
