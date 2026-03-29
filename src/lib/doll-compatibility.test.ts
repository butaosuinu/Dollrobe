import { describe, it, expect } from "vitest";
import { canDollWear, filterGarmentsForDoll } from "./doll-compatibility";
import { createTestGarment } from "@/test/factories";

describe("canDollWear", () => {
  it("ドールのボディサイズが服のサイズ配列に含まれていれば true", () => {
    expect(
      canDollWear({ dollBodySize: "SD", garmentSizes: ["SD", "SD13"] }),
    ).toBe(true);
  });

  it("ドールのボディサイズが服のサイズ配列に含まれていなければ false", () => {
    expect(
      canDollWear({ dollBodySize: "MSD", garmentSizes: ["SD", "SD13"] }),
    ).toBe(false);
  });

  it("空の配列には着られない", () => {
    expect(canDollWear({ dollBodySize: "SD", garmentSizes: [] })).toBe(false);
  });

  it("単一サイズの一致", () => {
    expect(canDollWear({ dollBodySize: "YoSD", garmentSizes: ["YoSD"] })).toBe(
      true,
    );
  });
});

describe("filterGarmentsForDoll", () => {
  it("ドールのボディサイズに合う服のみ返す", () => {
    const garments = [
      createTestGarment({ id: "g1", dollSizes: ["SD", "DD_M"] }),
      createTestGarment({ id: "g2", dollSizes: ["MSD"] }),
      createTestGarment({ id: "g3", dollSizes: ["SD", "SD13", "DD_M"] }),
    ];

    const result = filterGarmentsForDoll({
      garments,
      dollBodySize: "SD",
    });

    expect(result).toHaveLength(2);
    expect(result.map((g) => g.id)).toEqual(["g1", "g3"]);
  });

  it("合う服がなければ空配列", () => {
    const garments = [
      createTestGarment({ id: "g1", dollSizes: ["SD"] }),
      createTestGarment({ id: "g2", dollSizes: ["DD_M"] }),
    ];

    const result = filterGarmentsForDoll({
      garments,
      dollBodySize: "YoSD",
    });

    expect(result).toHaveLength(0);
  });

  it("空の服リストには空配列", () => {
    const result = filterGarmentsForDoll({
      garments: [],
      dollBodySize: "SD",
    });

    expect(result).toHaveLength(0);
  });
});
