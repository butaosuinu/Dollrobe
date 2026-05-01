import { describe, it, expect } from "vitest";
import { TRPCError } from "@trpc/server";
import { wrapDbError } from "./d1-helpers";
import { createTestLogger } from "../../test/helpers";

const testLogger = createTestLogger();

describe("wrapDbError", () => {
  it("Error インスタンスの場合は err.message を使用する", () => {
    const handler = wrapDbError({
      context: "fetch garment",
      logger: testLogger,
    });

    expect(() => handler(new Error("connection refused"))).toThrow(TRPCError);
    expect(() => handler(new Error("connection refused"))).toThrow(
      "connection refused",
    );
  });

  it("Error 以外の場合はコンテキスト付きメッセージを使用する", () => {
    const handler = wrapDbError({
      context: "delete garment",
      logger: testLogger,
    });

    expect(() => handler("unknown error")).toThrow(TRPCError);
    expect(() => handler("unknown error")).toThrow("Failed to delete garment");
  });

  it("INTERNAL_SERVER_ERROR コードを設定する", () => {
    const handler = wrapDbError({
      context: "update garment",
      logger: testLogger,
    });
    const result = expect(() => handler(new Error("test")));

    result.toThrow(TRPCError);
  });
});
