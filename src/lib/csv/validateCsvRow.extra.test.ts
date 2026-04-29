import { describe, it, expect } from "vitest";
import { validateCsvRow, generateSampleCsv } from "./validateCsvRow";
import { CSV_IMPORT } from "@/lib/constants";

describe("validateCsvRow (extra branches)", () => {
  const validRecord = {
    name: "ドール服",
    category: "tops",
    dollSize: "SD",
    colors: "",
    tags: "",
    brand: "",
    confidenceDecayDays: "",
  };

  it("name フィールドが完全に欠落している場合は必須エラー", () => {
    const result = validateCsvRow({
      record: { category: "tops", dollSize: "SD" },
      rowNumber: 5,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.field).toBe("name");
      expect(result.errors[0]?.row).toBe(5);
    }
  });

  it("category フィールドが完全に欠落している場合は必須エラー", () => {
    const result = validateCsvRow({
      record: { name: "テスト", dollSize: "SD" },
      rowNumber: 7,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const field = result.errors.find((e) => e.field === "category");
      expect(field).toBeDefined();
      expect(field?.message).toBe("カテゴリは必須です");
    }
  });

  it("dollSize フィールドが完全に欠落している場合は必須エラー", () => {
    const result = validateCsvRow({
      record: { name: "テスト", category: "tops" },
      rowNumber: 9,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const field = result.errors.find((e) => e.field === "dollSize");
      expect(field).toBeDefined();
      expect(field?.message).toBe("ドールサイズは必須です");
    }
  });

  it("空白のみの name は必須エラー（trim 後 空文字）", () => {
    const result = validateCsvRow({
      record: { ...validRecord, name: "   " },
      rowNumber: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.field).toBe("name");
    }
  });

  it("confidenceDecayDays が上限を超える場合はエラー", () => {
    const result = validateCsvRow({
      record: { ...validRecord, confidenceDecayDays: "366" },
      rowNumber: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.field).toBe("confidenceDecayDays");
    }
  });

  it("confidenceDecayDays が負の整数の場合はエラー", () => {
    const result = validateCsvRow({
      record: { ...validRecord, confidenceDecayDays: "-5" },
      rowNumber: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.field).toBe("confidenceDecayDays");
    }
  });

  it("confidenceDecayDays が境界値 1 の場合は有効", () => {
    const result = validateCsvRow({
      record: { ...validRecord, confidenceDecayDays: "1" },
      rowNumber: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.confidenceDecayDays).toBe(1);
    }
  });

  it("confidenceDecayDays が境界値 365 の場合は有効", () => {
    const result = validateCsvRow({
      record: { ...validRecord, confidenceDecayDays: "365" },
      rowNumber: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.confidenceDecayDays).toBe(365);
    }
  });

  it("brand が境界値（100文字ちょうど）の場合は有効", () => {
    const result = validateCsvRow({
      record: { ...validRecord, brand: "あ".repeat(100) },
      rowNumber: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.brand.length).toBe(100);
    }
  });

  it("name が境界値（100文字ちょうど）の場合は有効", () => {
    const result = validateCsvRow({
      record: { ...validRecord, name: "あ".repeat(100) },
      rowNumber: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name.length).toBe(100);
    }
  });

  it("colors の各エントリは空白を除去されてパースされる", () => {
    const result = validateCsvRow({
      record: { ...validRecord, colors: " hsl(0,0%,100%) | hsl(120,50%,50%) " },
      rowNumber: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.colors).toEqual([
        "hsl(0,0%,100%)",
        "hsl(120,50%,50%)",
      ]);
    }
  });

  it("tags の各エントリは空白を除去されてパースされる", () => {
    const result = validateCsvRow({
      record: { ...validRecord, tags: " レース | フォーマル " },
      rowNumber: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.tags).toEqual(["レース", "フォーマル"]);
    }
  });

  it("brand が空白のみの場合は trim 後 空文字として扱う", () => {
    const result = validateCsvRow({
      record: { ...validRecord, brand: "   " },
      rowNumber: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.brand).toBe("");
    }
  });

  it("空のレコード（全フィールド undefined）は必須3項目すべてエラー", () => {
    const result = validateCsvRow({ record: {}, rowNumber: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBe(3);
      const fields = result.errors.map((e) => e.field).sort();
      expect(fields).toEqual(["category", "dollSize", "name"]);
    }
  });
});

describe("generateSampleCsv (extra)", () => {
  it("ヘッダー行はすべての ALL_HEADERS を含む", () => {
    const csv = generateSampleCsv();
    const headerLine = csv.split("\n")[0] ?? "";
    CSV_IMPORT.ALL_HEADERS.forEach((header) => {
      expect(headerLine).toContain(header);
    });
  });

  it("生成されたサンプル CSV はパース可能な行を含む", () => {
    const csv = generateSampleCsv();
    const lines = csv.split("\n");
    expect(lines.length).toBe(3);
    expect(lines[1]).toContain("dress");
    expect(lines[2]).toContain("bottoms");
  });
});
