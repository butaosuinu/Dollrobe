import { beforeEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/lib/auth");

// vi.mock factory は hoist されるため client も vi.hoisted で巻き上げる。
// client 参照は immutable のまま、各テストで vi.fn の mockResolvedValue を
// 上書きして使う (vi.resetAllMocks で履歴と return 値をリセット)。
const { client } = vi.hoisted(() => ({
  client: {
    getSession: vi.fn(),
    listAccounts: vi.fn(),
    signIn: { email: vi.fn(), social: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
    updateUser: vi.fn(),
    changeEmail: vi.fn(),
    changePassword: vi.fn(),
    $fetch: vi.fn(),
    apiKey: { create: vi.fn(), list: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("better-auth/react", () => ({
  createAuthClient: () => client,
}));

vi.mock("@better-auth/api-key/client", () => ({
  apiKeyClient: () => ({}),
}));

vi.mock("@/lib/workersUrl", () => ({
  WORKERS_URL_FOR_FETCH: "http://localhost:8787",
}));

describe("@/lib/auth API キー操作", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it("createApiKey 成功時に正規化されたオブジェクトを返す (read-write)", async () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    client.apiKey.create.mockResolvedValue({
      data: {
        id: "k-1",
        name: "agent",
        enabled: true,
        createdAt,
        key: "raw_key",
      },
      error: null,
    });
    const { createApiKey, API_KEY_SCOPE } = await import("@/lib/auth");
    const result = await createApiKey({
      name: "agent",
      scope: API_KEY_SCOPE.READ_WRITE,
    });
    expect(result.key).toBe("raw_key");
    expect(result.scope).toBe(API_KEY_SCOPE.READ_WRITE);
    expect(result.createdAt).toBe(createdAt.getTime());
    expect(result.lastRequestAt).toBeUndefined();
  });

  it("createApiKey: name 欠落時は input.name を fallback", async () => {
    client.apiKey.create.mockResolvedValue({
      data: { id: "k-1", name: null, enabled: true, createdAt: 0, key: "raw" },
      error: null,
    });
    const { createApiKey, API_KEY_SCOPE } = await import("@/lib/auth");
    const result = await createApiKey({
      name: "fallback",
      scope: API_KEY_SCOPE.READ_ONLY,
    });
    expect(result.name).toBe("fallback");
  });

  it("createApiKey: error 時 throw", async () => {
    client.apiKey.create.mockResolvedValue({
      data: null,
      error: { message: "no" },
    });
    const { createApiKey, API_KEY_SCOPE } = await import("@/lib/auth");
    await expect(
      createApiKey({ name: "n", scope: API_KEY_SCOPE.READ_ONLY }),
    ).rejects.toThrow("no");
  });

  it("createApiKey: error.message 無しは既定 throw", async () => {
    client.apiKey.create.mockResolvedValue({
      data: null,
      error: {},
    });
    const { createApiKey, API_KEY_SCOPE } = await import("@/lib/auth");
    await expect(
      createApiKey({ name: "n", scope: API_KEY_SCOPE.READ_ONLY }),
    ).rejects.toThrow("Failed to create API key");
  });

  it("listApiKeys: permissions の write を含む場合は read-write", async () => {
    client.apiKey.list.mockResolvedValue({
      data: {
        apiKeys: [
          {
            id: "k-1",
            name: "agent",
            permissions: { all: ["read", "write"] },
            createdAt: 1000,
            lastRequest: 2000,
            enabled: true,
          },
        ],
      },
      error: null,
    });
    const { listApiKeys, API_KEY_SCOPE } = await import("@/lib/auth");
    const res = await listApiKeys();
    expect(res[0]?.scope).toBe(API_KEY_SCOPE.READ_WRITE);
    expect(res[0]?.lastRequestAt).toBe(2000);
  });

  it("listApiKeys: name 無いと空文字、permissions 無いと read-only", async () => {
    client.apiKey.list.mockResolvedValue({
      data: {
        apiKeys: [
          {
            id: "k-1",
            name: null,
            permissions: null,
            createdAt: 1000,
            lastRequest: null,
            enabled: true,
          },
        ],
      },
      error: null,
    });
    const { listApiKeys, API_KEY_SCOPE } = await import("@/lib/auth");
    const res = await listApiKeys();
    expect(res[0]?.name).toBe("");
    expect(res[0]?.scope).toBe(API_KEY_SCOPE.READ_ONLY);
    expect(res[0]?.lastRequestAt).toBeUndefined();
  });

  it("listApiKeys: permissions が無効な形式の場合も read-only にフォールバック", async () => {
    client.apiKey.list.mockResolvedValue({
      data: {
        apiKeys: [
          {
            id: "k-1",
            name: "x",
            permissions: 42,
            createdAt: 1000,
            lastRequest: undefined,
            enabled: true,
          },
        ],
      },
      error: null,
    });
    const { listApiKeys, API_KEY_SCOPE } = await import("@/lib/auth");
    const res = await listApiKeys();
    expect(res[0]?.scope).toBe(API_KEY_SCOPE.READ_ONLY);
  });

  it("listApiKeys: createdAt が ISO 文字列でも数値に変換される", async () => {
    const iso = "2026-03-10T12:00:00Z";
    const expected = new Date(iso).getTime();
    client.apiKey.list.mockResolvedValue({
      data: {
        apiKeys: [
          {
            id: "k-1",
            name: "x",
            permissions: { all: ["read"] },
            createdAt: iso,
            lastRequest: undefined,
            enabled: true,
          },
        ],
      },
      error: null,
    });
    const { listApiKeys } = await import("@/lib/auth");
    const res = await listApiKeys();
    expect(res[0]?.createdAt).toBe(expected);
  });

  it("listApiKeys: error 時 throw", async () => {
    client.apiKey.list.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });
    const { listApiKeys } = await import("@/lib/auth");
    await expect(listApiKeys()).rejects.toThrow("boom");
  });

  it("listApiKeys: error.message 無しは既定 throw", async () => {
    client.apiKey.list.mockResolvedValue({
      data: null,
      error: {},
    });
    const { listApiKeys } = await import("@/lib/auth");
    await expect(listApiKeys()).rejects.toThrow("Failed to list API keys");
  });

  it("revokeApiKey: 成功", async () => {
    client.apiKey.delete.mockResolvedValue({ error: null });
    const { revokeApiKey } = await import("@/lib/auth");
    await expect(revokeApiKey("k-1")).resolves.toBeUndefined();
  });

  it("revokeApiKey: error", async () => {
    client.apiKey.delete.mockResolvedValue({
      error: { message: "no" },
    });
    const { revokeApiKey } = await import("@/lib/auth");
    await expect(revokeApiKey("k-1")).rejects.toThrow("no");
  });

  it("revokeApiKey: 既定 error", async () => {
    client.apiKey.delete.mockResolvedValue({ error: {} });
    const { revokeApiKey } = await import("@/lib/auth");
    await expect(revokeApiKey("k-1")).rejects.toThrow(
      "Failed to revoke API key",
    );
  });
});
