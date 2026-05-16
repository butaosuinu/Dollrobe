import { describe, expect, it, vi } from "vitest";
import { extractBearerKey, resolveAuthenticatedUserId } from "./auth-resolver";
import type { Auth } from "../auth";

type SessionShape = { readonly user: { readonly id: string } } | null;
type VerifyShape =
  | { readonly valid: true; readonly key?: { readonly referenceId?: string } }
  | { readonly valid: false };

const makeAuth = ({
  session,
  verify,
}: {
  readonly session?: SessionShape | Error;
  readonly verify?: VerifyShape | Error;
}): Auth =>
  ({
    api: {
      getSession: vi.fn(async () =>
        session instanceof Error
          ? await Promise.reject(session)
          : await Promise.resolve(session ?? null),
      ),
      verifyApiKey: vi.fn(async () =>
        verify instanceof Error
          ? await Promise.reject(verify)
          : await Promise.resolve(verify ?? { valid: false }),
      ),
    },
  }) as unknown as Auth;

describe("extractBearerKey", () => {
  it("authorization が無いとき undefined", () => {
    expect(extractBearerKey(new Headers())).toBeUndefined();
  });

  it("Bearer プレフィックス無しは undefined", () => {
    expect(extractBearerKey(new Headers({ authorization: "Basic xxx" }))).toBe(
      undefined,
    );
  });

  it("大文字小文字を吸収して bearer を抽出", () => {
    expect(extractBearerKey(new Headers({ authorization: "BEARER abc" }))).toBe(
      "abc",
    );
  });

  it("Bearer 後が空白だけの場合は undefined", () => {
    expect(extractBearerKey(new Headers({ authorization: "Bearer    " }))).toBe(
      undefined,
    );
  });

  it("正常な Bearer はトリムされて返る", () => {
    expect(
      extractBearerKey(new Headers({ authorization: "Bearer dwk_abc " })),
    ).toBe("dwk_abc");
  });
});

describe("resolveAuthenticatedUserId", () => {
  it("Bearer のみ・cookie 無し→ verifyApiKey 経路で userId を返す", async () => {
    const auth = makeAuth({
      verify: { valid: true, key: { referenceId: "u-1" } },
    });
    const headers = new Headers({ authorization: "Bearer dwk_x" });
    const result = await resolveAuthenticatedUserId({ auth, headers });
    expect(result).toBe("u-1");
  });

  it("Bearer 経路で verifyApiKey が valid:false → undefined", async () => {
    const auth = makeAuth({ verify: { valid: false } });
    const headers = new Headers({ authorization: "Bearer dwk_x" });
    expect(await resolveAuthenticatedUserId({ auth, headers })).toBeUndefined();
  });

  it("Bearer 経路で referenceId が空文字 → undefined", async () => {
    const auth = makeAuth({
      verify: { valid: true, key: { referenceId: "" } },
    });
    const headers = new Headers({ authorization: "Bearer dwk_x" });
    expect(await resolveAuthenticatedUserId({ auth, headers })).toBeUndefined();
  });

  it("Bearer 経路で verifyApiKey が throw → undefined", async () => {
    const auth = makeAuth({ verify: new Error("network") });
    const headers = new Headers({ authorization: "Bearer dwk_x" });
    expect(await resolveAuthenticatedUserId({ auth, headers })).toBeUndefined();
  });

  it("Cookie あり Bearer あり → session 優先", async () => {
    const auth = makeAuth({
      session: { user: { id: "u-cookie" } },
      verify: { valid: true, key: { referenceId: "u-bearer" } },
    });
    const headers = new Headers({
      authorization: "Bearer dwk_x",
      cookie: "session=abc",
    });
    expect(await resolveAuthenticatedUserId({ auth, headers })).toBe(
      "u-cookie",
    );
  });

  it("Cookie あり session が null → Bearer fallback", async () => {
    const auth = makeAuth({
      session: null,
      verify: { valid: true, key: { referenceId: "u-bearer" } },
    });
    const headers = new Headers({
      authorization: "Bearer dwk_x",
      cookie: "session=abc",
    });
    expect(await resolveAuthenticatedUserId({ auth, headers })).toBe(
      "u-bearer",
    );
  });

  it("Cookie あり Bearer 無しで session も無効 → undefined", async () => {
    const auth = makeAuth({ session: null });
    const headers = new Headers({ cookie: "session=abc" });
    expect(await resolveAuthenticatedUserId({ auth, headers })).toBeUndefined();
  });

  it("Cookie あり getSession が throw → undefined にフォールバック", async () => {
    const auth = makeAuth({ session: new Error("oops") });
    const headers = new Headers({ cookie: "session=abc" });
    expect(await resolveAuthenticatedUserId({ auth, headers })).toBeUndefined();
  });

  it("Cookie あり session.user.id が空文字 → undefined", async () => {
    const auth = makeAuth({ session: { user: { id: "" } } });
    const headers = new Headers({ cookie: "session=abc" });
    expect(await resolveAuthenticatedUserId({ auth, headers })).toBeUndefined();
  });
});
