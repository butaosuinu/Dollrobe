import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDrizzle } from "../db/client";
import { adminAuditLogs, sessions, users } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  createTestLogger,
  insertTestSession,
  insertTestUser,
  resetDatabase,
} from "../test/helpers";
import * as adminService from "./admin-service";

const drizzleDb = createDrizzle(env.DB);
const logger = createTestLogger();

beforeEach(async () => {
  await resetDatabase(env.DB);
});

afterEach(async () => {
  await resetDatabase(env.DB);
});

const seedAdminAndUser = async (): Promise<void> => {
  await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
  await insertTestUser({ db: env.DB, id: "user-1", role: "user" });
};

describe("adminService.freezeUser", () => {
  it("actorUserId === targetUserId なら BAD_REQUEST (自己凍結禁止)", async () => {
    await seedAdminAndUser();

    const result = await adminService.freezeUser({
      drizzleDb,
      actorUserId: "admin-1",
      targetUserId: "admin-1",
      reason: undefined,
      logger,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("BAD_REQUEST");
    }
  });

  it("targetUserId が存在しないと NOT_FOUND", async () => {
    await seedAdminAndUser();

    const result = await adminService.freezeUser({
      drizzleDb,
      actorUserId: "admin-1",
      targetUserId: "ghost",
      reason: undefined,
      logger,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("target.role === admin なら FORBIDDEN (admin→admin 禁止)", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
    await insertTestUser({ db: env.DB, id: "admin-2", role: "admin" });

    const result = await adminService.freezeUser({
      drizzleDb,
      actorUserId: "admin-1",
      targetUserId: "admin-2",
      reason: undefined,
      logger,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("既に frozen=true なら noop で ok を返し audit は書かない", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
    await insertTestUser({
      db: env.DB,
      id: "user-frozen",
      role: "user",
      frozen: true,
    });

    const result = await adminService.freezeUser({
      drizzleDb,
      actorUserId: "admin-1",
      targetUserId: "user-frozen",
      reason: undefined,
      logger,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.noop).toBe(true);
    }

    const audits = await drizzleDb.select().from(adminAuditLogs);
    expect(audits).toEqual([]);
  });

  it("正常系: user を frozen=true に更新し session を消し audit を書く", async () => {
    await seedAdminAndUser();
    await insertTestSession({
      db: env.DB,
      id: "sess-1",
      userId: "user-1",
    });
    await insertTestSession({
      db: env.DB,
      id: "sess-2",
      userId: "user-1",
    });
    // 他ユーザーの session は触らない
    await insertTestUser({ db: env.DB, id: "user-other", role: "user" });
    await insertTestSession({
      db: env.DB,
      id: "sess-other",
      userId: "user-other",
    });

    const result = await adminService.freezeUser({
      drizzleDb,
      actorUserId: "admin-1",
      targetUserId: "user-1",
      reason: "spam",
      logger,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.noop).toBe(false);
    }

    const target = await drizzleDb
      .select()
      .from(users)
      .where(eq(users.id, "user-1"));
    expect(target[0]?.frozen).toBe(true);

    const sessionRows = await drizzleDb
      .select()
      .from(sessions)
      .where(eq(sessions.userId, "user-1"));
    expect(sessionRows).toEqual([]);

    const otherSessions = await drizzleDb
      .select()
      .from(sessions)
      .where(eq(sessions.userId, "user-other"));
    expect(otherSessions).toHaveLength(1);

    const audits = await drizzleDb.select().from(adminAuditLogs);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorUserId: "admin-1",
      action: "user.freeze",
      targetUserId: "user-1",
    });
    expect(audits[0]?.metadata).toContain("spam");
  });
});

describe("adminService.unfreezeUser", () => {
  it("自己 unfreeze は BAD_REQUEST", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });

    const result = await adminService.unfreezeUser({
      drizzleDb,
      actorUserId: "admin-1",
      targetUserId: "admin-1",
      reason: undefined,
      logger,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("BAD_REQUEST");
    }
  });

  it("target 不在は NOT_FOUND", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });

    const result = await adminService.unfreezeUser({
      drizzleDb,
      actorUserId: "admin-1",
      targetUserId: "ghost",
      reason: undefined,
      logger,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("既に frozen=false なら noop", async () => {
    await seedAdminAndUser();

    const result = await adminService.unfreezeUser({
      drizzleDb,
      actorUserId: "admin-1",
      targetUserId: "user-1",
      reason: undefined,
      logger,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.noop).toBe(true);
    }

    const audits = await drizzleDb.select().from(adminAuditLogs);
    expect(audits).toEqual([]);
  });

  it("正常系: frozen=false にして audit 書込", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
    await insertTestUser({
      db: env.DB,
      id: "user-frozen",
      role: "user",
      frozen: true,
    });

    const result = await adminService.unfreezeUser({
      drizzleDb,
      actorUserId: "admin-1",
      targetUserId: "user-frozen",
      reason: "false positive",
      logger,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.noop).toBe(false);
    }

    const target = await drizzleDb
      .select()
      .from(users)
      .where(eq(users.id, "user-frozen"));
    expect(target[0]?.frozen).toBe(false);

    const audits = await drizzleDb.select().from(adminAuditLogs);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorUserId: "admin-1",
      action: "user.unfreeze",
      targetUserId: "user-frozen",
    });
  });
});

describe("adminService.getMetricsSummary", () => {
  it("各テーブルの件数と直近 7 日サインアップを返す", async () => {
    const eightDaysAgoMs = 8 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const past = now - eightDaysAgoMs;

    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
    await insertTestUser({ db: env.DB, id: "user-1", role: "user" });
    await insertTestUser({
      db: env.DB,
      id: "user-frozen",
      role: "user",
      frozen: true,
    });

    // 8 日前のユーザーは直近 7 日サインアップに含まれない
    await env.DB.prepare(
      `UPDATE "user" SET createdAt = ? WHERE id = 'user-frozen'`,
    )
      .bind(past)
      .run();

    const result = await adminService.getMetricsSummary({ drizzleDb, logger });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.totalUsers).toBe(3);
      expect(result.data.frozenUsers).toBe(1);
      expect(result.data.signupsLast7d).toBe(2);
      expect(result.data.totalGarments).toBe(0);
      expect(result.data.totalCoordinates).toBe(0);
      expect(result.data.totalLocations).toBe(0);
    }
  });
});

