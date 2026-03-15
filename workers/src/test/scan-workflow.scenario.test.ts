import {
  createTestCaller,
  resetDatabase,
  createTestGarmentInput,
  createTestCaseInput,
  getTestDb,
  expectTRPCError,
} from "./helpers";

describe("スキャン操作シナリオ", () => {
  const getCaller = () => createTestCaller();

  beforeEach(async () => {
    await resetDatabase(getTestDb());
  });

  const setupLocationAndGarment = async () => {
    const caller = getCaller();
    const caseResult = await caller.location.createCase(createTestCaseInput());
    const detail = await caller.location.getCase(caseResult.id);
    const locationId = detail.locations[0]!.id;
    const garment = await caller.garment.create(createTestGarmentInput());

    return { caller, locationId, garment, caseId: caseResult.id, detail };
  };

  describe("チェックイン", () => {
    it("checked_out の服をチェックインすると stored に遷移する", async () => {
      const { caller, locationId, garment } = await setupLocationAndGarment();
      expect(garment.status).toBe("checked_out");

      const result = await caller.scan.checkin({
        locationId,
        garmentIds: [garment.id],
      });
      expect(result.success).toBe(true);
      expect(result.checkedInCount).toBe(1);

      const after = await caller.garment.get({ id: garment.id });
      expect(after.status).toBe("stored");
      expect(after.locationId).toBe(locationId);
      expect(after.checkedOutAt).toBeUndefined();
    });

    it("複数服を一括チェックインできる", async () => {
      const caller = getCaller();
      const caseResult = await caller.location.createCase(
        createTestCaseInput(),
      );
      const detail = await caller.location.getCase(caseResult.id);
      const locationId = detail.locations[0]!.id;

      const garment1 = await caller.garment.create(
        createTestGarmentInput({ name: "服1" }),
      );
      const garment2 = await caller.garment.create(
        createTestGarmentInput({ name: "服2" }),
      );
      const garment3 = await caller.garment.create(
        createTestGarmentInput({ name: "服3" }),
      );

      const result = await caller.scan.checkin({
        locationId,
        garmentIds: [garment1.id, garment2.id, garment3.id],
      });
      expect(result.checkedInCount).toBe(3);

      const after1 = await caller.garment.get({ id: garment1.id });
      const after2 = await caller.garment.get({ id: garment2.id });
      const after3 = await caller.garment.get({ id: garment3.id });

      expect(after1.status).toBe("stored");
      expect(after2.status).toBe("stored");
      expect(after3.status).toBe("stored");
    });

    it("存在しない服をチェックインすると NOT_FOUND になる", async () => {
      const { caller, locationId } = await setupLocationAndGarment();

      const error = await caller.scan
        .checkin({ locationId, garmentIds: ["nonexistent"] })
        .catch((e: unknown) => e);

      expectTRPCError(error, "NOT_FOUND");
    });
  });

  describe("チェックアウト", () => {
    it("stored の服をチェックアウトすると checked_out に遷移する", async () => {
      const { caller, locationId, garment } = await setupLocationAndGarment();

      await caller.scan.checkin({
        locationId,
        garmentIds: [garment.id],
      });

      const stored = await caller.garment.get({ id: garment.id });
      expect(stored.status).toBe("stored");

      const result = await caller.scan.checkout({ garmentId: garment.id });
      expect(result.success).toBe(true);

      const after = await caller.garment.get({ id: garment.id });
      expect(after.status).toBe("checked_out");
      expect(after.locationId).toBeUndefined();
      expect(after.checkedOutAt).toBeDefined();
    });

    it("存在しない服をチェックアウトすると NOT_FOUND になる", async () => {
      const caller = getCaller();

      const error = await caller.scan
        .checkout({ garmentId: "nonexistent" })
        .catch((e: unknown) => e);

      expectTRPCError(error, "NOT_FOUND");
    });
  });

  describe("confirmAll", () => {
    it("場所内の全服の lastScannedAt が更新される", async () => {
      const { caller, locationId } = await setupLocationAndGarment();
      const garment1 = await caller.garment.create(
        createTestGarmentInput({ name: "服A" }),
      );
      const garment2 = await caller.garment.create(
        createTestGarmentInput({ name: "服B" }),
      );

      await caller.scan.checkin({
        locationId,
        garmentIds: [garment1.id, garment2.id],
      });

      const before1 = await caller.garment.get({ id: garment1.id });
      const before2 = await caller.garment.get({ id: garment2.id });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await caller.scan.confirmAll({ locationId });
      expect(result.success).toBe(true);
      expect(result.confirmedCount).toBe(2);

      const after1 = await caller.garment.get({ id: garment1.id });
      const after2 = await caller.garment.get({ id: garment2.id });

      expect(after1.lastScannedAt).toBeGreaterThan(before1.lastScannedAt);
      expect(after2.lastScannedAt).toBeGreaterThan(before2.lastScannedAt);
    });

    it("checked_out の服は confirmAll の対象外", async () => {
      const { caller, locationId, garment } = await setupLocationAndGarment();
      const storedGarment = await caller.garment.create(
        createTestGarmentInput({ name: "収納中" }),
      );

      await caller.scan.checkin({
        locationId,
        garmentIds: [storedGarment.id],
      });

      const result = await caller.scan.confirmAll({ locationId });
      expect(result.confirmedCount).toBe(1);

      const checkedOutGarment = await caller.garment.get({ id: garment.id });
      expect(checkedOutGarment.status).toBe("checked_out");
    });
  });

  describe("confirmPartial", () => {
    it("confirmed の服は lastScannedAt 更新、denied の服は checked_out に遷移", async () => {
      const caller = getCaller();
      const caseResult = await caller.location.createCase(
        createTestCaseInput(),
      );
      const detail = await caller.location.getCase(caseResult.id);
      const locationId = detail.locations[0]!.id;

      const garment1 = await caller.garment.create(
        createTestGarmentInput({ name: "確認済み" }),
      );
      const garment2 = await caller.garment.create(
        createTestGarmentInput({ name: "不在" }),
      );

      await caller.scan.checkin({
        locationId,
        garmentIds: [garment1.id, garment2.id],
      });

      const before1 = await caller.garment.get({ id: garment1.id });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await caller.scan.confirmPartial({
        confirmations: [
          { garmentId: garment1.id, confirmed: true },
          { garmentId: garment2.id, confirmed: false },
        ],
      });

      expect(result.confirmedCount).toBe(1);
      expect(result.deniedCount).toBe(1);

      const after1 = await caller.garment.get({ id: garment1.id });
      expect(after1.status).toBe("stored");
      expect(after1.lastScannedAt).toBeGreaterThan(before1.lastScannedAt);

      const after2 = await caller.garment.get({ id: garment2.id });
      expect(after2.status).toBe("checked_out");
      expect(after2.locationId).toBeUndefined();
    });
  });

  describe("orphanResolve", () => {
    const setupOrphan = async () => {
      const { caller, locationId, garment } = await setupLocationAndGarment();

      await caller.scan.checkin({
        locationId,
        garmentIds: [garment.id],
      });
      await caller.scan.checkout({ garmentId: garment.id });

      const checkedOut = await caller.garment.get({ id: garment.id });
      expect(checkedOut.status).toBe("checked_out");

      return { caller, garment: checkedOut, locationId };
    };

    it("stored_back で解決すると stored に遷移する", async () => {
      const { caller, garment, locationId } = await setupOrphan();

      const result = await caller.scan.orphanResolve({
        garmentId: garment.id,
        resolution: "stored_back",
        locationId,
      });
      expect(result.success).toBe(true);

      const after = await caller.garment.get({ id: garment.id });
      expect(after.status).toBe("stored");
      expect(after.locationId).toBe(locationId);
      expect(after.checkedOutAt).toBeUndefined();
    });

    it("still_using で解決すると checkedOutAt が更新される", async () => {
      const { caller, garment } = await setupOrphan();
      const beforeCheckedOutAt = garment.checkedOutAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await caller.scan.orphanResolve({
        garmentId: garment.id,
        resolution: "still_using",
      });
      expect(result.success).toBe(true);

      const after = await caller.garment.get({ id: garment.id });
      expect(after.status).toBe("checked_out");
      expect(after.checkedOutAt).toBeGreaterThan(beforeCheckedOutAt!);
    });

    it("lost で解決すると status が lost になる", async () => {
      const { caller, garment } = await setupOrphan();

      const result = await caller.scan.orphanResolve({
        garmentId: garment.id,
        resolution: "lost",
      });
      expect(result.success).toBe(true);

      const after = await caller.garment.get({ id: garment.id });
      expect(after.status).toBe("lost");
      expect(after.locationId).toBeUndefined();
      expect(after.checkedOutAt).toBeUndefined();
    });

    it("stored 状態の服に orphanResolve すると BAD_REQUEST になる", async () => {
      const { caller, locationId } = await setupLocationAndGarment();
      const storedGarment = await caller.garment.create(
        createTestGarmentInput({ locationId }),
      );

      const error = await caller.scan
        .orphanResolve({
          garmentId: storedGarment.id,
          resolution: "still_using",
        })
        .catch((e: unknown) => e);

      expectTRPCError(error, "BAD_REQUEST");
    });

    it("存在しない服に orphanResolve すると NOT_FOUND になる", async () => {
      const caller = getCaller();

      const error = await caller.scan
        .orphanResolve({
          garmentId: "nonexistent",
          resolution: "lost",
        })
        .catch((e: unknown) => e);

      expectTRPCError(error, "NOT_FOUND");
    });
  });
});
