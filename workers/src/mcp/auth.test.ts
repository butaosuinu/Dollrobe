import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { resolveMcpAuth } from "./auth";
import { createApiKeyAuthStub } from "../test/mcp-helpers";

const TEST_USER_IDS = ["user-1", "user-2", "user-3", "user-frozen"];

const headersWith = (auth: string | undefined): Headers => {
  const headers = new Headers();
  if (auth !== undefined) {
    headers.set("authorization", auth);
  }
  return headers;
};

const insertUser = async ({
  id,
  frozen,
}: {
  readonly id: string;
  readonly frozen: boolean;
}): Promise<void> => {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO "user" (id, name, email, emailVerified, image, role, frozen, createdAt, updatedAt)
     VALUES (?, ?, ?, 0, NULL, 'user', ?, ?, ?)`,
  )
    .bind(id, `Name ${id}`, `${id}@example.com`, frozen ? 1 : 0, now, now)
    .run();
};

const cleanupUsers = async (): Promise<void> => {
  const placeholders = TEST_USER_IDS.map(() => "?").join(", ");
  await env.DB.prepare(`DELETE FROM "user" WHERE id IN (${placeholders})`)
    .bind(...TEST_USER_IDS)
    .run();
};

beforeEach(cleanupUsers);
afterEach(cleanupUsers);

describe("resolveMcpAuth", () => {
  it("returns undefined when Authorization header is missing", async () => {
    const verify = vi.fn();
    const result = await resolveMcpAuth({
      auth: createApiKeyAuthStub(verify),
      db: env.DB,
      headers: headersWith(undefined),
    });
    expect(result).toBeUndefined();
    expect(verify).not.toHaveBeenCalled();
  });

  it("returns undefined for non-Bearer authorization scheme", async () => {
    const verify = vi.fn();
    const result = await resolveMcpAuth({
      auth: createApiKeyAuthStub(verify),
      db: env.DB,
      headers: headersWith("Basic dXNlcjpwYXNz"),
    });
    expect(result).toBeUndefined();
    expect(verify).not.toHaveBeenCalled();
  });

  it("returns undefined when Bearer key is empty", async () => {
    const verify = vi.fn();
    const result = await resolveMcpAuth({
      auth: createApiKeyAuthStub(verify),
      db: env.DB,
      headers: headersWith("Bearer "),
    });
    expect(result).toBeUndefined();
    expect(verify).not.toHaveBeenCalled();
  });

  it("returns undefined when verifyApiKey reports invalid", async () => {
    const verify = vi.fn().mockResolvedValue({ valid: false });
    const result = await resolveMcpAuth({
      auth: createApiKeyAuthStub(verify),
      db: env.DB,
      headers: headersWith("Bearer abc123"),
    });
    expect(result).toBeUndefined();
    expect(verify).toHaveBeenCalledWith({ body: { key: "abc123" } });
  });

  it("returns undefined when verifyApiKey throws", async () => {
    const verify = vi.fn().mockRejectedValue(new Error("DB error"));
    const result = await resolveMcpAuth({
      auth: createApiKeyAuthStub(verify),
      db: env.DB,
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
      auth: createApiKeyAuthStub(verify),
      db: env.DB,
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
      auth: createApiKeyAuthStub(verify),
      db: env.DB,
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
      auth: createApiKeyAuthStub(verify),
      db: env.DB,
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
      auth: createApiKeyAuthStub(verify),
      db: env.DB,
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
      auth: createApiKeyAuthStub(verify),
      db: env.DB,
      headers: headersWith("bearer xyz"),
    });
    expect(result).toEqual({ userId: "user-3", scope: "read" });
  });

  it("returns undefined when resolved user is frozen", async () => {
    await insertUser({ id: "user-frozen", frozen: true });
    const verify = vi.fn().mockResolvedValue({
      valid: true,
      key: { referenceId: "user-frozen", permissions: { mcp: ["read"] } },
    });
    const result = await resolveMcpAuth({
      auth: createApiKeyAuthStub(verify),
      db: env.DB,
      headers: headersWith("Bearer key-frozen"),
    });
    expect(result).toBeUndefined();
  });

  it("returns scope when resolved user is active (frozen=false)", async () => {
    await insertUser({ id: "user-1", frozen: false });
    const verify = vi.fn().mockResolvedValue({
      valid: true,
      key: { referenceId: "user-1", permissions: { mcp: ["read"] } },
    });
    const result = await resolveMcpAuth({
      auth: createApiKeyAuthStub(verify),
      db: env.DB,
      headers: headersWith("Bearer key-active"),
    });
    expect(result).toEqual({ userId: "user-1", scope: "read" });
  });
});
