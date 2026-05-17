import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { isUserFrozen } from "./lib/user-status";

const insertUser = async ({
  id,
  email,
  frozen,
}: {
  readonly id: string;
  readonly email: string;
  readonly frozen: boolean;
}): Promise<void> => {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO "user" (id, name, email, emailVerified, image, role, frozen, createdAt, updatedAt)
     VALUES (?, ?, ?, 0, NULL, 'user', ?, ?, ?)`,
  )
    .bind(id, `Name ${id}`, email, frozen ? 1 : 0, now, now)
    .run();
};

const deleteUser = async (id: string): Promise<void> => {
  await env.DB.prepare(`DELETE FROM "user" WHERE id = ?`).bind(id).run();
};

describe("isUserFrozen", () => {
  beforeEach(async () => {
    await env.DB.prepare(
      `DELETE FROM "user" WHERE id IN ('frozen-1', 'active-1')`,
    ).run();
  });

  it("frozen=true のユーザーは true を返す", async () => {
    await insertUser({
      id: "frozen-1",
      email: "frozen@example.com",
      frozen: true,
    });

    const result = await isUserFrozen({ db: env.DB, userId: "frozen-1" });
    expect(result).toBe(true);

    await deleteUser("frozen-1");
  });

  it("frozen=false のユーザーは false を返す", async () => {
    await insertUser({
      id: "active-1",
      email: "active@example.com",
      frozen: false,
    });

    const result = await isUserFrozen({ db: env.DB, userId: "active-1" });
    expect(result).toBe(false);

    await deleteUser("active-1");
  });

  it("存在しないユーザーは false を返す", async () => {
    const result = await isUserFrozen({
      db: env.DB,
      userId: "no-such-user",
    });
    expect(result).toBe(false);
  });
});
