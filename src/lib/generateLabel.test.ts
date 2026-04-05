import { describe, it, expect } from "vitest";
import { generateLabel } from "./generateLabel";

describe("generateLabel", () => {
  it("row=0, col=0 のとき A-1 を返す", () => {
    expect(generateLabel({ row: 0, col: 0 })).toBe("A-1");
  });

  it("row=0, col=2 のとき A-3 を返す", () => {
    expect(generateLabel({ row: 0, col: 2 })).toBe("A-3");
  });

  it("row=1, col=0 のとき B-1 を返す", () => {
    expect(generateLabel({ row: 1, col: 0 })).toBe("B-1");
  });

  it("row=2, col=4 のとき C-5 を返す", () => {
    expect(generateLabel({ row: 2, col: 4 })).toBe("C-5");
  });

  it("row=25, col=0 のとき Z-1 を返す", () => {
    expect(generateLabel({ row: 25, col: 0 })).toBe("Z-1");
  });

  it("row=26 のとき例外をスローする", () => {
    expect(() => generateLabel({ row: 26, col: 0 })).toThrow();
  });
});
