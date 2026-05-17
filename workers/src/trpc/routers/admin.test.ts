import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCallerFactory } from "../index";
import { appRouter } from "../router";
import {
  createTestLogger,
  insertTestSession,
  insertTestUser,
  resetDatabase,
} from "../../test/helpers";
import {
  insertGarment,
  insertCoordinate,
} from "../../../test/helpers/factories";

const callerFactory = createCallerFactory(appRouter);

const callAsAdmin = (userId = "admin-1") =>
  callerFactory({
    env,
    logger: createTestLogger(),
    preAuthenticatedUserId: userId,
  });

beforeEach(async () => {
  await resetDatabase(env.DB);
});

afterEach(async () => {
  await resetDatabase(env.DB);
});

describe("adminRouter.users", () => {
  it("list は role/frozen フィルタとページングを返す", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
    await insertTestUser({ db: env.DB, id: "user-active", role: "user" });
    await insertTestUser({
      db: env.DB,
      id: "user-frozen",
      role: "user",
      frozen: true,
    });

    const caller = callAsAdmin();
    const all = await caller.admin.users.list({ limit: 50, offset: 0 });
    expect(all.total).toBe(3);

    const frozenOnly = await caller.admin.users.list({
      frozen: true,
      limit: 50,
      offset: 0,
    });
    expect(frozenOnly.total).toBe(1);
    expect(frozenOnly.items[0]?.id).toBe("user-frozen");

    const adminOnly = await caller.admin.users.list({
      role: "admin",
      limit: 50,
      offset: 0,
    });
    expect(adminOnly.total).toBe(1);
  });

  it("detail は user を返し、不在は NOT_FOUND", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
    await insertTestUser({ db: env.DB, id: "user-1", role: "user" });

    const caller = callAsAdmin();
    const user = await caller.admin.users.detail({ id: "user-1" });
    expect(user.id).toBe("user-1");

    await expect(
      caller.admin.users.detail({ id: "ghost" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("freeze は session を消し audit を残す", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
    await insertTestUser({ db: env.DB, id: "user-1", role: "user" });
    await insertTestSession({ db: env.DB, id: "sess-1", userId: "user-1" });

    const caller = callAsAdmin();
    const result = await caller.admin.users.freeze({
      targetUserId: "user-1",
      reason: "spam",
    });
    expect(result.noop).toBe(false);

    const detail = await caller.admin.users.detail({ id: "user-1" });
    expect(detail.frozen).toBe(true);

    const audits = await caller.admin.audits.list({ limit: 10, offset: 0 });
    expect(audits.total).toBe(1);
    expect(audits.items[0]?.action).toBe("user.freeze");
  });

  it("自己 freeze は BAD_REQUEST", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
    const caller = callAsAdmin();
    await expect(
      caller.admin.users.freeze({ targetUserId: "admin-1" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("admin→admin freeze は FORBIDDEN", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
    await insertTestUser({ db: env.DB, id: "admin-2", role: "admin" });
    const caller = callAsAdmin();
    await expect(
      caller.admin.users.freeze({ targetUserId: "admin-2" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("unfreeze で frozen=false に戻る", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
    await insertTestUser({
      db: env.DB,
      id: "user-frozen",
      role: "user",
      frozen: true,
    });

    const caller = callAsAdmin();
    const result = await caller.admin.users.unfreeze({
      targetUserId: "user-frozen",
    });
    expect(result.noop).toBe(false);

    const detail = await caller.admin.users.detail({ id: "user-frozen" });
    expect(detail.frozen).toBe(false);
  });
});

describe("adminRouter.metrics", () => {
  it("summary を返す", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
    await insertTestUser({ db: env.DB, id: "user-1", role: "user" });

    const caller = callAsAdmin();
    const summary = await caller.admin.metrics.summary();
    expect(summary.totalUsers).toBe(2);
  });
});

describe("adminRouter.userDataView", () => {
  it("admin は他ユーザーの garments を read できる", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
    await insertGarment({
      db: env.DB,
      overrides: { name: "他ユーザーの服" },
    });

    const caller = callAsAdmin();
    const result = await caller.admin.userDataView.garments({
      userId: "test-user-001",
      limit: 50,
      offset: 0,
    });
    expect(result.total).toBe(1);
    expect(result.items[0]?.name).toBe("他ユーザーの服");
  });

  it("admin は他ユーザーの coordinates を read できる", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
    await insertCoordinate({
      db: env.DB,
      overrides: { name: "他ユーザーのコーデ" },
    });

    const caller = callAsAdmin();
    const result = await caller.admin.userDataView.coordinates({
      userId: "test-user-001",
      limit: 50,
      offset: 0,
    });
    expect(result.total).toBe(1);
  });

  it("admin は他ユーザーの locations を read できる (空配列)", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
    const caller = callAsAdmin();
    const result = await caller.admin.userDataView.locations({
      userId: "test-user-001",
    });
    expect(result).toEqual([]);
  });

  it("garments の limit/offset が DB レベルで適用される", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
    const totalCount = 5;
    await Promise.all(
      Array.from({ length: totalCount }, async (_, i) => {
        await insertGarment({
          db: env.DB,
          overrides: { name: `garment-${i}` },
        });
      }),
    );

    const caller = callAsAdmin();
    const page1 = await caller.admin.userDataView.garments({
      userId: "test-user-001",
      limit: 2,
      offset: 0,
    });
    expect(page1.total).toBe(totalCount);
    expect(page1.items).toHaveLength(2);

    const page2 = await caller.admin.userDataView.garments({
      userId: "test-user-001",
      limit: 2,
      offset: 2,
    });
    expect(page2.total).toBe(totalCount);
    expect(page2.items).toHaveLength(2);

    const lastPage = await caller.admin.userDataView.garments({
      userId: "test-user-001",
      limit: 2,
      offset: 4,
    });
    expect(lastPage.items).toHaveLength(1);
  });

  it("coordinates の limit/offset が DB レベルで適用される", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
    const totalCount = 4;
    await Promise.all(
      Array.from({ length: totalCount }, async (_, i) => {
        await insertCoordinate({
          db: env.DB,
          overrides: { name: `coord-${i}` },
        });
      }),
    );

    const caller = callAsAdmin();
    const page1 = await caller.admin.userDataView.coordinates({
      userId: "test-user-001",
      limit: 2,
      offset: 0,
    });
    expect(page1.total).toBe(totalCount);
    expect(page1.items).toHaveLength(2);
  });
});

describe("adminRouter ガード", () => {
  it("role=user は FORBIDDEN", async () => {
    await insertTestUser({ db: env.DB, id: "user-1", role: "user" });
    const caller = callerFactory({
      env,
      logger: createTestLogger(),
      preAuthenticatedUserId: "user-1",
    });
    await expect(
      caller.admin.users.list({ limit: 50, offset: 0 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
