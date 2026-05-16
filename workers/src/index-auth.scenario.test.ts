import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { APIError } from "better-auth/api";
import worker from "./index";

type SessionShape = {
  readonly user: { readonly id: string; readonly email: string };
} | null;

// vi.mock は静的に hoist されるため、factory が参照する spy も
// vi.hoisted で同じ位置に巻き上げる必要がある。さもないと
// worker の static import が走った時点で TDZ エラーになる。
const { setPasswordSpy, deleteUserSpy, getSessionSpy } = vi.hoisted(() => ({
  setPasswordSpy: vi.fn(),
  deleteUserSpy: vi.fn(),
  getSessionSpy: vi.fn<(args: { headers: Headers }) => Promise<SessionShape>>(),
}));

vi.mock("./auth", () => ({
  createAuth: () => ({
    handler: async () =>
      await Promise.resolve(new Response("noop", { status: 501 })),
    api: {
      setPassword: setPasswordSpy,
      deleteUser: deleteUserSpy,
      getSession: getSessionSpy,
    },
  }),
}));

const TEST_BASE = "http://test.local";
const noop = (): void => undefined;

const callWorker = async (req: Request): Promise<Response> => {
  const ctx = createExecutionContext();
  const res = await worker.fetch(req, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
};

beforeEach(() => {
  setPasswordSpy.mockReset();
  deleteUserSpy.mockReset();
  getSessionSpy.mockReset();
  vi.spyOn(console, "log").mockImplementation(noop);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("/api/auth/set-password", () => {
  it("newPassword が文字列でない場合は 400 を返す", async () => {
    const res = await callWorker(
      new Request(`${TEST_BASE}/api/auth/set-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword: 123 }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ message: "newPassword required" });
  });

  it("JSON parse 失敗時も 400 を返す", async () => {
    const res = await callWorker(
      new Request(`${TEST_BASE}/api/auth/set-password`, {
        method: "POST",
        body: "{not-json",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("成功時は status: true を返す", async () => {
    setPasswordSpy.mockResolvedValue({ status: true });
    const res = await callWorker(
      new Request(`${TEST_BASE}/api/auth/set-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword: "newpass12" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: true });
  });

  it("better-auth APIError は 400 + message を返す", async () => {
    setPasswordSpy.mockRejectedValueOnce(
      new APIError("BAD_REQUEST", { message: "Already has password" }),
    );
    const res = await callWorker(
      new Request(`${TEST_BASE}/api/auth/set-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword: "newpass12" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Already has password");
  });

  it("APIError message が無い場合は 'Failed' で 400 を返す", async () => {
    setPasswordSpy.mockRejectedValueOnce(new APIError("BAD_REQUEST", {}));
    const res = await callWorker(
      new Request(`${TEST_BASE}/api/auth/set-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword: "newpass12" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("通常の Error は 500 を返す", async () => {
    setPasswordSpy.mockRejectedValueOnce(new Error("boom"));
    const res = await callWorker(
      new Request(`${TEST_BASE}/api/auth/set-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword: "newpass12" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(500);
  });
});

describe("/api/auth/delete-user", () => {
  it("confirmEmail が文字列でない場合は 400 を返す", async () => {
    const res = await callWorker(
      new Request(`${TEST_BASE}/api/auth/delete-user`, {
        method: "POST",
        body: JSON.stringify({ confirmEmail: 1 }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("confirmEmail が空文字の場合も 400 を返す", async () => {
    const res = await callWorker(
      new Request(`${TEST_BASE}/api/auth/delete-user`, {
        method: "POST",
        body: JSON.stringify({ confirmEmail: "   " }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("JSON parse 失敗時にも 400 を返す", async () => {
    const res = await callWorker(
      new Request(`${TEST_BASE}/api/auth/delete-user`, {
        method: "POST",
        body: "{invalid",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("未認証時は 401 を返す", async () => {
    getSessionSpy.mockResolvedValue(null);
    const res = await callWorker(
      new Request(`${TEST_BASE}/api/auth/delete-user`, {
        method: "POST",
        body: JSON.stringify({ confirmEmail: "x@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("session 取得が例外を投げた場合も 401 を返す", async () => {
    getSessionSpy.mockRejectedValue(new Error("boom"));
    const res = await callWorker(
      new Request(`${TEST_BASE}/api/auth/delete-user`, {
        method: "POST",
        body: JSON.stringify({ confirmEmail: "x@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("confirmEmail が session のメールと一致しないと 403", async () => {
    getSessionSpy.mockResolvedValue({
      user: { id: "u-1", email: "user@example.com" },
    });
    const res = await callWorker(
      new Request(`${TEST_BASE}/api/auth/delete-user`, {
        method: "POST",
        body: JSON.stringify({ confirmEmail: "other@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("大文字小文字を吸収して一致と判定する", async () => {
    getSessionSpy.mockResolvedValue({
      user: { id: "u-1", email: "User@Example.com" },
    });
    deleteUserSpy.mockResolvedValue({ status: true });
    const res = await callWorker(
      new Request(`${TEST_BASE}/api/auth/delete-user`, {
        method: "POST",
        body: JSON.stringify({ confirmEmail: "user@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(200);
  });

  it("password 文字列ありで成功", async () => {
    getSessionSpy.mockResolvedValue({
      user: { id: "u-1", email: "user@example.com" },
    });
    deleteUserSpy.mockResolvedValue({ status: true });
    const res = await callWorker(
      new Request(`${TEST_BASE}/api/auth/delete-user`, {
        method: "POST",
        body: JSON.stringify({
          confirmEmail: "user@example.com",
          password: "pass",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(200);
    expect(deleteUserSpy).toHaveBeenCalledWith(
      expect.objectContaining({ body: { password: "pass" } }),
    );
  });

  it("APIError は 400 + メッセージを返す", async () => {
    getSessionSpy.mockResolvedValue({
      user: { id: "u-1", email: "user@example.com" },
    });
    deleteUserSpy.mockRejectedValueOnce(
      new APIError("BAD_REQUEST", { message: "Password required" }),
    );
    const res = await callWorker(
      new Request(`${TEST_BASE}/api/auth/delete-user`, {
        method: "POST",
        body: JSON.stringify({ confirmEmail: "user@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Password required");
  });

  it("APIError message が無い場合 'Failed' で 400 を返す", async () => {
    getSessionSpy.mockResolvedValue({
      user: { id: "u-1", email: "user@example.com" },
    });
    deleteUserSpy.mockRejectedValueOnce(new APIError("BAD_REQUEST", {}));
    const res = await callWorker(
      new Request(`${TEST_BASE}/api/auth/delete-user`, {
        method: "POST",
        body: JSON.stringify({ confirmEmail: "user@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("通常の Error は 500 を返す", async () => {
    getSessionSpy.mockResolvedValue({
      user: { id: "u-1", email: "user@example.com" },
    });
    deleteUserSpy.mockRejectedValueOnce(new Error("boom"));
    const res = await callWorker(
      new Request(`${TEST_BASE}/api/auth/delete-user`, {
        method: "POST",
        body: JSON.stringify({ confirmEmail: "user@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(res.status).toBe(500);
  });
});