describe("adminService.listAudits", () => {
  it("frozen 操作の audit 履歴を新しい順で返す", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
    await insertTestUser({ db: env.DB, id: "user-1", role: "user" });
    await insertTestUser({ db: env.DB, id: "user-2", role: "user" });

    await adminService.freezeUser({
      drizzleDb,
      actorUserId: "admin-1",
      targetUserId: "user-1",
      reason: "a",
      logger,
    });
    await adminService.freezeUser({
      drizzleDb,
      actorUserId: "admin-1",
      targetUserId: "user-2",
      reason: "b",
      logger,
    });

    const result = await adminService.listAudits({
      drizzleDb,
      input: { limit: 10, offset: 0 },
      logger,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.total).toBe(2);
      expect(result.data.items).toHaveLength(2);
      expect(result.data.items.every((i) => i.action === "user.freeze")).toBe(
        true,
      );
    }
  });

  it("action フィルターが動作する", async () => {
    await insertTestUser({ db: env.DB, id: "admin-1", role: "admin" });
    await insertTestUser({ db: env.DB, id: "user-1", role: "user" });
    await insertTestUser({
      db: env.DB,
      id: "user-frozen",
      role: "user",
      frozen: true,
    });

    await adminService.freezeUser({
      drizzleDb,
      actorUserId: "admin-1",
      targetUserId: "user-1",
      reason: undefined,
      logger,
    });
    await adminService.unfreezeUser({
      drizzleDb,
      actorUserId: "admin-1",
      targetUserId: "user-frozen",
      reason: undefined,
      logger,
    });

    const result = await adminService.listAudits({
      drizzleDb,
      input: { action: "user.unfreeze", limit: 10, offset: 0 },
      logger,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.total).toBe(1);
      expect(result.data.items[0]?.action).toBe("user.unfreeze");
    }
  });
});
