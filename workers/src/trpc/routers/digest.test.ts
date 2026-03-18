import { describe, it, expect, beforeEach } from "vitest";
import { createTestCaller, resetDatabase, getTestDb } from "../../test/helpers";
import { insertGarment, insertDigest } from "../../../test/helpers/factories";
import { MS_PER_DAY } from "@shared/lib/constants";

const db = getTestDb();
const caller = createTestCaller();

beforeEach(async () => {
  await resetDatabase(db);
});

describe("digestRouter", () => {
  describe("generate", () => {
    it("garment がない場合でもダイジェストを生成する", async () => {
      const result = await caller.digest.generate();
      expect(result.unknownCount).toBe(0);
      expect(result.orphanedCount).toBe(0);
      expect(result.totalGarments).toBe(0);
      expect(result.isRead).toBe(false);
    });

    it("unknown ゾーンのアイテムを検出する", async () => {
      const oldTimestamp = Date.now() - MS_PER_DAY * 31;
      await insertGarment({
        db,
        overrides: {
          name: "古い服",
          lastScannedAt: oldTimestamp,
          confidenceDecayDays: 30,
        },
      });
      await insertGarment({
        db,
        overrides: {
          name: "新しい服",
          lastScannedAt: Date.now(),
          confidenceDecayDays: 30,
        },
      });

      const result = await caller.digest.generate();
      expect(result.unknownCount).toBe(1);
      expect(result.unknownItems).toHaveLength(1);
      expect(result.unknownItems[0].garmentName).toBe("古い服");
      expect(result.totalGarments).toBe(2);
    });

    it("孤立チェックアウトを検出する", async () => {
      const fourDaysAgo = Date.now() - MS_PER_DAY * 4;
      await insertGarment({
        db,
        overrides: {
          name: "取り出し中の服",
          status: "checked_out",
          checkedOutAt: fourDaysAgo,
        },
      });

      const result = await caller.digest.generate();
      expect(result.orphanedCount).toBe(1);
      expect(result.orphanedItems).toHaveLength(1);
      expect(result.orphanedItems[0].garmentName).toBe("取り出し中の服");
    });

    it("すべての問題を同時に検出する", async () => {
      const oldTimestamp = Date.now() - MS_PER_DAY * 31;
      const fourDaysAgo = Date.now() - MS_PER_DAY * 4;

      await insertGarment({
        db,
        overrides: {
          name: "古い服",
          lastScannedAt: oldTimestamp,
          confidenceDecayDays: 30,
        },
      });
      await insertGarment({
        db,
        overrides: {
          name: "取り出し中",
          status: "checked_out",
          checkedOutAt: fourDaysAgo,
        },
      });
      await insertGarment({
        db,
        overrides: {
          name: "正常な服",
          lastScannedAt: Date.now(),
          confidenceDecayDays: 30,
        },
      });

      const result = await caller.digest.generate();
      expect(result.unknownCount).toBe(1);
      expect(result.orphanedCount).toBe(1);
      expect(result.totalGarments).toBe(3);
    });
  });

  describe("latest", () => {
    it("ダイジェストがない場合 undefined を返す", async () => {
      const result = await caller.digest.latest();
      expect(result).toBeUndefined();
    });

    it("最新のダイジェストを返す", async () => {
      const now = Date.now();
      await insertDigest({
        db,
        overrides: { generatedAt: now - MS_PER_DAY },
      });
      await insertDigest({
        db,
        overrides: { generatedAt: now, totalGarments: 5 },
      });

      const result = await caller.digest.latest();
      expect(result).toBeDefined();
      expect(result?.totalGarments).toBe(5);
    });
  });

  describe("list", () => {
    it("ダイジェスト一覧を降順で返す", async () => {
      const now = Date.now();
      await insertDigest({
        db,
        overrides: { generatedAt: now - MS_PER_DAY * 2, totalGarments: 1 },
      });
      await insertDigest({
        db,
        overrides: { generatedAt: now - MS_PER_DAY, totalGarments: 2 },
      });
      await insertDigest({
        db,
        overrides: { generatedAt: now, totalGarments: 3 },
      });

      const result = await caller.digest.list({ limit: 10 });
      expect(result).toHaveLength(3);
      expect(result[0].totalGarments).toBe(3);
      expect(result[2].totalGarments).toBe(1);
    });

    it("limit が適用される", async () => {
      const now = Date.now();
      await insertDigest({ db, overrides: { generatedAt: now } });
      await insertDigest({
        db,
        overrides: { generatedAt: now - MS_PER_DAY },
      });
      await insertDigest({
        db,
        overrides: { generatedAt: now - MS_PER_DAY * 2 },
      });

      const result = await caller.digest.list({ limit: 2 });
      expect(result).toHaveLength(2);
    });
  });

  describe("markRead", () => {
    it("ダイジェストを既読にする", async () => {
      const { id } = await insertDigest({ db });

      const result = await caller.digest.markRead({ id });
      expect(result.success).toBe(true);

      const latest = await caller.digest.latest();
      expect(latest?.isRead).toBe(true);
    });

    it("存在しない id で NOT_FOUND エラー", async () => {
      await expect(
        caller.digest.markRead({ id: "nonexistent" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("hasUnread", () => {
    it("未読ダイジェストがない場合 false を返す", async () => {
      const result = await caller.digest.hasUnread();
      expect(result.hasUnread).toBe(false);
    });

    it("未読ダイジェストがある場合 true を返す", async () => {
      await insertDigest({ db, overrides: { isRead: false } });

      const result = await caller.digest.hasUnread();
      expect(result.hasUnread).toBe(true);
    });

    it("既読のみの場合 false を返す", async () => {
      await insertDigest({ db, overrides: { isRead: true } });

      const result = await caller.digest.hasUnread();
      expect(result.hasUnread).toBe(false);
    });
  });

  describe("generate → latest の統合フロー", () => {
    it("generate で作成したダイジェストを latest で取得できる", async () => {
      const oldTimestamp = Date.now() - MS_PER_DAY * 31;
      await insertGarment({
        db,
        overrides: {
          name: "古い服",
          lastScannedAt: oldTimestamp,
          confidenceDecayDays: 30,
        },
      });

      const generated = await caller.digest.generate();
      const latest = await caller.digest.latest();

      expect(latest).toBeDefined();
      expect(latest?.id).toBe(generated.id);
      expect(latest?.unknownCount).toBe(1);
    });
  });
});
