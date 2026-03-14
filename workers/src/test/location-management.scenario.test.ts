import {
  createTestCaller,
  resetDatabase,
  createTestGarmentInput,
  createTestCaseInput,
  getTestDb,
  expectTRPCError,
} from "./helpers";

describe("収納場所管理シナリオ", () => {
  const getCaller = () => createTestCaller(getTestDb());

  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  describe("ケース作成と location 自動生成", () => {
    it("3x2 のケースを作成すると 6 個の location が生成される", async () => {
      const caller = getCaller();
      const caseResult = await caller.location.createCase(
        createTestCaseInput({ rows: 3, cols: 2 }),
      );

      const detail = await caller.location.getCase(caseResult.id);

      expect(detail.storageCase.name).toBe("テスト衣装ケース");
      expect(detail.storageCase.rows).toBe(3);
      expect(detail.storageCase.cols).toBe(2);
      expect(detail.locations).toHaveLength(6);

      const labels = detail.locations.map((l) => l.label).sort();
      expect(labels).toEqual(["A-1", "A-2", "B-1", "B-2", "C-1", "C-2"]);
    });

    it("1x1 のケースを作成すると 1 個の location が生成される", async () => {
      const caller = getCaller();
      const caseResult = await caller.location.createCase(
        createTestCaseInput({ rows: 1, cols: 1 }),
      );

      const detail = await caller.location.getCase(caseResult.id);
      expect(detail.locations).toHaveLength(1);
      expect(detail.locations[0]!.label).toBe("A-1");
    });
  });

  describe("ケース一覧", () => {
    it("複数ケースを作成して一覧取得できる", async () => {
      const caller = getCaller();
      await caller.location.createCase(
        createTestCaseInput({ name: "ケースA" }),
      );
      await caller.location.createCase(
        createTestCaseInput({ name: "ケースB" }),
      );

      const result = await caller.location.listCases();
      expect(result.cases).toHaveLength(2);
    });
  });

  describe("ケース名の更新", () => {
    it("ケース名を更新できる", async () => {
      const caller = getCaller();
      const caseResult = await caller.location.createCase(
        createTestCaseInput(),
      );

      await caller.location.updateCase({
        id: caseResult.id,
        name: "更新後ケース名",
      });

      const detail = await caller.location.getCase(caseResult.id);
      expect(detail.storageCase.name).toBe("更新後ケース名");
    });

    it("存在しないケースを更新すると NOT_FOUND になる", async () => {
      const caller = getCaller();

      const error = await caller.location
        .updateCase({ id: "nonexistent", name: "test" })
        .catch((e: unknown) => e);

      expectTRPCError(error, "NOT_FOUND");
    });
  });

  describe("location の手動追加", () => {
    it("既存ケースに location を追加できる", async () => {
      const caller = getCaller();
      const caseResult = await caller.location.createCase(
        createTestCaseInput({ rows: 1, cols: 1 }),
      );

      await caller.location.createLocation({
        caseId: caseResult.id,
        label: "B-1",
        row: 1,
        col: 0,
      });

      const detail = await caller.location.getCase(caseResult.id);
      expect(detail.locations).toHaveLength(2);
    });

    it("同じ row/col の location を作成すると CONFLICT になる", async () => {
      const caller = getCaller();
      const caseResult = await caller.location.createCase(
        createTestCaseInput({ rows: 1, cols: 1 }),
      );

      const error = await caller.location
        .createLocation({
          caseId: caseResult.id,
          label: "A-1-dup",
          row: 0,
          col: 0,
        })
        .catch((e: unknown) => e);

      expectTRPCError(error, "CONFLICT");
    });

    it("存在しないケースに location を作成すると NOT_FOUND になる", async () => {
      const caller = getCaller();

      const error = await caller.location
        .createLocation({
          caseId: "nonexistent",
          label: "A-1",
          row: 0,
          col: 0,
        })
        .catch((e: unknown) => e);

      expectTRPCError(error, "NOT_FOUND");
    });
  });

  describe("ケース削除時の服状態遷移", () => {
    it("ケース内に格納された服が checked_out に遷移する", async () => {
      const caller = getCaller();
      const caseResult = await caller.location.createCase(
        createTestCaseInput(),
      );
      const detail = await caller.location.getCase(caseResult.id);
      const locationId = detail.locations[0]!.id;

      const garment = await caller.garment.create(
        createTestGarmentInput({ locationId }),
      );
      expect(garment.status).toBe("stored");

      await caller.location.deleteCase(caseResult.id);

      const afterDelete = await caller.garment.get({ id: garment.id });
      expect(afterDelete.status).toBe("checked_out");
      expect(afterDelete.locationId).toBeUndefined();
      expect(afterDelete.checkedOutAt).toBeDefined();
    });

    it("存在しないケースの削除は NOT_FOUND になる", async () => {
      const caller = getCaller();

      const error = await caller.location
        .deleteCase("nonexistent")
        .catch((e: unknown) => e);

      expectTRPCError(error, "NOT_FOUND");
    });
  });

  describe("location 削除時の服状態遷移", () => {
    it("location に紐づく服が checked_out に遷移する", async () => {
      const caller = getCaller();
      const caseResult = await caller.location.createCase(
        createTestCaseInput(),
      );
      const detail = await caller.location.getCase(caseResult.id);
      const locationId = detail.locations[0]!.id;

      const garment = await caller.garment.create(
        createTestGarmentInput({ locationId }),
      );

      await caller.location.deleteLocation(locationId);

      const afterDelete = await caller.garment.get({ id: garment.id });
      expect(afterDelete.status).toBe("checked_out");
      expect(afterDelete.locationId).toBeUndefined();
    });

    it("存在しない location の削除は NOT_FOUND になる", async () => {
      const caller = getCaller();

      const error = await caller.location
        .deleteLocation("nonexistent")
        .catch((e: unknown) => e);

      expectTRPCError(error, "NOT_FOUND");
    });
  });
});
