import {
  createTestCaller,
  resetDatabase,
  createTestCoordinateInput,
  createTestGarmentInput,
  getTestDb,
  expectTRPCError,
} from "./helpers";

describe("コーデ CRUD シナリオ", () => {
  const getCaller = () => createTestCaller();

  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  describe("コーデの作成と取得", () => {
    it("作成したコーデを get で取得できる", async () => {
      const caller = getCaller();
      const created = await caller.coordinate.create(
        createTestCoordinateInput(),
      );

      const fetched = await caller.coordinate.get({ id: created.id });

      expect(fetched.id).toBe(created.id);
      expect(fetched.name).toBe("テストコーデ");
      expect(fetched.garmentIds).toEqual([]);
      expect(fetched.isAiGenerated).toBe(false);
      expect(fetched.memo).toBeUndefined();
    });

    it("isAiGenerated: true で作成したコーデがフラグを保持する", async () => {
      const caller = getCaller();
      const created = await caller.coordinate.create(
        createTestCoordinateInput({
          name: "AI 生成コーデ",
          isAiGenerated: true,
        }),
      );

      const fetched = await caller.coordinate.get({ id: created.id });
      expect(fetched.isAiGenerated).toBe(true);

      const listed = await caller.coordinate.list({ isAiGenerated: true });
      expect(listed).toHaveLength(1);
      expect(listed[0]!.isAiGenerated).toBe(true);
    });

    it("服 ID 配列を保持して作成・取得できる", async () => {
      const caller = getCaller();
      const garment1 = await caller.garment.create(
        createTestGarmentInput({ name: "服1" }),
      );
      const garment2 = await caller.garment.create(
        createTestGarmentInput({ name: "服2" }),
      );

      const created = await caller.coordinate.create(
        createTestCoordinateInput({
          name: "2 枚コーデ",
          garmentIds: [garment1.id, garment2.id],
          memo: "春の装い",
        }),
      );

      const fetched = await caller.coordinate.get({ id: created.id });
      expect(fetched.garmentIds).toEqual([garment1.id, garment2.id]);
      expect(fetched.memo).toBe("春の装い");
    });
  });

  describe("コーデの一覧フィルタリング", () => {
    it("フィルタなしで全件取得できる", async () => {
      const caller = getCaller();
      await caller.coordinate.create(createTestCoordinateInput({ name: "A" }));
      await caller.coordinate.create(createTestCoordinateInput({ name: "B" }));

      const all = await caller.coordinate.list({});
      expect(all).toHaveLength(2);
    });

    it("isAiGenerated フィルタで AI 生成コーデだけ取得できる", async () => {
      const caller = getCaller();
      await caller.coordinate.create(
        createTestCoordinateInput({ name: "手動" }),
      );
      await caller.coordinate.create(
        createTestCoordinateInput({ name: "AI-1", isAiGenerated: true }),
      );
      await caller.coordinate.create(
        createTestCoordinateInput({ name: "AI-2", isAiGenerated: true }),
      );

      const aiOnly = await caller.coordinate.list({ isAiGenerated: true });
      expect(aiOnly).toHaveLength(2);
      expect(aiOnly.every((c) => c.isAiGenerated)).toBe(true);

      const manualOnly = await caller.coordinate.list({ isAiGenerated: false });
      expect(manualOnly).toHaveLength(1);
      expect(manualOnly[0]!.name).toBe("手動");
    });
  });

  describe("コーデの更新", () => {
    it("名前と garmentIds と memo を更新できる", async () => {
      const caller = getCaller();
      const garment1 = await caller.garment.create(
        createTestGarmentInput({ name: "服1" }),
      );
      const garment2 = await caller.garment.create(
        createTestGarmentInput({ name: "服2" }),
      );

      const created = await caller.coordinate.create(
        createTestCoordinateInput({
          name: "初期名",
          garmentIds: [garment1.id],
        }),
      );

      const updated = await caller.coordinate.update({
        id: created.id,
        name: "更新後",
        garmentIds: [garment2.id],
        memo: "メモ追加",
      });

      expect(updated.name).toBe("更新後");
      expect(updated.garmentIds).toEqual([garment2.id]);
      expect(updated.memo).toBe("メモ追加");

      const fetched = await caller.coordinate.get({ id: created.id });
      expect(fetched.name).toBe("更新後");
      expect(fetched.garmentIds).toEqual([garment2.id]);
    });

    it("存在しないコーデを更新すると NOT_FOUND になる", async () => {
      const caller = getCaller();

      const error = await caller.coordinate
        .update({ id: "nonexistent", name: "test" })
        .catch((e: unknown) => e);

      expectTRPCError(error, "NOT_FOUND");
    });

    it("garmentIds を省略 (undefined) して update した場合は既存値が維持される", async () => {
      const caller = getCaller();
      const g1 = await caller.garment.create(createTestGarmentInput());
      const created = await caller.coordinate.create(
        createTestCoordinateInput({ garmentIds: [g1.id] }),
      );

      const updated = await caller.coordinate.update({
        id: created.id,
        name: "改名のみ",
      });

      expect(updated.name).toBe("改名のみ");
      expect(updated.garmentIds).toEqual([g1.id]);
    });
  });

  describe("コーデの削除", () => {
    it("作成したコーデを削除できる", async () => {
      const caller = getCaller();
      const created = await caller.coordinate.create(
        createTestCoordinateInput(),
      );

      const result = await caller.coordinate.delete({ id: created.id });
      expect(result.success).toBe(true);

      const error = await caller.coordinate
        .get({ id: created.id })
        .catch((e: unknown) => e);
      expectTRPCError(error, "NOT_FOUND");
    });

    it("存在しないコーデを削除すると NOT_FOUND になる", async () => {
      const caller = getCaller();

      const error = await caller.coordinate
        .delete({ id: "nonexistent" })
        .catch((e: unknown) => e);

      expectTRPCError(error, "NOT_FOUND");
    });
  });

  describe("存在しないコーデの取得", () => {
    it("NOT_FOUND エラーが返る", async () => {
      const caller = getCaller();

      const error = await caller.coordinate
        .get({ id: "nonexistent" })
        .catch((e: unknown) => e);

      expectTRPCError(error, "NOT_FOUND");
    });
  });

  describe("garmentIds の所有権検証", () => {
    it("存在しない garmentId で create すると BAD_REQUEST になる", async () => {
      const caller = getCaller();

      const error = await caller.coordinate
        .create(
          createTestCoordinateInput({
            garmentIds: ["nonexistent-garment-id"],
          }),
        )
        .catch((e: unknown) => e);

      expectTRPCError(error, "BAD_REQUEST");
    });

    it("有効な garmentId と無効な garmentId を混在で create すると BAD_REQUEST になる", async () => {
      const caller = getCaller();
      const garment = await caller.garment.create(
        createTestGarmentInput({ name: "実在する服" }),
      );

      const error = await caller.coordinate
        .create(
          createTestCoordinateInput({
            garmentIds: [garment.id, "nonexistent-garment-id"],
          }),
        )
        .catch((e: unknown) => e);

      expectTRPCError(error, "BAD_REQUEST");
    });

    it("存在しない garmentId で update すると BAD_REQUEST になる", async () => {
      const caller = getCaller();
      const created = await caller.coordinate.create(
        createTestCoordinateInput(),
      );

      const error = await caller.coordinate
        .update({
          id: created.id,
          garmentIds: ["nonexistent-garment-id"],
        })
        .catch((e: unknown) => e);

      expectTRPCError(error, "BAD_REQUEST");
    });
  });
});
