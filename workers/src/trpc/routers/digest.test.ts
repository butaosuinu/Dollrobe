import { describe, it, expect, beforeEach } from "vitest";
import { createTestCaller, resetDatabase, getTestDb } from "../../test/helpers";
import { insertGarment, insertDigest } from "../../../test/helpers/factories";
import { MS_PER_DAY } from "@shared/lib/constants";

const db = getTestDb();
const caller = createTestCaller();

const insertConfirmedGarment = async (name: string) =>
  await insertGarment({
    db,
    overrides: {
      name,
      lastScannedAt: Date.now(),
      confidenceDecayDays: 30,
      confidenceDecayDaysOverride: 30,
    },
  });

const insertUnknownGarment = async (name: string) =>
  await insertGarment({
    db,
    overrides: {
      name,
      lastScannedAt: Date.now() - MS_PER_DAY * 31,
      confidenceDecayDays: 30,
      confidenceDecayDaysOverride: 30,
    },
  });

const insertUncertainGarment = async (name: string) =>
  await insertGarment({
    db,
    overrides: {
      name,
      lastScannedAt: Date.now() - MS_PER_DAY * 20,
      confidenceDecayDays: 30,
      confidenceDecayDaysOverride: 30,
    },
  });

beforeEach(async () => {
  await resetDatabase(db);
});

describe("digestRouter", () => {
  describe("generate", () => {
    it("stored 件数が 0 ならスキップする", async () => {
      const result = await caller.digest.generate();
      expect(result.skipped).toBe(true);
      expect(result.digest).toBeUndefined();

      const latest = await caller.digest.latest();
      expect(latest).toBeUndefined();
    });

    it("精度 95% 以上ならスキップして latest を更新しない", async () => {
      await insertConfirmedGarment("確定な服1");
      await insertConfirmedGarment("確定な服2");

      const result = await caller.digest.generate();
      expect(result.skipped).toBe(true);
      expect(result.digest).toBeUndefined();

      const latest = await caller.digest.latest();
      expect(latest).toBeUndefined();
    });

    it("精度 95% 未満ならダイジェストを生成する", async () => {
      await insertConfirmedGarment("確定な服");
      await insertUnknownGarment("不明な服1");
      await insertUnknownGarment("不明な服2");

      const result = await caller.digest.generate();
      expect(result.skipped).toBe(false);
      expect(result.digest).toBeDefined();
      expect(result.digest?.confirmedCount).toBe(1);
      expect(result.digest?.unknownCount).toBe(2);
      expect(result.digest?.uncertainCount).toBe(0);
      expect(result.digest?.accuracyScore).toBeCloseTo(1 / 3, 5);
      expect(result.digest?.totalGarments).toBe(3);
    });

    it("confirmed / uncertain / unknown の件数が正しく分類される", async () => {
      await insertConfirmedGarment("確定");
      await insertUncertainGarment("要確認");
      await insertUnknownGarment("不明");

      const result = await caller.digest.generate();
      expect(result.skipped).toBe(false);
      expect(result.digest?.confirmedCount).toBe(1);
      expect(result.digest?.uncertainCount).toBe(1);
      expect(result.digest?.unknownCount).toBe(1);
    });

    it("checked_out / lost の服はゾーン件数に含めない", async () => {
      await insertConfirmedGarment("確定");
      await insertGarment({
        db,
        overrides: {
          name: "取り出し中",
          status: "checked_out",
          checkedOutAt: Date.now() - MS_PER_DAY,
        },
      });
      await insertGarment({
        db,
        overrides: { name: "紛失", status: "lost" },
      });

      const result = await caller.digest.generate();
      expect(result.skipped).toBe(true);
      expect(result.digest).toBeUndefined();
    });

    it("生成されたダイジェストに個別アイテムリストが含まれない", async () => {
      await insertUnknownGarment("古い服1");
      await insertUnknownGarment("古い服2");

      const result = await caller.digest.generate();
      expect(result.digest).toBeDefined();
      if (result.digest === undefined) return;

      expect(result.digest).not.toHaveProperty("unknownItems");
      expect(result.digest).not.toHaveProperty("orphanedItems");
      expect(result.digest).not.toHaveProperty("orphanedCount");
    });

    it("スキップしても recentCheckoutCount はデクリメントされる", async () => {
      const { id: g1 } = await insertGarment({
        db,
        overrides: { name: "確定+活動", recentCheckoutCount: 3 },
      });
      const { id: g2 } = await insertGarment({
        db,
        overrides: { name: "確定+低活動", recentCheckoutCount: 1 },
      });
      const { id: g3 } = await insertGarment({
        db,
        overrides: { name: "確定+非活動", recentCheckoutCount: 0 },
      });

      const result = await caller.digest.generate();
      expect(result.skipped).toBe(true);

      const after1 = await caller.garment.get({ id: g1 });
      const after2 = await caller.garment.get({ id: g2 });
      const after3 = await caller.garment.get({ id: g3 });

      expect(after1.recentCheckoutCount).toBe(2);
      expect(after2.recentCheckoutCount).toBe(0);
      expect(after3.recentCheckoutCount).toBe(0);
    });

    it("生成時にも recentCheckoutCount はデクリメントされる", async () => {
      const { id: g1 } = await insertGarment({
        db,
        overrides: {
          name: "古い+活動",
          lastScannedAt: Date.now() - MS_PER_DAY * 31,
          confidenceDecayDays: 30,
          confidenceDecayDaysOverride: 30,
          recentCheckoutCount: 3,
        },
      });

      const result = await caller.digest.generate();
      expect(result.skipped).toBe(false);

      const after = await caller.garment.get({ id: g1 });
      expect(after.recentCheckoutCount).toBe(2);
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
        overrides: { generatedAt: now - MS_PER_DAY, accuracyScore: 0.5 },
      });
      await insertDigest({
        db,
        overrides: {
          generatedAt: now,
          totalGarments: 5,
          accuracyScore: 0.8,
          confirmedCount: 4,
          unknownCount: 1,
        },
      });

      const result = await caller.digest.latest();
      expect(result).toBeDefined();
      expect(result?.totalGarments).toBe(5);
      expect(result?.accuracyScore).toBeCloseTo(0.8, 5);
      expect(result?.confirmedCount).toBe(4);
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
      await insertUnknownGarment("古い服1");
      await insertUnknownGarment("古い服2");
      await insertUnknownGarment("古い服3");

      const generated = await caller.digest.generate();
      const latest = await caller.digest.latest();

      expect(generated.skipped).toBe(false);
      expect(generated.digest).toBeDefined();
      expect(latest).toBeDefined();
      expect(latest?.id).toBe(generated.digest?.id);
      expect(latest?.unknownCount).toBe(3);
      expect(latest?.accuracyScore).toBeCloseTo(0, 5);
    });
  });
});
