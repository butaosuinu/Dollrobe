import { TRPCError } from "@trpc/server";
import {
  createTestCaller,
  resetDatabase,
  createTestGarmentInput,
  createTestCaseInput,
  getTestDb,
} from "./helpers";

describe("服 CRUD シナリオ", () => {
  const getCaller = () => createTestCaller(getTestDb());

  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  describe("服の作成と取得", () => {
    it("作成した服を get で取得できる", async () => {
      const caller = getCaller();
      const created = await caller.garment.create(createTestGarmentInput());

      const fetched = await caller.garment.get({ id: created.id });

      expect(fetched.id).toBe(created.id);
      expect(fetched.name).toBe("テストドレス");
      expect(fetched.category).toBe("dress");
      expect(fetched.dollSize).toBe("MSD");
      expect(fetched.colors).toEqual(["hsl(0,100%,50%)"]);
      expect(fetched.tags).toEqual(["test"]);
      expect(fetched.confidenceDecayDays).toBe(30);
    });

    it("locationId なしで作成すると status が checked_out になる", async () => {
      const caller = getCaller();
      const created = await caller.garment.create(createTestGarmentInput());

      expect(created.status).toBe("checked_out");
      expect(created.locationId).toBeUndefined();
      expect(created.checkedOutAt).toBeDefined();
    });

    it("locationId 付きで作成すると status が stored になる", async () => {
      const caller = getCaller();
      const caseResult = await caller.location.createCase(
        createTestCaseInput(),
      );
      const caseDetail = await caller.location.getCase(caseResult.id);
      const locationId = caseDetail.locations[0]!.id;

      const created = await caller.garment.create(
        createTestGarmentInput({ locationId }),
      );

      expect(created.status).toBe("stored");
      expect(created.locationId).toBe(locationId);
      expect(created.checkedOutAt).toBeUndefined();
    });
  });

  describe("服の一覧フィルタリング", () => {
    it("category でフィルタリングできる", async () => {
      const caller = getCaller();
      await caller.garment.create(
        createTestGarmentInput({ name: "ドレスA", category: "dress" }),
      );
      await caller.garment.create(
        createTestGarmentInput({ name: "トップスA", category: "tops" }),
      );
      await caller.garment.create(
        createTestGarmentInput({ name: "ドレスB", category: "dress" }),
      );

      const dresses = await caller.garment.list({ category: "dress" });
      expect(dresses).toHaveLength(2);
      expect(dresses.every((g) => g.category === "dress")).toBe(true);

      const tops = await caller.garment.list({ category: "tops" });
      expect(tops).toHaveLength(1);
      expect(tops[0]!.name).toBe("トップスA");
    });

    it("dollSize でフィルタリングできる", async () => {
      const caller = getCaller();
      await caller.garment.create(
        createTestGarmentInput({ name: "MSD服", dollSize: "MSD" }),
      );
      await caller.garment.create(
        createTestGarmentInput({ name: "SD服", dollSize: "SD" }),
      );

      const msdGarments = await caller.garment.list({ dollSize: "MSD" });
      expect(msdGarments).toHaveLength(1);
      expect(msdGarments[0]!.name).toBe("MSD服");
    });

    it("status でフィルタリングできる", async () => {
      const caller = getCaller();
      const caseResult = await caller.location.createCase(
        createTestCaseInput(),
      );
      const caseDetail = await caller.location.getCase(caseResult.id);
      const locationId = caseDetail.locations[0]!.id;

      await caller.garment.create(
        createTestGarmentInput({ name: "収納中", locationId }),
      );
      await caller.garment.create(
        createTestGarmentInput({ name: "取り出し中" }),
      );

      const stored = await caller.garment.list({ status: "stored" });
      expect(stored).toHaveLength(1);
      expect(stored[0]!.name).toBe("収納中");

      const checkedOut = await caller.garment.list({ status: "checked_out" });
      expect(checkedOut).toHaveLength(1);
      expect(checkedOut[0]!.name).toBe("取り出し中");
    });

    it("フィルタなしで全件取得できる", async () => {
      const caller = getCaller();
      await caller.garment.create(createTestGarmentInput({ name: "服1" }));
      await caller.garment.create(createTestGarmentInput({ name: "服2" }));

      const all = await caller.garment.list({});
      expect(all).toHaveLength(2);
    });
  });

  describe("服の更新", () => {
    it("名前とカテゴリを更新できる", async () => {
      const caller = getCaller();
      const created = await caller.garment.create(createTestGarmentInput());

      const updated = await caller.garment.update({
        id: created.id,
        name: "更新後の名前",
        category: "tops",
      });

      expect(updated.name).toBe("更新後の名前");
      expect(updated.category).toBe("tops");
      expect(updated.dollSize).toBe("MSD");

      const fetched = await caller.garment.get({ id: created.id });
      expect(fetched.name).toBe("更新後の名前");
      expect(fetched.category).toBe("tops");
    });

    it("存在しない服を更新すると NOT_FOUND になる", async () => {
      const caller = getCaller();

      const error = await caller.garment
        .update({ id: "nonexistent", name: "test" })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("NOT_FOUND");
    });
  });

  describe("服の削除", () => {
    it("作成した服を削除できる", async () => {
      const caller = getCaller();
      const created = await caller.garment.create(createTestGarmentInput());

      const result = await caller.garment.delete({ id: created.id });
      expect(result.success).toBe(true);

      const error = await caller.garment
        .get({ id: created.id })
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("NOT_FOUND");
    });

    it("存在しない服を削除すると NOT_FOUND になる", async () => {
      const caller = getCaller();

      const error = await caller.garment
        .delete({ id: "nonexistent" })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("NOT_FOUND");
    });
  });

  describe("存在しない服の取得", () => {
    it("NOT_FOUND エラーが返る", async () => {
      const caller = getCaller();

      const error = await caller.garment
        .get({ id: "nonexistent" })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("NOT_FOUND");
    });
  });
});
