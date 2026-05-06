import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  createMcpCaller,
  okResult,
  errorResult,
  toErrorResult,
  forbiddenResult,
} from "./adapter";
import {
  createTestGarmentInput,
  createTestLogger,
  getTestDb,
  resetDatabase,
} from "../test/helpers";

describe("createMcpCaller", () => {
  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("calls tRPC procedures with the provided userId", async () => {
    const caller = createMcpCaller({
      env,
      userId: "mcp-user-001",
      logger: createTestLogger(),
    });

    const created = await caller.garment.create(createTestGarmentInput());

    expect(created.userId).toBe("mcp-user-001");

    const list = await caller.garment.list({});
    expect(list).toHaveLength(1);
    expect(list[0]?.userId).toBe("mcp-user-001");
  });

  it("does not leak data between users", async () => {
    const aliceCaller = createMcpCaller({
      env,
      userId: "alice",
      logger: createTestLogger(),
    });
    const bobCaller = createMcpCaller({
      env,
      userId: "bob",
      logger: createTestLogger(),
    });

    await aliceCaller.garment.create(
      createTestGarmentInput({ name: "Alice's dress" }),
    );

    const bobList = await bobCaller.garment.list({});
    expect(bobList).toHaveLength(0);
  });
});

describe("okResult", () => {
  it("serializes object data as text + structuredContent", () => {
    const data = { id: "abc", tags: ["a", "b"] };
    const result = okResult(data);
    expect(result.content).toEqual([
      { type: "text", text: JSON.stringify(data) },
    ]);
    expect(result.structuredContent).toEqual(data);
    expect(result.isError).toBeUndefined();
  });

  it("omits structuredContent when data is an array (MCP requires object)", () => {
    const data = [{ id: "1" }, { id: "2" }];
    const result = okResult(data);
    expect(result.content[0]?.text).toBe(JSON.stringify(data));
    expect(result.structuredContent).toBeUndefined();
  });

  it("omits structuredContent when data is null/undefined", () => {
    expect(okResult(null).structuredContent).toBeUndefined();
    expect(okResult(undefined).structuredContent).toBeUndefined();
  });

  it("emits a string text field even when data is undefined (MCP TextContent contract)", () => {
    // JSON.stringify(undefined) returns the value undefined (not a string),
    // which would violate MCP TextContent.text: string. Must coerce.
    const result = okResult(undefined);
    expect(typeof result.content[0]?.text).toBe("string");
    expect(result.content[0]?.text).toBe("null");
  });

  it("emits the JSON literal for null", () => {
    expect(okResult(null).content[0]?.text).toBe("null");
  });
});

describe("errorResult / forbiddenResult", () => {
  it("returns isError true with serialized message", () => {
    const result = errorResult("Forbidden", "FORBIDDEN");
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toBe(
      JSON.stringify({ error: "Forbidden", code: "FORBIDDEN" }),
    );
  });

  it("omits code when not provided", () => {
    const result = errorResult("Internal error");
    expect(result.content[0]?.text).toBe(
      JSON.stringify({ error: "Internal error" }),
    );
  });

  it("forbiddenResult interpolates the required scope", () => {
    const result = forbiddenResult("write");
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("write scope required");
    expect(result.content[0]?.text).toContain("FORBIDDEN");
  });
});

describe("toErrorResult", () => {
  it("preserves TRPCError code and message", () => {
    const err = new TRPCError({
      code: "NOT_FOUND",
      message: "Garment missing",
    });
    const result = toErrorResult(err);
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("Garment missing");
    expect(result.content[0]?.text).toContain("NOT_FOUND");
  });

  it("preserves plain Error message without code", () => {
    const result = toErrorResult(new Error("boom"));
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toBe(JSON.stringify({ error: "boom" }));
  });

  it("falls back to 'Unknown error' for non-Error throws", () => {
    const result = toErrorResult("string thrown");
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toBe(
      JSON.stringify({ error: "Unknown error" }),
    );
  });
});
