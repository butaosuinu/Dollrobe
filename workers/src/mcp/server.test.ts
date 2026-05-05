import { env } from "cloudflare:test";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { mcpHandler, mcpMethodNotAllowed } from "./server";
import type { Auth } from "../auth";
import type { Logger } from "../lib/logger";
import type { Env } from "../types";
import {
  createTestGarmentInput,
  createTestLogger,
  getTestDb,
  resetDatabase,
  TEST_USER_ID,
} from "../test/helpers";
import { createApiKeyAuthStub } from "../test/mcp-helpers";
import { createMcpCaller } from "./adapter";

type TestVariables = {
  auth: Auth;
  requestId: string;
  logger: Logger;
};

const buildApp = (auth: Auth) => {
  const app = new Hono<{ Bindings: Env; Variables: TestVariables }>();
  app.use("*", async (c, next) => {
    c.set("requestId", "test-req-id");
    c.set("logger", createTestLogger());
    c.set("auth", auth);
    await next();
  });
  app.post("/api/mcp", mcpHandler);
  app.get("/api/mcp", mcpMethodNotAllowed);
  app.delete("/api/mcp", mcpMethodNotAllowed);
  return app;
};

describe("/api/mcp Hono handler", () => {
  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  it("rejects requests without Bearer token with 401 + JSON-RPC error", async () => {
    const auth = createApiKeyAuthStub(vi.fn());
    const app = buildApp(auth);
    const res = await app.request(
      "/api/mcp",
      { method: "POST", body: JSON.stringify({}) },
      env,
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized" },
      id: null,
    });
  });

  it("rejects API keys without mcp scope with 401", async () => {
    const auth = createApiKeyAuthStub(
      vi.fn().mockResolvedValue({
        valid: true,
        key: { referenceId: "user-1", permissions: {} },
      }),
    );
    const app = buildApp(auth);
    const res = await app.request(
      "/api/mcp",
      {
        method: "POST",
        headers: { Authorization: "Bearer test-key" },
        body: JSON.stringify({}),
      },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("returns 405 with JSON-RPC error for GET requests", async () => {
    const auth = createApiKeyAuthStub(vi.fn());
    const app = buildApp(auth);
    const res = await app.request("/api/mcp", { method: "GET" }, env);
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body).toMatchObject({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed" },
    });
  });

  it("returns 405 for DELETE requests", async () => {
    const auth = createApiKeyAuthStub(vi.fn());
    const app = buildApp(auth);
    const res = await app.request("/api/mcp", { method: "DELETE" }, env);
    expect(res.status).toBe(405);
  });

  it("uses the API key's userId even when a valid session cookie names a different user", async () => {
    // Cross-account regression: a request that carries Authorization (userA's
    // API key) AND a Cookie (userB's session) must run as userA — the holder
    // of the API key whose scope was just verified. Pre-fix, tRPC's
    // resolveAuthenticatedUserId preferred the cookie session.
    const aliceCaller = createMcpCaller({
      env,
      userId: "alice",
      logger: createTestLogger(),
    });
    await aliceCaller.garment.create(
      createTestGarmentInput({ name: "Alice's secret dress" }),
    );

    const verifyApiKey = vi.fn().mockResolvedValue({
      valid: true,
      key: { referenceId: TEST_USER_ID, permissions: { mcp: ["read"] } },
    });
    const getSession = vi.fn().mockResolvedValue({
      user: { id: "alice" },
      session: { id: "alice-session", userId: "alice" },
    });
    const app = buildApp(createApiKeyAuthStub(verifyApiKey, getSession));

    const res = await app.request(
      "/api/mcp",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer test-key",
          Cookie: "better-auth.session_token=alice-forged",
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "list_garments", arguments: {} },
        }),
      },
      env,
    );
    expect(res.status).toBe(200);

    // Implementation-level guarantee: preAuthenticatedUserId short-circuits
    // the auth middleware so getSession is never consulted.
    expect(getSession).not.toHaveBeenCalled();
    expect(verifyApiKey).toHaveBeenCalledTimes(1);

    // Observable guarantee: alice's data must be absent from the response.
    // (TEST_USER_ID has no garments; alice has one named "Alice's secret dress".)
    const body = (await res.json()) as {
      result?: { content?: Array<{ text?: string }> };
    };
    const text = body.result?.content?.[0]?.text ?? "";
    expect(text).not.toContain("Alice's secret dress");
    expect(JSON.parse(text)).toEqual([]);
  });

  it("rejects cookie-only requests with 401 (MCP requires API key, not session)", async () => {
    const verifyApiKey = vi.fn();
    const getSession = vi.fn().mockResolvedValue({
      user: { id: "alice" },
      session: { id: "alice-session", userId: "alice" },
    });
    const app = buildApp(createApiKeyAuthStub(verifyApiKey, getSession));

    const res = await app.request(
      "/api/mcp",
      {
        method: "POST",
        headers: {
          Cookie: "better-auth.session_token=alice-session",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
      env,
    );

    expect(res.status).toBe(401);
    expect(verifyApiKey).not.toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
  });

  it("lists all 7 MCP tools for an authorized read API key", async () => {
    const auth = createApiKeyAuthStub(
      vi.fn().mockResolvedValue({
        valid: true,
        key: {
          referenceId: "user-mcp-list",
          permissions: { mcp: ["read"] },
        },
      }),
    );
    const app = buildApp(auth);
    const res = await app.request(
      "/api/mcp",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "test-client", version: "0.0.1" },
          },
        }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const initBody = await res.json();
    expect(initBody).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: { capabilities: { tools: {} } },
    });
  });
});
