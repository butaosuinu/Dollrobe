import { describe, it, expect, vi } from "vitest";
import type { Auth } from "../auth";
import { resolveMcpAuth } from "./auth";

type VerifyFn = (args: { body: { key: string } }) => Promise<unknown>;

const createMockAuth = (verifyApiKey: VerifyFn): Auth => {
  const stub = {
    api: { verifyApiKey },
  };
  return stub as unknown as Auth;
};

const headersWith = (auth: string | undefined): Headers => {
  const headers = new Headers();
  if (auth !== undefined) {
    headers.set("authorization", auth);
  }
  return headers;
};

describe("resolveMcpAuth", () => {
  it("returns undefined when Authorization header is missing", async () => {
    const verify = vi.fn();
    const result = await resolveMcpAuth({
      auth: createMockAuth(verify),
      headers: headersWith(undefined),
    });
    expect(result).toBeUndefined();
    expect(verify).not.toHaveBeenCalled();
  });

  it("returns undefined for non-Bearer authorization scheme", async () => {
    const verify = vi.fn();
    const result = await resolveMcpAuth({
      auth: createMockAuth(verify),
      headers: headersWith("Basic dXNlcjpwYXNz"),
    });
    expect(result).toBeUndefined();
    expect(verify).not.toHaveBeenCalled();
  });

  it("returns undefined when Bearer key is empty", async () => {
    const verify = vi.fn();
    const result = await resolveMcpAuth({
      auth: createMockAuth(verify),
      headers: headersWith("Bearer "),
    });
    expect(result).toBeUndefined();
    expect(verify).not.toHaveBeenCalled();
  });

  it("returns undefined when verifyApiKey reports invalid", async () => {
    const verify = vi.fn().mockResolvedValue({ valid: false });
    const result = await resolveMcpAuth({
      auth: createMockAuth(verify),
      headers: headersWith("Bearer abc123"),
    });
    expect(result).toBeUndefined();
    expect(verify).toHaveBeenCalledWith({ body: { key: "abc123" } });
  });

  it("returns undefined when verifyApiKey throws", async () => {
    const verify = vi.fn().mockRejectedValue(new Error("DB error"));
    const result = await resolveMcpAuth({
      auth: createMockAuth(verify),
      headers: headersWith("Bearer abc123"),
    });
    expect(result).toBeUndefined();
  });

  it("returns undefined when referenceId is missing", async () => {
    const verify = vi.fn().mockResolvedValue({
      valid: true,
      key: { permissions: { mcp: ["read"] } },
    });
    const result = await resolveMcpAuth({
      auth: createMockAuth(verify),
      headers: headersWith("Bearer abc123"),
    });
    expect(result).toBeUndefined();
  });

  it("returns undefined when permissions has no mcp scope", async () => {
    const verify = vi.fn().mockResolvedValue({
      valid: true,
      key: { referenceId: "user-1", permissions: {} },
    });
    const result = await resolveMcpAuth({
      auth: createMockAuth(verify),
      headers: headersWith("Bearer abc123"),
    });
    expect(result).toBeUndefined();
  });

  it("returns read scope for { mcp: ['read'] }", async () => {
    const verify = vi.fn().mockResolvedValue({
      valid: true,
      key: { referenceId: "user-1", permissions: { mcp: ["read"] } },
    });
    const result = await resolveMcpAuth({
      auth: createMockAuth(verify),
      headers: headersWith("Bearer key-read"),
    });
    expect(result).toEqual({ userId: "user-1", scope: "read" });
  });

  it("returns write scope for { mcp: ['read', 'write'] }", async () => {
    const verify = vi.fn().mockResolvedValue({
      valid: true,
      key: {
        referenceId: "user-2",
        permissions: { mcp: ["read", "write"] },
      },
    });
    const result = await resolveMcpAuth({
      auth: createMockAuth(verify),
      headers: headersWith("Bearer key-write"),
    });
    expect(result).toEqual({ userId: "user-2", scope: "write" });
  });

  it("accepts case-insensitive Bearer scheme", async () => {
    const verify = vi.fn().mockResolvedValue({
      valid: true,
      key: { referenceId: "user-3", permissions: { mcp: ["read"] } },
    });
    const result = await resolveMcpAuth({
      auth: createMockAuth(verify),
      headers: headersWith("bearer xyz"),
    });
    expect(result).toEqual({ userId: "user-3", scope: "read" });
  });
});
