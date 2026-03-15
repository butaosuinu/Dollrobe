import { describe, it, expect } from "vitest";
import { TRPCError } from "@trpc/server";
import { wrapDbError, generateLabel } from "./d1-helpers";

describe("wrapDbError", () => {
  it("Error インスタンスの場合は err.message を使用する", () => {
    const handler = wrapDbError("fetch garment");

    expect(() => handler(new Error("connection refused"))).toThrow(TRPCError);
    expect(() => handler(new Error("connection refused"))).toThrow(
      "connection refused",
    );
  });

  it("Error 以外の場合はコンテキスト付きメッセージを使用する", () => {
    const handler = wrapDbError("delete garment");

    expect(() => handler("unknown error")).toThrow(TRPCError);
    expect(() => handler("unknown error")).toThrow("Failed to delete garment");
  });

  it("INTERNAL_SERVER_ERROR コードを設定する", () => {
    const handler = wrapDbError("update garment");
    const result = expect(() => handler(new Error("test")));

    result.toThrow(TRPCError);
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

  it("row=26 のとき例外をスローする", () => {
    expect(() => generateLabel({ row: 26, col: 0 })).toThrow();
  });
});
