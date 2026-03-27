import { describe, it, expect } from "vitest";
import { parseCsv, hasRequiredHeaders, mapRowToRecord } from "./parseCsv";

describe("parseCsv", () => {
  it("ヘッダーとデータ行をパースする", () => {
    const csv = "name,category,dollSize\nドレスA,dress,SD\nパンツB,bottoms,MSD";
    const result = parseCsv(csv);
    expect(result.headers).toEqual(["name", "category", "dollSize"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(["ドレスA", "dress", "SD"]);
    expect(result.rows[1]).toEqual(["パンツB", "bottoms", "MSD"]);
  });

  it("空文字列の場合は空の結果を返す", () => {
    const result = parseCsv("");
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it("ヘッダーのみの場合はrows空配列を返す", () => {
    const result = parseCsv("name,category,dollSize\n");
    expect(result.headers).toEqual(["name", "category", "dollSize"]);
    expect(result.rows).toEqual([]);
  });

  it("CRLFの改行を処理する", () => {
    const csv = "name,category\r\nドレス,dress\r\n";
    const result = parseCsv(csv);
    expect(result.headers).toEqual(["name", "category"]);
    expect(result.rows).toHaveLength(1);
  });

  it("引用符付きフィールドを処理する", () => {
    const csv = 'name,colors\n"ドレス A","hsl(0,0%,100%)"';
    const result = parseCsv(csv);
    expect(result.rows[0]).toEqual(["ドレス A", "hsl(0,0%,100%)"]);
  });

  it("引用符内のカンマを保持する", () => {
    const csv = 'name,colors\nドレス,"hsl(0,0%,100%)|hsl(350,80%,60%)"';
    const result = parseCsv(csv);
    expect(result.rows[0]?.[1]).toBe("hsl(0,0%,100%)|hsl(350,80%,60%)");
  });

  it("引用符内のエスケープされた引用符を処理する", () => {
    const csv = 'name\n"ドレス""特別"""';
    const result = parseCsv(csv);
    expect(result.rows[0]?.[0]).toBe('ドレス"特別"');
  });

  it("前後の空白をトリムする", () => {
    const csv = " name , category \n ドレス , dress ";
    const result = parseCsv(csv);
    expect(result.headers).toEqual(["name", "category"]);
    expect(result.rows[0]).toEqual(["ドレス", "dress"]);
  });
});

describe("hasRequiredHeaders", () => {
  it("全必須ヘッダーがある場合はvalidを返す", () => {
    const result = hasRequiredHeaders([
      "name",
      "category",
      "dollSize",
      "brand",
    ]);
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("必須ヘッダーが足りない場合はmissingを返す", () => {
    const result = hasRequiredHeaders(["name", "brand"]);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["category", "dollSize"]);
  });

  it("空のヘッダーの場合は全必須がmissingになる", () => {
    const result = hasRequiredHeaders([]);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["name", "category", "dollSize"]);
  });
});

describe("mapRowToRecord", () => {
  it("ヘッダーとデータをレコードにマッピングする", () => {
    const result = mapRowToRecord({
      headers: ["name", "category", "dollSize"],
      row: ["ドレスA", "dress", "SD"],
    });
    expect(result).toEqual({
      name: "ドレスA",
      category: "dress",
      dollSize: "SD",
    });
  });

  it("データがヘッダーより少ない場合は存在する分だけマッピングする", () => {
    const result = mapRowToRecord({
      headers: ["name", "category", "dollSize"],
      row: ["ドレスA"],
    });
    expect(result).toEqual({ name: "ドレスA" });
  });
});
