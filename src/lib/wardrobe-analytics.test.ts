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

describe("parseHsl", () => {
  it("正常なHSL文字列をパースする", () => {
    const result = parseHsl("hsl(210, 70%, 55%)");
    expect(result).toEqual({ h: 210, s: 70, l: 55 });
  });

  it("小数を含むHSL文字列をパースする", () => {
    const result = parseHsl("hsl(210.5, 70.5%, 55.5%)");
    expect(result).toEqual({ h: 210.5, s: 70.5, l: 55.5 });
  });

  it("不正な文字列でundefinedを返す", () => {
    expect(parseHsl("rgb(255, 0, 0)")).toBeUndefined();
    expect(parseHsl("")).toBeUndefined();
    expect(parseHsl("hsl(abc)")).toBeUndefined();
  });
});

describe("classifyColor", () => {
  it("プリセットカラーをそのまま分類する", () => {
    expect(classifyColor("hsl(0, 0%, 10%)")).toBe("black");
    expect(classifyColor("hsl(0, 0%, 95%)")).toBe("white");
    expect(classifyColor("hsl(0, 70%, 55%)")).toBe("red");
    expect(classifyColor("hsl(210, 70%, 55%)")).toBe("blue");
    expect(classifyColor("hsl(120, 40%, 45%)")).toBe("green");
    expect(classifyColor("hsl(45, 90%, 55%)")).toBe("yellow");
    expect(classifyColor("hsl(280, 60%, 55%)")).toBe("purple");
    expect(classifyColor("hsl(330, 70%, 60%)")).toBe("pink");
    expect(classifyColor("hsl(25, 70%, 50%)")).toBe("orange");
    expect(classifyColor("hsl(180, 50%, 45%)")).toBe("cyan");
  });

  it("無彩色を彩度から判定する", () => {
    expect(classifyColor("hsl(0, 5%, 20%)")).toBe("black");
    expect(classifyColor("hsl(0, 10%, 80%)")).toBe("white");
  });

  it("近いHueのプリセットに分類する", () => {
    expect(classifyColor("hsl(5, 80%, 50%)")).toBe("red");
    expect(classifyColor("hsl(340, 80%, 50%)")).toBe("pink");
    expect(classifyColor("hsl(200, 60%, 50%)")).toBe("blue");
    expect(classifyColor("hsl(150, 50%, 40%)")).toBe("green");
  });

  it("hexカラーを分類する", () => {
    expect(classifyColor("#ff0000")).toBe("red");
    expect(classifyColor("#0000ff")).toBe("blue");
    expect(classifyColor("#000")).toBe("black");
    expect(classifyColor("#fff")).toBe("white");
  });

  it("不正な文字列はblackにフォールバックする", () => {
    expect(classifyColor("invalid")).toBe("black");
  });
});

describe("aggregateByCategory", () => {
  it("空配列で空結果を返す", () => {
    expect(aggregateByCategory([])).toEqual([]);
  });

  it("カテゴリ別に集計して降順で返す", () => {
    const garments = [
      createGarment({ id: "g1", category: "tops" }),
      createGarment({ id: "g2", category: "tops" }),
      createGarment({ id: "g3", category: "bottoms" }),
      createGarment({ id: "g4", category: "dress" }),
    ];
    const result = aggregateByCategory(garments);
    expect(result[0]).toEqual({ category: "tops", count: 2 });
    expect(result).toHaveLength(3);
  });

  it("count 0のカテゴリは除外する", () => {
    const garments = [createGarment({ category: "shoes" })];
    const result = aggregateByCategory(garments);
    expect(result).toHaveLength(1);
    expect(result[0]?.category).toBe("shoes");
  });
});

describe("aggregateByDollSize", () => {
  it("空配列で空結果を返す", () => {
    expect(aggregateByDollSize([])).toEqual([]);
  });

  it("dollSizes配列を展開して集計する", () => {
    const garments = [
      createGarment({ id: "g1", dollSizes: ["SD", "MSD"] }),
      createGarment({ id: "g2", dollSizes: ["SD"] }),
      createGarment({ id: "g3", dollSizes: ["YoSD"] }),
    ];
    const result = aggregateByDollSize(garments);
    expect(result[0]).toEqual({ dollSize: "SD", count: 2 });
    expect(result).toHaveLength(3);
  });
});

describe("aggregateByColor", () => {
  it("空配列で空結果を返す", () => {
    expect(aggregateByColor([])).toEqual([]);
  });

  it("colorsが空の服は結果に含まれない", () => {
    const garments = [createGarment({ colors: [] })];
    expect(aggregateByColor(garments)).toEqual([]);
  });

  it("色をプリセットにグルーピングして集計する", () => {
    const garments = [
      createGarment({
        id: "g1",
        colors: ["hsl(0, 70%, 55%)", "hsl(210, 70%, 55%)"],
      }),
      createGarment({ id: "g2", colors: ["hsl(5, 80%, 50%)"] }),
    ];
    const result = aggregateByColor(garments);
    const red = result.find((c) => c.colorName === "red");
    const blue = result.find((c) => c.colorName === "blue");
    expect(red?.count).toBe(2);
    expect(blue?.count).toBe(1);
  });
});

describe("aggregateByBrand", () => {
  it("空配列で空結果を返す", () => {
    expect(aggregateByBrand({ garments: [] })).toEqual([]);
  });

  it("brandがundefinedの服は除外する", () => {
    const garments = [
      createGarment({ brand: undefined }),
      createGarment({ id: "g2", brand: "Volks" }),
    ];
    const result = aggregateByBrand({ garments });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ brand: "Volks", count: 1 });
  });

  it("空文字のbrandは除外する", () => {
    const garments = [createGarment({ brand: "" })];
    expect(aggregateByBrand({ garments })).toEqual([]);
  });

  it("降順で上位N件を返す", () => {
    const garments = [
      createGarment({ id: "g1", brand: "A" }),
      createGarment({ id: "g2", brand: "A" }),
      createGarment({ id: "g3", brand: "B" }),
      createGarment({ id: "g4", brand: "C" }),
    ];
    const result = aggregateByBrand({ garments, topN: 2 });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ brand: "A", count: 2 });
  });
});
