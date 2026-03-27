import { describe, it, expect } from "vitest";
import { validateCsvRow, generateSampleCsv } from "./validateCsvRow";

describe("validateCsvRow", () => {
  const validRecord = {
    name: "レースドレス",
    category: "dress",
    dollSize: "MSD",
    colors: "hsl(0,0%,100%)|hsl(350,80%,60%)",
    tags: "レース|フォーマル",
    brand: "ボークス",
    confidenceDecayDays: "30",
  };

  it("有効な行をパースする", () => {
    const result = validateCsvRow({ record: validRecord, rowNumber: 1 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("レースドレス");
      expect(result.data.category).toBe("dress");
      expect(result.data.dollSize).toBe("MSD");
      expect(result.data.colors).toEqual([
        "hsl(0,0%,100%)",
        "hsl(350,80%,60%)",
      ]);
      expect(result.data.tags).toEqual(["レース", "フォーマル"]);
      expect(result.data.brand).toBe("ボークス");
      expect(result.data.confidenceDecayDays).toBe(30);
    }
  });

  it("必須フィールドのみでも有効", () => {
    const result = validateCsvRow({
      record: { name: "テスト", category: "tops", dollSize: "SD" },
      rowNumber: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.colors).toEqual([]);
      expect(result.data.tags).toEqual([]);
      expect(result.data.brand).toBe("");
      expect(result.data.confidenceDecayDays).toBe(30);
    }
  });

  it("名前が空の場合はエラー", () => {
    const result = validateCsvRow({
      record: { ...validRecord, name: "" },
      rowNumber: 2,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.field).toBe("name");
      expect(result.errors[0]?.row).toBe(2);
    }
  });

  it("名前が100文字を超える場合はエラー", () => {
    const result = validateCsvRow({
      record: { ...validRecord, name: "あ".repeat(101) },
      rowNumber: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.field).toBe("name");
    }
  });

  it("無効なカテゴリの場合はエラー", () => {
    const result = validateCsvRow({
      record: { ...validRecord, category: "invalid" },
      rowNumber: 3,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.field).toBe("category");
    }
  });

  it("無効なドールサイズの場合はエラー", () => {
    const result = validateCsvRow({
      record: { ...validRecord, dollSize: "XXL" },
      rowNumber: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.field).toBe("dollSize");
    }
  });

  it("ブランドが100文字を超える場合はエラー", () => {
    const result = validateCsvRow({
      record: { ...validRecord, brand: "A".repeat(101) },
      rowNumber: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.field).toBe("brand");
    }
  });

  it("減衰期間が範囲外の場合はエラー", () => {
    const result = validateCsvRow({
      record: { ...validRecord, confidenceDecayDays: "0" },
      rowNumber: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.field).toBe("confidenceDecayDays");
    }
  });

  it("減衰期間が小数の場合はエラー", () => {
    const result = validateCsvRow({
      record: { ...validRecord, confidenceDecayDays: "30.5" },
      rowNumber: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.field).toBe("confidenceDecayDays");
    }
  });

  it("減衰期間が数値でない場合はエラー", () => {
    const result = validateCsvRow({
      record: { ...validRecord, confidenceDecayDays: "abc" },
      rowNumber: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.field).toBe("confidenceDecayDays");
    }
  });

  it("複数フィールドのエラーを返す", () => {
    const result = validateCsvRow({
      record: { name: "", category: "invalid", dollSize: "XXL" },
      rowNumber: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBe(3);
    }
  });

  it("colorsの空文字列は空配列になる", () => {
    const result = validateCsvRow({
      record: { ...validRecord, colors: "" },
      rowNumber: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.colors).toEqual([]);
    }
  });

  it("tagsの空文字列は空配列になる", () => {
    const result = validateCsvRow({
      record: { ...validRecord, tags: "" },
      rowNumber: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.tags).toEqual([]);
    }
  });
});

describe("generateSampleCsv", () => {
  it("有効なCSVを生成する", () => {
    const csv = generateSampleCsv();
    const lines = csv.split("\n");
    expect(lines.length).toBe(3);
    expect(lines[0]).toContain("name");
    expect(lines[0]).toContain("category");
    expect(lines[0]).toContain("dollSize");
  });
});
