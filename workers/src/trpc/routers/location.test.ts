import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import type { Miniflare } from "miniflare";
import { createTestD1, cleanAllTables } from "../../../test/helpers/d1";
import { createTestCaller } from "../../../test/helpers/trpc-caller";
import {
  insertGarment,
  insertStorageCase,
  insertStorageLocation,
} from "../../../test/helpers/factories";

type TestCaller = ReturnType<typeof createTestCaller>;

const state = {} as {
  db: D1Database;
  mf: Miniflare;
  caller: TestCaller;
};

beforeAll(async () => {
  const { db, mf } = await createTestD1();
  Object.assign(state, { db, mf, caller: createTestCaller({ db }) });
});

afterAll(async () => {
  await state.mf.dispose();
});

beforeEach(async () => {
  await cleanAllTables(state.db);
});

describe("locationRouter", () => {
  describe("listCases", () => {
    it("空の DB で空配列を返す", async () => {
      const result = await state.caller.location.listCases();
      expect(result.cases).toEqual([]);
    });

    it("複数ケースが created_at DESC で返る", async () => {
      await insertStorageCase({
        db: state.db,
        overrides: { name: "古いケース", createdAt: 1000 },
      });
      await insertStorageCase({
        db: state.db,
        overrides: { name: "新しいケース", createdAt: 2000 },
      });

      const result = await state.caller.location.listCases();
      expect(result.cases).toHaveLength(2);
      expect(result.cases[0].name).toBe("新しいケース");
      expect(result.cases[1].name).toBe("古いケース");
    });
  });

  describe("getCase", () => {
    it("ケースと紐づくロケーション一覧を返す", async () => {
      const { id: caseId } = await insertStorageCase({
        db: state.db,
        overrides: { name: "テストケース", rows: 2, cols: 2 },
      });
      await insertStorageLocation({
        db: state.db,
        overrides: { caseId, label: "A-1", row: 0, col: 0 },
      });
      await insertStorageLocation({
        db: state.db,
        overrides: { caseId, label: "A-2", row: 0, col: 1 },
      });

      const result = await state.caller.location.getCase(caseId);
      expect(result.storageCase.name).toBe("テストケース");
      expect(result.locations).toHaveLength(2);
    });

    it("存在しない id で NOT_FOUND エラー", async () => {
      await expect(
        state.caller.location.getCase("nonexistent"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("ロケーションが row_num, col_num でソートされる", async () => {
      const { id: caseId } = await insertStorageCase({ db: state.db });
      await insertStorageLocation({
        db: state.db,
        overrides: { caseId, label: "B-2", row: 1, col: 1 },
      });
      await insertStorageLocation({
        db: state.db,
        overrides: { caseId, label: "A-1", row: 0, col: 0 },
      });
      await insertStorageLocation({
        db: state.db,
        overrides: { caseId, label: "A-2", row: 0, col: 1 },
      });

      const result = await state.caller.location.getCase(caseId);
      expect(result.locations[0].label).toBe("A-1");
      expect(result.locations[1].label).toBe("A-2");
      expect(result.locations[2].label).toBe("B-2");
    });
  });

  describe("createCase", () => {
    it("ケースとロケーションが同時作成される", async () => {
      const result = await state.caller.location.createCase({
        name: "新規ケース",
        rows: 2,
        cols: 3,
      });

      const caseDetail = await state.caller.location.getCase(result.id);
      expect(caseDetail.storageCase.name).toBe("新規ケース");
      expect(caseDetail.storageCase.rows).toBe(2);
      expect(caseDetail.storageCase.cols).toBe(3);
      expect(caseDetail.locations).toHaveLength(6);
    });

    it("ラベルが正しく生成される", async () => {
      const result = await state.caller.location.createCase({
        name: "ラベルテスト",
        rows: 2,
        cols: 2,
      });

      const caseDetail = await state.caller.location.getCase(result.id);
      const labels = caseDetail.locations.map((l) => l.label);
      expect(labels).toContain("A-1");
      expect(labels).toContain("A-2");
      expect(labels).toContain("B-1");
      expect(labels).toContain("B-2");
    });
  });

  describe("updateCase", () => {
    it("ケース名を更新する", async () => {
      const { id } = await insertStorageCase({
        db: state.db,
        overrides: { name: "元の名前" },
      });

      const result = await state.caller.location.updateCase({
        id,
        name: "新しい名前",
      });

      expect(result.id).toBe(id);

      const updated = await state.caller.location.getCase(id);
      expect(updated.storageCase.name).toBe("新しい名前");
    });

    it("存在しない id で NOT_FOUND エラー", async () => {
      await expect(
        state.caller.location.updateCase({
          id: "nonexistent",
          name: "test",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("deleteCase", () => {
    it("ケースとロケーションが削除される", async () => {
      const result = await state.caller.location.createCase({
        name: "削除対象",
        rows: 2,
        cols: 2,
      });

      await state.caller.location.deleteCase(result.id);

      await expect(
        state.caller.location.getCase(result.id),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("紐づく garment が checked_out に遷移する", async () => {
      const { id: caseId } = await insertStorageCase({ db: state.db });
      const { id: locId } = await insertStorageLocation({
        db: state.db,
        overrides: { caseId },
      });
      const { id: garmentId } = await insertGarment({
        db: state.db,
        overrides: { locationId: locId, status: "stored" },
      });

      await state.caller.location.deleteCase(caseId);

      const garment = await state.caller.garment.get({ id: garmentId });
      expect(garment.status).toBe("checked_out");
      expect(garment.locationId).toBeUndefined();
      expect(garment.checkedOutAt).toBeDefined();
    });

    it("存在しない id で NOT_FOUND エラー", async () => {
      await expect(
        state.caller.location.deleteCase("nonexistent"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("createLocation", () => {
    it("既存ケースにロケーションを追加する", async () => {
      const { id: caseId } = await insertStorageCase({ db: state.db });

      const result = await state.caller.location.createLocation({
        caseId,
        label: "C-1",
        row: 2,
        col: 0,
      });

      expect(result.id).toBeDefined();
    });

    it("存在しないケース id で NOT_FOUND エラー", async () => {
      await expect(
        state.caller.location.createLocation({
          caseId: "nonexistent",
          label: "A-1",
          row: 0,
          col: 0,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("同じ row/col の重複で CONFLICT エラー", async () => {
      const { id: caseId } = await insertStorageCase({ db: state.db });
      await insertStorageLocation({
        db: state.db,
        overrides: { caseId, row: 0, col: 0 },
      });

      await expect(
        state.caller.location.createLocation({
          caseId,
          label: "A-1-dup",
          row: 0,
          col: 0,
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });
  });

  describe("deleteLocation", () => {
    it("ロケーションを削除する", async () => {
      const { id: caseId } = await insertStorageCase({ db: state.db });
      const { id: locId } = await insertStorageLocation({
        db: state.db,
        overrides: { caseId },
      });

      const result = await state.caller.location.deleteLocation(locId);
      expect(result.id).toBe(locId);
    });

    it("紐づく garment が checked_out に遷移する", async () => {
      const { id: caseId } = await insertStorageCase({ db: state.db });
      const { id: locId } = await insertStorageLocation({
        db: state.db,
        overrides: { caseId },
      });
      const { id: garmentId } = await insertGarment({
        db: state.db,
        overrides: { locationId: locId, status: "stored" },
      });

      await state.caller.location.deleteLocation(locId);

      const garment = await state.caller.garment.get({ id: garmentId });
      expect(garment.status).toBe("checked_out");
      expect(garment.locationId).toBeUndefined();
      expect(garment.checkedOutAt).toBeDefined();
    });

    it("存在しない id で NOT_FOUND エラー", async () => {
      await expect(
        state.caller.location.deleteLocation("nonexistent"),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
