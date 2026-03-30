import { describe, it, expect } from "vitest";
import {
  opencvHsvToHsl,
  hslToString,
  parseHslString,
  hslDistance,
  findNearestPresetColor,
  mapToPresetColors,
} from "./color-utils";
import type { Hsl } from "./color-utils";

describe("opencvHsvToHsl", () => {
  it("純赤 (H=0, S=255, V=255) を HSL(0, 100%, 50%) に変換する", () => {
    expect(opencvHsvToHsl({ h: 0, s: 255, v: 255 })).toEqual({
      h: 0,
      s: 100,
      l: 50,
    });
  });

  it("純緑 (H=60, S=255, V=255) を HSL(120, 100%, 50%) に変換する", () => {
    expect(opencvHsvToHsl({ h: 60, s: 255, v: 255 })).toEqual({
      h: 120,
      s: 100,
      l: 50,
    });
  });

  it("純青 (H=120, S=255, V=255) を HSL(240, 100%, 50%) に変換する", () => {
    expect(opencvHsvToHsl({ h: 120, s: 255, v: 255 })).toEqual({
      h: 240,
      s: 100,
      l: 50,
    });
  });

  it("白 (H=0, S=0, V=255) を HSL(0, 0%, 100%) に変換する", () => {
    expect(opencvHsvToHsl({ h: 0, s: 0, v: 255 })).toEqual({
      h: 0,
      s: 0,
      l: 100,
    });
  });

  it("黒 (H=0, S=0, V=0) を HSL(0, 0%, 0%) に変換する", () => {
    expect(opencvHsvToHsl({ h: 0, s: 0, v: 0 })).toEqual({
      h: 0,
      s: 0,
      l: 0,
    });
  });

  it("グレー (H=0, S=0, V=128) を HSL(0, 0%, 50%) に変換する", () => {
    const result = opencvHsvToHsl({ h: 0, s: 0, v: 128 });
    expect(result.h).toBe(0);
    expect(result.s).toBe(0);
    expect(result.l).toBeCloseTo(50, 0);
  });
});

describe("hslToString", () => {
  it("HSL オブジェクトを文字列に変換する", () => {
    expect(hslToString({ h: 210, s: 70, l: 55 })).toBe("hsl(210, 70%, 55%)");
  });

  it("黒を正しくフォーマットする", () => {
    expect(hslToString({ h: 0, s: 0, l: 10 })).toBe("hsl(0, 0%, 10%)");
  });
});

describe("parseHslString", () => {
  it("有効な HSL 文字列をパースする", () => {
    expect(parseHslString("hsl(210, 70%, 55%)")).toEqual({
      h: 210,
      s: 70,
      l: 55,
    });
  });

  it("黒のプリセット色をパースする", () => {
    expect(parseHslString("hsl(0, 0%, 10%)")).toEqual({
      h: 0,
      s: 0,
      l: 10,
    });
  });

  it("不正な文字列で undefined を返す", () => {
    expect(parseHslString("rgb(255, 0, 0)")).toBeUndefined();
  });

  it("空文字列で undefined を返す", () => {
    expect(parseHslString("")).toBeUndefined();
  });
});

describe("hslDistance", () => {
  it("同一色の距離は 0", () => {
    const color: Hsl = { h: 210, s: 70, l: 55 };
    expect(hslDistance({ a: color, b: color })).toBe(0);
  });

  it("色相が近い色の距離は小さい", () => {
    const a: Hsl = { h: 0, s: 70, l: 55 };
    const b: Hsl = { h: 10, s: 70, l: 55 };
    expect(hslDistance({ a, b })).toBeLessThan(0.1);
  });

  it("補色の距離は大きい", () => {
    const red: Hsl = { h: 0, s: 100, l: 50 };
    const cyan: Hsl = { h: 180, s: 100, l: 50 };
    expect(hslDistance({ a: red, b: cyan })).toBeGreaterThan(0.8);
  });

  it("色相の円環距離を正しく計算する（350° と 10° は近い）", () => {
    const a: Hsl = { h: 350, s: 70, l: 55 };
    const b: Hsl = { h: 10, s: 70, l: 55 };
    const distance = hslDistance({ a, b });
    expect(distance).toBeLessThan(0.2);
  });
});

describe("findNearestPresetColor", () => {
  it("赤に近い色はプリセットの赤にマッピングされる", () => {
    const result = findNearestPresetColor({ hsl: { h: 5, s: 65, l: 50 } });
    expect(result).toBe("hsl(0, 70%, 55%)");
  });

  it("青に近い色はプリセットの青にマッピングされる", () => {
    const result = findNearestPresetColor({ hsl: { h: 215, s: 75, l: 50 } });
    expect(result).toBe("hsl(210, 70%, 55%)");
  });

  it("黒に近い色はプリセットの黒にマッピングされる", () => {
    const result = findNearestPresetColor({ hsl: { h: 0, s: 0, l: 5 } });
    expect(result).toBe("hsl(0, 0%, 10%)");
  });

  it("白に近い色はプリセットの白にマッピングされる", () => {
    const result = findNearestPresetColor({ hsl: { h: 0, s: 0, l: 98 } });
    expect(result).toBe("hsl(0, 0%, 95%)");
  });
});

describe("mapToPresetColors", () => {
  it("複数の色をプリセットにマッピングする", () => {
    const result = mapToPresetColors({
      colors: [
        { h: 5, s: 65, l: 50 },
        { h: 215, s: 75, l: 50 },
      ],
    });
    expect(result).toContain("hsl(0, 70%, 55%)");
    expect(result).toContain("hsl(210, 70%, 55%)");
  });

  it("同じプリセットにマッピングされる色は重複除去される", () => {
    const result = mapToPresetColors({
      colors: [
        { h: 0, s: 65, l: 50 },
        { h: 5, s: 70, l: 55 },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("hsl(0, 70%, 55%)");
  });

  it("空配列は空配列を返す", () => {
    expect(mapToPresetColors({ colors: [] })).toEqual([]);
  });
});
