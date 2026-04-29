import { describe, it, expect } from "vitest";
import {
  parseHsl,
  classifyColor,
  aggregateByCategory,
  aggregateByDollSize,
  aggregateByColor,
  aggregateByBrand,
} from "./wardrobe-analytics";
import type { Garment } from "@/types";

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

describe("parseHsl (extra branches)", () => {
  it("hsl( で始まるが ) で終わらない文字列は undefined", () => {
    expect(parseHsl("hsl(0, 0%, 50%")).toBeUndefined();
  });

  it("3 つでないパーツは undefined", () => {
    expect(parseHsl("hsl(0, 0%)")).toBeUndefined();
    expect(parseHsl("hsl(0, 0%, 50%, 1)")).toBeUndefined();
  });

  it("% 接尾辞を欠く s/l は undefined", () => {
    expect(parseHsl("hsl(0, 0, 50%)")).toBeUndefined();
    expect(parseHsl("hsl(0, 0%, 50)")).toBeUndefined();
  });

  it("先頭余白がトリムされる", () => {
    expect(parseHsl("  hsl(0, 0%, 50%)  ")).toEqual({ h: 0, s: 0, l: 50 });
  });
});

describe("classifyColor (extra branches)", () => {
  it("hex 4 文字や 5 文字は invalid 扱いで black", () => {
    expect(classifyColor("#abcd")).toBe("black");
    expect(classifyColor("#abcde")).toBe("black");
  });

  it("# なし 6 桁 hex も解釈できる", () => {
    expect(classifyColor("ff0000")).toBe("red");
  });

  it("hex 3 桁は展開して解釈する", () => {
    expect(classifyColor("#f00")).toBe("red");
  });

  it("hex で max=g のケース（緑）", () => {
    expect(classifyColor("#00ff00")).toBe("green");
  });

  it("max=min（グレースケール）の hex は無彩色判定される", () => {
    expect(classifyColor("#808080")).toBe("white");
    expect(classifyColor("#222222")).toBe("black");
  });

  it("不正な hex 文字（解釈不可）は black フォールバック", () => {
    expect(classifyColor("#zzzzzz")).toBe("black");
  });

  it("ACHROMATIC_LIGHTNESS_MIDPOINT 境界（l=50, s=10 = 無彩色）", () => {
    // l=50 は midpoint。l < midpoint のみ black 扱い、それ以外（>=）は white
    expect(classifyColor("hsl(0, 10%, 50%)")).toBe("white");
    expect(classifyColor("hsl(0, 10%, 49%)")).toBe("black");
  });

  it("HUE_PRESETS の境界 (hue=359 は red 側に丸める)", () => {
    expect(classifyColor("hsl(359, 80%, 50%)")).toBe("red");
  });
});

describe("aggregateByCategory (extra)", () => {
  it("カテゴリの並びは降順で同数なら GARMENT_CATEGORIES の順序を維持する", () => {
    const garments = [
      createGarment({ id: "g1", category: "tops" }),
      createGarment({ id: "g2", category: "bottoms" }),
    ];
    const result = aggregateByCategory(garments);
    // tops と bottoms はどちらも 1。GARMENT_CATEGORIES では tops が先
    expect(result.map((r) => r.category)).toEqual(["tops", "bottoms"]);
  });
});

describe("aggregateByDollSize (extra)", () => {
  it("dollSizes が空配列の garment は集計に寄与しない", () => {
    const garments = [createGarment({ dollSizes: [] })];
    expect(aggregateByDollSize(garments)).toEqual([]);
  });

  it("複数の dollSizes が降順で並ぶ", () => {
    const garments = [
      createGarment({ id: "g1", dollSizes: ["MSD"] }),
      createGarment({ id: "g2", dollSizes: ["MSD"] }),
      createGarment({ id: "g3", dollSizes: ["SD"] }),
    ];
    const result = aggregateByDollSize(garments);
    expect(result[0]?.dollSize).toBe("MSD");
    expect(result[0]?.count).toBe(2);
  });
});

describe("aggregateByColor (extra)", () => {
  it("不正な色文字列は black に分類される", () => {
    const garments = [createGarment({ colors: ["invalid-color"] })];
    const result = aggregateByColor(garments);
    expect(result).toHaveLength(1);
    expect(result[0]?.colorName).toBe("black");
    expect(result[0]?.count).toBe(1);
  });

  it("プリセット文字列はキャッシュ経由で同じ色名にマップされる", () => {
    const garments = [
      createGarment({
        id: "g1",
        colors: ["hsl(0, 0%, 10%)", "hsl(0, 0%, 95%)"],
      }),
    ];
    const result = aggregateByColor(garments);
    const black = result.find((r) => r.colorName === "black");
    const white = result.find((r) => r.colorName === "white");
    expect(black?.count).toBe(1);
    expect(white?.count).toBe(1);
  });
});

describe("aggregateByBrand (extra)", () => {
  it("topN がデフォルトの 10 を超えるブランド数では上位 10 件のみ", () => {
    const garments = Array.from({ length: 12 }, (_, i) =>
      createGarment({ id: `g-${i}`, brand: `brand-${i}` }),
    );
    const result = aggregateByBrand({ garments });
    expect(result).toHaveLength(10);
  });

  it("topN=0 で空配列を返す", () => {
    const garments = [createGarment({ brand: "Volks" })];
    expect(aggregateByBrand({ garments, topN: 0 })).toEqual([]);
  });

  it("全アイテムが brand=undefined だと空", () => {
    const garments = [createGarment({ id: "g1" }), createGarment({ id: "g2" })];
    expect(aggregateByBrand({ garments })).toEqual([]);
  });
});
