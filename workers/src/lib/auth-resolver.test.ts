import { env } from "cloudflare:test";
import { aroundEach, describe, expect, it, vi } from "vitest";
import { extractBearerKey, resolveAuthenticatedUserId } from "./auth-resolver";
import type { Auth } from "../auth";

type SessionShape = { readonly user: { readonly id: string } } | null;
type VerifyShape =
  | {
      readonly valid: true;
      readonly key?: {
        readonly referenceId?: string;
        readonly permissions?: unknown;
      };
    }
  | { readonly valid: false };

const TEST_USER_IDS = [
  "u-1",
  "u-cookie",
  "u-bearer",
  "u-frozen-session",
  "u-frozen-bearer",
  "u-active-session",
];
const ACTIVE_USER_IDS = ["u-1", "u-cookie", "u-bearer", "u-active-session"];

const validApiKey = ({
  userId,
  actions = ["read"],
}: {
  readonly userId: string;
  readonly actions?: ReadonlyArray<"read" | "write">;
}): VerifyShape => ({
  valid: true,
  key: { referenceId: userId, permissions: { all: actions } },
});

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

aroundEach(async (runTest) => {
  await cleanupUsers();
  await Promise.all(
    ACTIVE_USER_IDS.map(async (id) => {
      await insertUser({ id, frozen: false });
    }),
  );
  await runTest();
  await cleanupUsers();
});

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
      verify: validApiKey({ userId: "u-1" }),
    });
    const headers = new Headers({ authorization: "Bearer dwk_x" });
    const result = await resolveAuthenticatedUserId({
      auth,
      db: env.DB,
      headers,
    });
    expect(result).toBe("u-1");
  });

  it("Bearer 経路で verifyApiKey が valid:false → undefined", async () => {
    const auth = makeAuth({ verify: { valid: false } });
    const headers = new Headers({ authorization: "Bearer dwk_x" });
    expect(
      await resolveAuthenticatedUserId({ auth, db: env.DB, headers }),
    ).toBeUndefined();
  });

  it("Bearer 経路で referenceId が空文字 → undefined", async () => {
    const auth = makeAuth({
      verify: validApiKey({ userId: "" }),
    });
    const headers = new Headers({ authorization: "Bearer dwk_x" });
    expect(
      await resolveAuthenticatedUserId({ auth, db: env.DB, headers }),
    ).toBeUndefined();
  });

  it("Bearer 経路で verifyApiKey が throw → undefined", async () => {
    const auth = makeAuth({ verify: new Error("network") });
    const headers = new Headers({ authorization: "Bearer dwk_x" });
    expect(
      await resolveAuthenticatedUserId({ auth, db: env.DB, headers }),
    ).toBeUndefined();
  });

  it("Cookie あり Bearer あり → session 優先", async () => {
    const auth = makeAuth({
      session: { user: { id: "u-cookie" } },
      verify: validApiKey({ userId: "u-bearer" }),
    });
    const headers = new Headers({
      authorization: "Bearer dwk_x",
      cookie: "session=abc",
    });
    expect(
      await resolveAuthenticatedUserId({ auth, db: env.DB, headers }),
    ).toBe("u-cookie");
  });

  it("Cookie あり session が null → Bearer fallback", async () => {
    const auth = makeAuth({
      session: null,
      verify: validApiKey({ userId: "u-bearer" }),
    });
    const headers = new Headers({
      authorization: "Bearer dwk_x",
      cookie: "session=abc",
    });
    expect(
      await resolveAuthenticatedUserId({ auth, db: env.DB, headers }),
    ).toBe("u-bearer");
  });

  it("Cookie あり Bearer 無しで session も無効 → undefined", async () => {
    const auth = makeAuth({ session: null });
    const headers = new Headers({ cookie: "session=abc" });
    expect(
      await resolveAuthenticatedUserId({ auth, db: env.DB, headers }),
    ).toBeUndefined();
  });

  it("Cookie あり getSession が throw → undefined にフォールバック", async () => {
    const auth = makeAuth({ session: new Error("oops") });
    const headers = new Headers({ cookie: "session=abc" });
    expect(
      await resolveAuthenticatedUserId({ auth, db: env.DB, headers }),
    ).toBeUndefined();
  });

  it("Cookie あり session.user.id が空文字 → undefined", async () => {
    const auth = makeAuth({ session: { user: { id: "" } } });
    const headers = new Headers({ cookie: "session=abc" });
    expect(
      await resolveAuthenticatedUserId({ auth, db: env.DB, headers }),
    ).toBeUndefined();
  });

  it("session 経路で解決した userId が frozen=true なら undefined", async () => {
    await insertUser({ id: "u-frozen-session", frozen: true });
    const auth = makeAuth({ session: { user: { id: "u-frozen-session" } } });
    const headers = new Headers({ cookie: "session=abc" });
    expect(
      await resolveAuthenticatedUserId({ auth, db: env.DB, headers }),
    ).toBeUndefined();
  });

  it("session 経路で解決した userId が frozen=false なら通過する", async () => {
    const auth = makeAuth({ session: { user: { id: "u-active-session" } } });
    const headers = new Headers({ cookie: "session=abc" });
    expect(
      await resolveAuthenticatedUserId({ auth, db: env.DB, headers }),
    ).toBe("u-active-session");
  });

  it("Bearer 経路で解決した userId が frozen=true なら undefined", async () => {
    await insertUser({ id: "u-frozen-bearer", frozen: true });
    const auth = makeAuth({
      verify: validApiKey({ userId: "u-frozen-bearer" }),
    });
    const headers = new Headers({ authorization: "Bearer dwk_x" });
    expect(
      await resolveAuthenticatedUserId({ auth, db: env.DB, headers }),
    ).toBeUndefined();
  });

  it("session が無効で Bearer fallback した userId が frozen=true なら undefined", async () => {
    await insertUser({ id: "u-frozen-bearer", frozen: true });
    const auth = makeAuth({
      session: null,
      verify: validApiKey({ userId: "u-frozen-bearer" }),
    });
    const headers = new Headers({
      authorization: "Bearer dwk_x",
      cookie: "session=abc",
    });
    expect(
      await resolveAuthenticatedUserId({ auth, db: env.DB, headers }),
    ).toBeUndefined();
  });

  it("Bearer の所有ユーザーが存在しない場合は undefined", async () => {
    const auth = makeAuth({
      verify: validApiKey({ userId: "u-deleted" }),
    });
    const headers = new Headers({ authorization: "Bearer dwk_x" });

    expect(
      await resolveAuthenticatedUserId({ auth, db: env.DB, headers }),
    ).toBeUndefined();
  });

  it("read-only Bearer は write scope を要求する経路では undefined", async () => {
    const auth = makeAuth({
      verify: validApiKey({ userId: "u-1" }),
    });
    const headers = new Headers({ authorization: "Bearer dwk_x" });

    expect(
      await resolveAuthenticatedUserId({
        auth,
        db: env.DB,
        headers,
        requiredApiKeyScope: "write",
      }),
    ).toBeUndefined();
  });

  it("read-write Bearer は write scope を要求する経路を通過する", async () => {
    const auth = makeAuth({
      verify: validApiKey({ userId: "u-1", actions: ["read", "write"] }),
    });
    const headers = new Headers({ authorization: "Bearer dwk_x" });

    expect(
      await resolveAuthenticatedUserId({
        auth,
        db: env.DB,
        headers,
        requiredApiKeyScope: "write",
      }),
    ).toBe("u-1");
  });
});
