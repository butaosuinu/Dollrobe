import { describe, it, expect, beforeEach } from "vitest";
import {
  createTestCaller,
  resetDatabase,
  getTestDb,
  expectTRPCError,
} from "../../test/helpers";
import { insertDoll } from "../../../test/helpers/factories";

const db = getTestDb();
const caller = createTestCaller();

beforeEach(async () => {
  await resetDatabase(db);
});

describe("dollRouter", () => {
  describe("list", () => {
    it("空の DB で空配列を返す", async () => {
      const result = await caller.doll.list({});
      expect(result).toEqual([]);
    });

    it("登録済みのドールを返す", async () => {
      await insertDoll({ db, overrides: { name: "リナ" } });
      await insertDoll({ db, overrides: { name: "ミユ", bodySize: "SD" } });
      const result = await caller.doll.list({});
      expect(result).toHaveLength(2);
    });

    it("bodySize フィルターで絞り込む", async () => {
      await insertDoll({ db, overrides: { name: "リナ", bodySize: "MSD" } });
      await insertDoll({ db, overrides: { name: "ミユ", bodySize: "SD" } });
      const result = await caller.doll.list({ bodySize: "SD" });
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("ミユ");
    });
  });

  describe("get", () => {
    it("ドールを取得する", async () => {
      const { id } = await insertDoll({ db, overrides: { name: "リナ" } });
      const result = await caller.doll.get({ id });
      expect(result.name).toBe("リナ");
    });

    it("存在しない id は NOT_FOUND エラーを投げる", async () => {
      const error = await caller.doll
        .get({ id: "ckxx0000000000000000000z" })
        .catch((e: unknown) => e);
      expectTRPCError(error, "NOT_FOUND");
    });
  });

  describe("create", () => {
    it("最低限の入力で作成できる", async () => {
      const result = await caller.doll.create({
        name: "新ドール",
        bodySize: "MSD",
      });
      expect(result.name).toBe("新ドール");
    });

    it("optional フィールドも保存される", async () => {
      const result = await caller.doll.create({
        name: "新ドール",
        bodySize: "MSD",
        headModel: "DDH-01",
        imageUrl: "https://example.com/a.png",
        memo: "メモ",
      });
      expect(result.headModel).toBe("DDH-01");
      expect(result.memo).toBe("メモ");
    });
  });

  describe("update", () => {
    it("name と memo を更新できる", async () => {
      const { id } = await insertDoll({ db, overrides: { name: "before" } });
      const result = await caller.doll.update({
        id,
        name: "after",
        memo: "updated",
      });
      expect(result.name).toBe("after");
      expect(result.memo).toBe("updated");
    });

    it("存在しないドールは NOT_FOUND を投げる", async () => {
      const error = await caller.doll
        .update({ id: "ckxx0000000000000000000z", name: "x" })
        .catch((e: unknown) => e);
      expectTRPCError(error, "NOT_FOUND");
    });
  });

  describe("delete", () => {
    it("登録済みのドールを削除できる", async () => {
      const { id } = await insertDoll({ db });
      const result = await caller.doll.delete({ id });
      expect(result.success).toBe(true);

      const after = await caller.doll.list({});
      expect(after).toHaveLength(0);
    });

    it("存在しない id で削除した場合は NOT_FOUND を返す", async () => {
      const error = await caller.doll
        .delete({ id: "ckxx0000000000000000000z" })
        .catch((e: unknown) => e);
      expectTRPCError(error, "NOT_FOUND");
    });
  });
});
