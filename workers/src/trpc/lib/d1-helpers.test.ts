import { describe, expect, it } from "vitest";
import { toStorageCase, toStorageLocation, generateLabel } from "./d1-helpers";
import type { StorageCaseRow, StorageLocationRow } from "./d1-helpers";

describe("toStorageCase", () => {
  it("snake_case の行を camelCase の StorageCase に変換する", () => {
    const row: StorageCaseRow = {
      id: "case-001",
      user_id: "user-001",
      name: "衣装ケース A",
      rows: 5,
      cols: 3,
      created_at: 1700000000000,
    };

    const result = toStorageCase(row);

    expect(result).toStrictEqual({
      id: "case-001",
      userId: "user-001",
      name: "衣装ケース A",
      rows: 5,
      cols: 3,
      createdAt: 1700000000000,
    });
  });
});

describe("toStorageLocation", () => {
  it("snake_case の行を camelCase の StorageLocation に変換する", () => {
    const row: StorageLocationRow = {
      id: "loc-001",
      user_id: "user-001",
      case_id: "case-001",
      label: "A-1",
      row_num: 0,
      col_num: 0,
      created_at: 1700000000000,
    };

    const result = toStorageLocation(row);

    expect(result).toStrictEqual({
      id: "loc-001",
      userId: "user-001",
      caseId: "case-001",
      label: "A-1",
      row: 0,
      col: 0,
      createdAt: 1700000000000,
    });
  });
});

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
});
