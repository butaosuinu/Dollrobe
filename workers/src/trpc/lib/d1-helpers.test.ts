import { describe, it, expect } from "vitest";
import { toGarment, type GarmentRow } from "./d1-helpers";

const createRow = (overrides: Partial<GarmentRow> = {}): GarmentRow => ({
  id: "test-id-001",
  user_id: "user-001",
  name: "テストドレス",
  category: "dress",
  doll_size: "MSD",
  colors: '["hsl(0,100%,50%)","hsl(120,50%,50%)"]',
  tags: '["lolita","gothic"]',
  image_url: "https://example.com/image.jpg",
  location_id: "loc-001",
  status: "stored",
  last_scanned_at: 1700000000000,
  confidence_decay_days: 30,
  checked_out_at: 1699000000000,
  created_at: 1698000000000,
  updated_at: 1700000000000,
  ...overrides,
});

describe("toGarment", () => {
  it("snake_case を camelCase に変換する", () => {
    const row = createRow();
    const garment = toGarment(row);

    expect(garment.id).toBe("test-id-001");
    expect(garment.userId).toBe("user-001");
    expect(garment.dollSize).toBe("MSD");
    expect(garment.lastScannedAt).toBe(1700000000000);
    expect(garment.confidenceDecayDays).toBe(30);
    expect(garment.checkedOutAt).toBe(1699000000000);
    expect(garment.createdAt).toBe(1698000000000);
    expect(garment.updatedAt).toBe(1700000000000);
  });

  it("null を undefined に変換する", () => {
    const row = createRow({
      image_url: null,
      location_id: null,
      checked_out_at: null,
    });
    const garment = toGarment(row);

    expect(garment.imageUrl).toBeUndefined();
    expect(garment.locationId).toBeUndefined();
    expect(garment.checkedOutAt).toBeUndefined();
  });

  it("null でない値はそのまま保持する", () => {
    const row = createRow({
      image_url: "https://example.com/photo.png",
      location_id: "loc-abc",
      checked_out_at: 1699500000000,
    });
    const garment = toGarment(row);

    expect(garment.imageUrl).toBe("https://example.com/photo.png");
    expect(garment.locationId).toBe("loc-abc");
    expect(garment.checkedOutAt).toBe(1699500000000);
  });

  it("JSON 文字列を配列にパースする", () => {
    const row = createRow({
      colors: '["red","blue","green"]',
      tags: '["summer","casual"]',
    });
    const garment = toGarment(row);

    expect(garment.colors).toEqual(["red", "blue", "green"]);
    expect(garment.tags).toEqual(["summer", "casual"]);
  });

  it("空の JSON 配列をパースする", () => {
    const row = createRow({
      colors: "[]",
      tags: "[]",
    });
    const garment = toGarment(row);

    expect(garment.colors).toEqual([]);
    expect(garment.tags).toEqual([]);
  });

  it("不正な category でエラーを投げる", () => {
    const row = createRow({ category: "invalid_category" });

    expect(() => toGarment(row)).toThrow("Invalid category: invalid_category");
  });

  it("不正な doll_size でエラーを投げる", () => {
    const row = createRow({ doll_size: "invalid_size" });

    expect(() => toGarment(row)).toThrow("Invalid doll_size: invalid_size");
  });

  it("不正な status でエラーを投げる", () => {
    const row = createRow({ status: "invalid_status" });

    expect(() => toGarment(row)).toThrow("Invalid status: invalid_status");
  });

  it("全ての GarmentCategory を正しく変換する", () => {
    const categories = [
      "tops",
      "bottoms",
      "dress",
      "outer",
      "shoes",
      "accessory",
      "other",
    ] as const;

    categories.forEach((category) => {
      const row = createRow({ category });
      const garment = toGarment(row);
      expect(garment.category).toBe(category);
    });
  });

  it("全ての DollSize を正しく変換する", () => {
    const sizes = ["1/3", "MSD", "SD", "YoSD", "1/6", "other"] as const;

    sizes.forEach((size) => {
      const row = createRow({ doll_size: size });
      const garment = toGarment(row);
      expect(garment.dollSize).toBe(size);
    });
  });
});
