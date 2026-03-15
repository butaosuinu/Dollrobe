import { describe, it, expect, beforeEach } from "vitest";
import { createTestCaller, resetDatabase, getTestDb } from "../../test/helpers";
import {
  insertGarment,
  insertStorageLocation,
  insertStorageCase,
} from "../../../test/helpers/factories";

const db = getTestDb();
const caller = createTestCaller();

beforeEach(async () => {
  await resetDatabase(db);
});

describe("garmentRouter", () => {
  describe("list", () => {
    it("空の DB で空配列を返す", async () => {
      const result = await caller.garment.list({});
      expect(result).toEqual([]);
    });

    it("登録済みの garment を返す", async () => {
      await insertGarment({ db, overrides: { name: "赤いドレス" } });
      await insertGarment({
        db,
        overrides: { name: "青いスカート" },
      });

      const result = await caller.garment.list({});
      expect(result).toHaveLength(2);
    });

    it("category フィルターが動作する", async () => {
      await insertGarment({
        db,
        overrides: { name: "ドレス", category: "dress" },
      });
      await insertGarment({
        db,
        overrides: { name: "トップス", category: "tops" },
      });

      const result = await caller.garment.list({ category: "dress" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("ドレス");
    });

    it("status フィルターが動作する", async () => {
      await insertGarment({
        db,
        overrides: { name: "収納中", status: "stored" },
      });
      await insertGarment({
        db,
        overrides: { name: "取り出し中", status: "checked_out" },
      });

      const result = await caller.garment.list({
        status: "checked_out",
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("取り出し中");
    });

    it("dollSize フィルターが動作する", async () => {
      await insertGarment({
        db,
        overrides: { name: "MSD服", dollSize: "MSD" },
      });
      await insertGarment({
        db,
        overrides: { name: "SD服", dollSize: "SD" },
      });

      const result = await caller.garment.list({ dollSize: "MSD" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("MSD服");
    });

    it("locationId フィルターが動作する", async () => {
      const { id: caseId } = await insertStorageCase({ db });
      const { id: locId } = await insertStorageLocation({
        db,
        overrides: { caseId },
      });

      await insertGarment({
        db,
        overrides: { name: "場所あり", locationId: locId },
      });
      await insertGarment({
        db,
        overrides: { name: "場所なし" },
      });

      const result = await caller.garment.list({ locationId: locId });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("場所あり");
    });
  });

  describe("get", () => {
    it("存在する garment を返す", async () => {
      const { id } = await insertGarment({
        db,
        overrides: {
          name: "テストドレス",
          category: "dress",
          dollSize: "MSD",
          colors: ["red", "blue"],
          tags: ["gothic"],
        },
      });

      const result = await caller.garment.get({ id });
      expect(result.id).toBe(id);
      expect(result.name).toBe("テストドレス");
      expect(result.category).toBe("dress");
      expect(result.dollSize).toBe("MSD");
      expect(result.colors).toEqual(["red", "blue"]);
      expect(result.tags).toEqual(["gothic"]);
    });

    it("存在しない id で NOT_FOUND エラー", async () => {
      await expect(
        caller.garment.get({ id: "nonexistent-id" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("create", () => {
    it("locationId ありの場合 status が stored になる", async () => {
      const { id: caseId } = await insertStorageCase({ db });
      const { id: locId } = await insertStorageLocation({
        db,
        overrides: { caseId },
      });

      const result = await caller.garment.create({
        name: "新しいドレス",
        category: "dress",
        dollSize: "MSD",
        locationId: locId,
      });

      expect(result.status).toBe("stored");
      expect(result.locationId).toBe(locId);
      expect(result.checkedOutAt).toBeUndefined();
    });

    it("locationId なしの場合 status が checked_out になる", async () => {
      const result = await caller.garment.create({
        name: "取り出し中ドレス",
        category: "dress",
        dollSize: "MSD",
      });

      expect(result.status).toBe("checked_out");
      expect(result.locationId).toBeUndefined();
      expect(result.checkedOutAt).toBeDefined();
    });

    it("confidenceDecayDays のデフォルト値は 30", async () => {
      const result = await caller.garment.create({
        name: "デフォルト減衰",
        category: "tops",
        dollSize: "SD",
      });

      expect(result.confidenceDecayDays).toBe(30);
    });

    it("colors と tags が保存される", async () => {
      const result = await caller.garment.create({
        name: "カラフルドレス",
        category: "dress",
        dollSize: "MSD",
        colors: ["hsl(0,100%,50%)", "hsl(120,50%,50%)"],
        tags: ["lolita", "gothic"],
      });

      expect(result.colors).toEqual(["hsl(0,100%,50%)", "hsl(120,50%,50%)"]);
      expect(result.tags).toEqual(["lolita", "gothic"]);
    });

    it("作成した garment を get で取得できる", async () => {
      const created = await caller.garment.create({
        name: "取得テスト",
        category: "bottoms",
        dollSize: "YoSD",
      });

      const fetched = await caller.garment.get({ id: created.id });
      expect(fetched.name).toBe("取得テスト");
      expect(fetched.category).toBe("bottoms");
      expect(fetched.dollSize).toBe("YoSD");
    });
  });

  describe("update", () => {
    it("name を更新する", async () => {
      const { id } = await insertGarment({
        db,
        overrides: { name: "元の名前" },
      });

      const result = await caller.garment.update({
        id,
        name: "新しい名前",
      });

      expect(result.name).toBe("新しい名前");
    });

    it("複数フィールドを同時に更新する", async () => {
      const { id } = await insertGarment({
        db,
        overrides: { name: "元", category: "dress", dollSize: "MSD" },
      });

      const result = await caller.garment.update({
        id,
        name: "更新後",
        category: "tops",
        dollSize: "SD",
      });

      expect(result.name).toBe("更新後");
      expect(result.category).toBe("tops");
      expect(result.dollSize).toBe("SD");
    });

    it("存在しない id で NOT_FOUND エラー", async () => {
      await expect(
        caller.garment.update({ id: "nonexistent", name: "test" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("部分更新で指定しないフィールドは変更されない", async () => {
      const { id } = await insertGarment({
        db,
        overrides: {
          name: "元の名前",
          category: "dress",
          dollSize: "MSD",
          colors: ["red"],
        },
      });

      const result = await caller.garment.update({
        id,
        name: "新しい名前",
      });

      expect(result.name).toBe("新しい名前");
      expect(result.category).toBe("dress");
      expect(result.dollSize).toBe("MSD");
      expect(result.colors).toEqual(["red"]);
    });

    it("updatedAt が更新される", async () => {
      const { id } = await insertGarment({ db });
      const before = await caller.garment.get({ id });

      const result = await caller.garment.update({
        id,
        name: "更新",
      });

      expect(result.updatedAt).toBeGreaterThanOrEqual(before.updatedAt);
    });
  });

  describe("delete", () => {
    it("既存の garment を削除する", async () => {
      const { id } = await insertGarment({ db });

      const result = await caller.garment.delete({ id });
      expect(result.success).toBe(true);
    });

    it("削除後に get で NOT_FOUND になる", async () => {
      const { id } = await insertGarment({ db });
      await caller.garment.delete({ id });

      await expect(caller.garment.get({ id })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("存在しない id で NOT_FOUND エラー", async () => {
      await expect(
        caller.garment.delete({ id: "nonexistent" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
